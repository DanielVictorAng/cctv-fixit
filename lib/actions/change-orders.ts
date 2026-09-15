'use server'

import { z } from 'zod'

import { hasRole, requireSession, type UserRole } from '@/lib/auth'
import { writeAuditLog } from '@/lib/audit'
import {
  lineCosts,
  mergeMaterialLines,
  priceMaterialLines,
  type PricedLine,
} from '@/lib/materials'
import { calculateQuote, type PricingResult } from '@/lib/pricing'
import { createAdminClient, type DBClient } from '@/lib/supabase-client'
import { quoteMaterialLineSchema } from '@/lib/validators'
import type { ActionResult } from '@/lib/action-result'
import type { Json } from '@/lib/types'

const COORD_ROLES: UserRole[] = ['ADMIN', 'COORDINATOR']

/** additional_materials as stored: unit_cost is the catalog cost when requested. */
const storedLinesSchema = z.array(
  quoteMaterialLineSchema.extend({ unit_cost: z.number().nonnegative() })
)

const requestChangeOrderSchema = z.object({
  ticket_id: z.uuid(),
  new_description: z.string().trim().min(1, 'Describe the extra work').max(2000),
  additional_labour: z.number().nonnegative(),
  // Material ids and quantities only; unit costs come from the catalog.
  additional_materials: z.array(quoteMaterialLineSchema).max(50).default([]),
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

  const lines = await priceMaterialLines(
    supabase,
    mergeMaterialLines(parsed.data.additional_materials)
  )
  if (!lines) {
    return { success: false, error: 'A material on this change order is no longer in the catalog.' }
  }

  const { data, error } = await supabase
    .from('change_orders')
    .insert({
      ticket_id: parsed.data.ticket_id,
      requested_by: userId,
      new_description: parsed.data.new_description,
      additional_labour: parsed.data.additional_labour,
      additional_materials: lines as unknown as Json,
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
    newValues: { ...parsed.data, additional_materials: lines },
  })
  return { success: true, data: { id: data.id } }
}

// --- Resolving -------------------------------------------------------------

const resolveSchema = z.object({ id: z.uuid() })

/**
 * Resolve a change order that is still PENDING. Returns its ticket id, or null
 * when it is gone or already resolved — so a double click or two coordinators
 * cannot apply one order twice.
 */
async function resolvePendingOrder(
  supabase: DBClient,
  orderId: string,
  userId: string,
  status: 'APPROVED' | 'REJECTED'
): Promise<string | null> {
  const { data } = await supabase
    .from('change_orders')
    .update({ status, resolved_by: userId, resolved_at: new Date().toISOString() })
    .eq('id', orderId)
    .eq('status', 'PENDING')
    .select('ticket_id')
  return data?.[0]?.ticket_id ?? null
}

/** Put an order back to PENDING when its approval could not be finished. */
async function reopenOrder(supabase: DBClient, orderId: string): Promise<void> {
  await supabase
    .from('change_orders')
    .update({ status: 'PENDING', resolved_by: null, resolved_at: null })
    .eq('id', orderId)
}

/** True while the ticket still has another change order waiting. */
async function hasPendingOrders(supabase: DBClient, ticketId: string): Promise<boolean> {
  const { count } = await supabase
    .from('change_orders')
    .select('id', { count: 'exact', head: true })
    .eq('ticket_id', ticketId)
    .eq('status', 'PENDING')
  return (count ?? 0) > 0
}

async function loadApproval(supabase: DBClient, orderId: string) {
  const { data: order } = await supabase
    .from('change_orders')
    .select('id,status,ticket_id,additional_labour,additional_materials')
    .eq('id', orderId)
    .single()
  if (!order) return { ok: false as const, error: 'Change order not found.' }
  if (order.status !== 'PENDING') {
    return { ok: false as const, error: 'This change order is already resolved.' }
  }

  const { data: ticket } = await supabase
    .from('tickets')
    .select('id,status,final_total,quoted_labour,quoted_materials,change_order_pending')
    .eq('id', order.ticket_id)
    .single()
  if (!ticket) return { ok: false as const, error: 'Ticket not found.' }
  if (ticket.status !== 'IN_PROGRESS') {
    return { ok: false as const, error: 'This job is no longer in progress, so it cannot be changed.' }
  }

  const lines = storedLinesSchema.safeParse(order.additional_materials)
  if (!lines.success) {
    return { ok: false as const, error: 'The materials on this change order could not be read.' }
  }
  return { ok: true as const, order, ticket, lines: lines.data }
}

type TicketTotals = {
  id: string
  final_total: number
  quoted_labour: number
  quoted_materials: number
}

/** Add the approved amounts to the ticket, only if nobody changed its total meanwhile. */
async function addToTicketTotals(supabase: DBClient, ticket: TicketTotals, extra: PricingResult) {
  const next = {
    final_total: Number(ticket.final_total) + extra.final_total,
    quoted_labour: Number(ticket.quoted_labour) + extra.quoted_labour,
    quoted_materials: Number(ticket.quoted_materials) + extra.quoted_materials,
    change_order_pending: await hasPendingOrders(supabase, ticket.id),
  }
  const { data } = await supabase
    .from('tickets')
    .update(next)
    .eq('id', ticket.id)
    .eq('status', 'IN_PROGRESS')
    .eq('final_total', ticket.final_total)
    .select('id')
  return data && data.length > 0 ? next : null
}

/**
 * Add approved materials to the job so the store dispenses them (owner decision,
 * docs/01-schema.md §ticket_materials). A material already on the job is topped
 * up. Coordinators have no UPDATE policy on ticket_materials, so this uses the
 * service role after the caller's role has been checked.
 */
async function addMaterialsToJob(ticketId: string, lines: PricedLine[]): Promise<boolean> {
  if (lines.length === 0) return true
  const admin = createAdminClient()
  const { data: existing, error } = await admin
    .from('ticket_materials')
    .select('material_id,quantity_used')
    .eq('ticket_id', ticketId)
    .in('material_id', lines.map((line) => line.material_id))
  if (error) return false

  const onJob = new Map((existing ?? []).map((row) => [row.material_id, row.quantity_used]))
  for (const line of lines) {
    const current = onJob.get(line.material_id)
    if (current === undefined) {
      const { error: insertError } = await admin
        .from('ticket_materials')
        .insert({ ticket_id: ticketId, material_id: line.material_id, quantity_used: line.quantity })
      if (insertError) return false
    } else {
      const { error: updateError } = await admin
        .from('ticket_materials')
        .update({ quantity_used: current + line.quantity })
        .eq('ticket_id', ticketId)
        .eq('material_id', line.material_id)
      if (updateError) return false
    }
  }
  return true
}

export async function approveChangeOrder(input: { id: string }): Promise<ActionResult> {
  const parsed = resolveSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'Invalid change order.' }

  const auth = await requireSession()
  if (!auth.ok) return { success: false, error: auth.error }
  const { supabase, userId, profile } = auth.session
  if (!hasRole(profile, COORD_ROLES)) return { success: false, error: 'Not allowed.' }

  const approval = await loadApproval(supabase, parsed.data.id)
  if (!approval.ok) return { success: false, error: approval.error }
  const { order, ticket, lines } = approval
  const extra = calculateQuote({
    baseLabour: Number(order.additional_labour),
    materialCosts: lineCosts(lines),
  })

  if (!(await resolvePendingOrder(supabase, order.id, userId, 'APPROVED'))) {
    return { success: false, error: 'This change order is already resolved.' }
  }
  const totals = await addToTicketTotals(supabase, ticket, extra)
  if (!totals) {
    await reopenOrder(supabase, order.id)
    return { success: false, error: 'Someone else just changed this ticket. Refresh and try again.' }
  }

  await writeAuditLog({
    tableName: 'tickets',
    recordId: ticket.id,
    action: 'UPDATE',
    changedBy: userId,
    oldValues: {
      final_total: ticket.final_total,
      quoted_labour: ticket.quoted_labour,
      quoted_materials: ticket.quoted_materials,
      change_order_pending: ticket.change_order_pending,
    },
    newValues: totals,
  })
  await writeAuditLog({
    tableName: 'change_orders',
    recordId: order.id,
    action: 'UPDATE',
    changedBy: userId,
    oldValues: { status: 'PENDING' },
    newValues: { status: 'APPROVED' },
  })

  if (!(await addMaterialsToJob(ticket.id, lines))) {
    console.error('[change-orders] approved but materials were not added', order.id)
    return {
      success: false,
      error: 'Approved, but its materials did not reach the pick-list. Ask an admin to add them.',
    }
  }
  return { success: true }
}

export async function rejectChangeOrder(input: { id: string }): Promise<ActionResult> {
  const parsed = resolveSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'Invalid change order.' }

  const auth = await requireSession()
  if (!auth.ok) return { success: false, error: auth.error }
  const { supabase, userId, profile } = auth.session
  if (!hasRole(profile, COORD_ROLES)) return { success: false, error: 'Not allowed.' }

  const ticketId = await resolvePendingOrder(supabase, parsed.data.id, userId, 'REJECTED')
  if (!ticketId) {
    return { success: false, error: 'This change order was not found or is already resolved.' }
  }

  // Another order may still be waiting on the same ticket.
  const { error } = await supabase
    .from('tickets')
    .update({ change_order_pending: await hasPendingOrders(supabase, ticketId) })
    .eq('id', ticketId)
  if (error) return { success: false, error: 'Could not update the ticket.' }

  await writeAuditLog({
    tableName: 'change_orders',
    recordId: parsed.data.id,
    action: 'UPDATE',
    changedBy: userId,
    oldValues: { status: 'PENDING' },
    newValues: { status: 'REJECTED' },
  })
  return { success: true }
}
