'use server'

import { z } from 'zod'

import { hasRole, requireSession, type UserRole } from '@/lib/auth'
import { writeAuditLog } from '@/lib/audit'
import type { ActionResult } from '@/lib/action-result'
import type { Json } from '@/lib/types'

const STORE_ROLES: UserRole[] = ['ADMIN', 'STORE_STAFF']

const dispenseSchema = z.object({ ticket_id: z.uuid() })

export type DispenseInput = z.infer<typeof dispenseSchema>

/**
 * [DISPENSED] — decrement stock for every un-dispensed line on a ticket and
 * mark those lines dispensed. docs/02-logic.md §Hardware Store Sync.
 */
export async function dispenseTicketMaterials(
  input: DispenseInput
): Promise<ActionResult<{ dispensed: number }>> {
  const parsed = dispenseSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'Invalid ticket.' }

  const auth = await requireSession()
  if (!auth.ok) return { success: false, error: auth.error }
  const { supabase, userId, profile } = auth.session
  if (!hasRole(profile, STORE_ROLES)) {
    return { success: false, error: 'Only store staff can dispense materials.' }
  }

  const { data: lineRows } = await supabase
    .from('ticket_materials')
    .select('ticket_id,material_id,quantity_used,dispensed_at')
    .eq('ticket_id', parsed.data.ticket_id)

  const pending = (lineRows ?? []).filter((line) => line.dispensed_at === null)
  if (pending.length === 0) {
    return { success: false, error: 'This pick-list is already dispensed.' }
  }

  const materialIds = pending.map((line) => line.material_id)
  const { data: materialRows } = await supabase
    .from('materials')
    .select('id,stock_qty')
    .in('id', materialIds)
  const stockById = new Map((materialRows ?? []).map((m) => [m.id, m.stock_qty]))

  const insufficient = pending.filter(
    (line) => (stockById.get(line.material_id) ?? 0) < line.quantity_used
  )
  if (insufficient.length > 0) {
    return {
      success: false,
      error: `Insufficient stock for ${insufficient.length} item(s) — coordinator notified.`,
    }
  }

  const now = new Date().toISOString()
  for (const line of pending) {
    const current = stockById.get(line.material_id) ?? 0
    const { error: stockError } = await supabase
      .from('materials')
      .update({ stock_qty: current - line.quantity_used })
      .eq('id', line.material_id)
    if (stockError) return { success: false, error: 'Could not update stock.' }

    const { error: lineError } = await supabase
      .from('ticket_materials')
      .update({ dispensed_at: now, dispensed_by: userId })
      .eq('ticket_id', line.ticket_id)
      .eq('material_id', line.material_id)
    if (lineError) return { success: false, error: 'Could not mark the pick-list dispensed.' }
  }

  await writeAuditLog({
    tableName: 'ticket_materials',
    recordId: parsed.data.ticket_id,
    action: 'UPDATE',
    changedBy: userId,
    newValues: {
      dispensed: pending.map((line) => ({
        material_id: line.material_id,
        quantity: line.quantity_used,
      })),
    } as unknown as Json,
  })

  return { success: true, data: { dispensed: pending.length } }
}
