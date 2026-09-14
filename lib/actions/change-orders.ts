'use server'

import { z } from 'zod'

import { hasRole, requireSession, type UserRole } from '@/lib/auth'
import { writeAuditLog } from '@/lib/audit'
import { calculateQuote } from '@/lib/pricing'
import type { ActionResult } from '@/lib/action-result'
import type { Json } from '@/lib/types'

const COORD_ROLES: UserRole[] = ['ADMIN', 'COORDINATOR']

const materialLineSchema = z.object({
  material_id: z.uuid(),
  quantity: z.number().int().positive(),
  unit_cost: z.number().nonnegative(),
})

const requestChangeOrderSchema = z.object({
  ticket_id: z.uuid(),
  new_description: z.string().trim().min(1, 'Describe the extra work').max(2000),
  additional_labour: z.number().nonnegative(),
  additional_materials: z.array(materialLineSchema).default([]),
})

export type RequestChangeOrderInput = z.infer<typeof requestChangeOrderSchema>

export async function requestChangeOrder(
  input: RequestChangeOrderInput
): Promise<ActionResult<{ id: string }>> {
  const parsed = requestChangeOrderSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'Please check the change order.' }

  const auth = await requireSession()
  if (!auth.ok) return { success: false, error: auth.error }
  const { supabase, userId, profile } = auth.session

  const { data: ticket } = await supabase
    .from('tickets')
    .select('id,status,assigned_tech_id')
    .eq('id', parsed.data.ticket_id)
    .single()
  if (!ticket) return { success: false, error: 'Ticket not found.' }

  const isAssignedTech = profile.role === 'TECHNICIAN' && ticket.assigned_tech_id === userId
  if (!isAssignedTech && !hasRole(profile, COORD_ROLES)) {
    return { success: false, error: 'You cannot raise a change order for this ticket.' }
  }
  if (ticket.status !== 'IN_PROGRESS') {
    return { success: false, error: 'Change orders can only be raised while a job is in progress.' }
  }

  const { data, error } = await supabase
    .from('change_orders')
    .insert({
      ticket_id: parsed.data.ticket_id,
      requested_by: userId,
      new_description: parsed.data.new_description,
      additional_labour: parsed.data.additional_labour,
      additional_materials: parsed.data.additional_materials as unknown as Json,
    })
    .select('id')
    .single()
  if (error || !data) return { success: false, error: 'Could not submit the change order.' }

  const { error: flagError } = await supabase
    .from('tickets')
    .update({ change_order_pending: true })
    .eq('id', parsed.data.ticket_id)
  if (flagError) {
    return { success: false, error: 'Change order saved but the ticket was not flagged.' }
  }

  await writeAuditLog({
    tableName: 'change_orders',
    recordId: data.id,
    action: 'INSERT',
    changedBy: userId,
    newValues: parsed.data,
  })
  return { success: true, data: { id: data.id } }
}

const resolveSchema = z.object({ id: z.uuid() })

export async function approveChangeOrder(input: { id: string }): Promise<ActionResult> {
  const parsed = resolveSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'Invalid change order.' }

  const auth = await requireSession()
  if (!auth.ok) return { success: false, error: auth.error }
  const { supabase, userId, profile } = auth.session
  if (!hasRole(profile, COORD_ROLES)) return { success: false, error: 'Not allowed.' }

  const { data: order } = await supabase
    .from('change_orders')
    .select('id,ticket_id,status,additional_labour,additional_materials')
    .eq('id', parsed.data.id)
    .single()
  if (!order) return { success: false, error: 'Change order not found.' }
  if (order.status !== 'PENDING') {
    return { success: false, error: 'This change order is already resolved.' }
  }

  const lines = z.array(materialLineSchema).safeParse(order.additional_materials)
  const materialCosts = lines.success
    ? lines.data.map((line) => line.unit_cost * line.quantity)
    : []
  const additional = calculateQuote({
    baseLabour: Number(order.additional_labour),
    materialCosts,
  }).final_total

  const { data: ticket } = await supabase
    .from('tickets')
    .select('id,final_total')
    .eq('id', order.ticket_id)
    .single()
  if (!ticket) return { success: false, error: 'Ticket not found.' }

  const newTotal = Math.round(Number(ticket.final_total) + additional)
  const { error: ticketError } = await supabase
    .from('tickets')
    .update({ final_total: newTotal, change_order_pending: false })
    .eq('id', order.ticket_id)
  if (ticketError) return { success: false, error: 'Could not update the ticket total.' }

  const { error } = await supabase
    .from('change_orders')
    .update({ status: 'APPROVED', resolved_by: userId, resolved_at: new Date().toISOString() })
    .eq('id', order.id)
  if (error) return { success: false, error: 'Could not update the change order.' }

  await writeAuditLog({
    tableName: 'change_orders',
    recordId: order.id,
    action: 'UPDATE',
    changedBy: userId,
    newValues: { status: 'APPROVED', final_total: newTotal },
  })
  return { success: true }
}

export async function rejectChangeOrder(input: { id: string }): Promise<ActionResult> {
  const parsed = resolveSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'Invalid change order.' }

  const auth = await requireSession()
  if (!auth.ok) return { success: false, error: auth.error }
  const { supabase, userId, profile } = auth.session
  if (!hasRole(profile, COORD_ROLES)) return { success: false, error: 'Not allowed.' }

  const { data: order } = await supabase
    .from('change_orders')
    .select('id,ticket_id,status')
    .eq('id', parsed.data.id)
    .single()
  if (!order) return { success: false, error: 'Change order not found.' }
  if (order.status !== 'PENDING') {
    return { success: false, error: 'This change order is already resolved.' }
  }

  const { error } = await supabase
    .from('change_orders')
    .update({ status: 'REJECTED', resolved_by: userId, resolved_at: new Date().toISOString() })
    .eq('id', order.id)
  if (error) return { success: false, error: 'Could not update the change order.' }

  const { error: ticketError } = await supabase
    .from('tickets')
    .update({ change_order_pending: false })
    .eq('id', order.ticket_id)
  if (ticketError) return { success: false, error: 'Could not update the ticket.' }

  await writeAuditLog({
    tableName: 'change_orders',
    recordId: order.id,
    action: 'UPDATE',
    changedBy: userId,
    newValues: { status: 'REJECTED' },
  })
  return { success: true }
}
