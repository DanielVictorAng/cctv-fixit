'use server'

import { z } from 'zod'

import { hasRole, requireSession, type UserRole } from '@/lib/auth'
import { writeAuditLog } from '@/lib/audit'
import type { ActionResult } from '@/lib/action-result'
import type { DBClient } from '@/lib/supabase-client'

const STORE_ROLES: UserRole[] = ['ADMIN', 'STORE_STAFF']

const dispenseSchema = z.object({ ticket_id: z.uuid() })

export type DispenseInput = z.infer<typeof dispenseSchema>

/** What is still to hand over on a ticket, for the audit trail. */
async function undispensedLines(supabase: DBClient, ticketId: string) {
  const { data } = await supabase
    .from('ticket_materials')
    .select('material_id,quantity_used,dispensed_qty')
    .eq('ticket_id', ticketId)
  return (data ?? [])
    .filter((line) => line.quantity_used > line.dispensed_qty)
    .map((line) => ({
      material_id: line.material_id,
      quantity: line.quantity_used - line.dispensed_qty,
    }))
}

/**
 * [DISPENSED] — hand over everything still to dispense on a ticket's pick-list
 * (docs/02-logic.md §Hardware Store Sync). dispense_ticket_materials() takes the
 * stock and marks the lines as one transaction, so a double tap or a short stock
 * changes nothing (docs/01-schema.md §Functions).
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

  const ticketId = parsed.data.ticket_id
  const pending = await undispensedLines(supabase, ticketId)
  const { data: dispensed, error } = await supabase.rpc('dispense_ticket_materials', {
    p_ticket_id: ticketId,
  })
  if (error) {
    // The function names the material, e.g. "Not enough stock for PVC elbow".
    if (error.hint === 'insufficient_stock') {
      return { success: false, error: `${error.message}. Nothing was taken — tell the coordinator.` }
    }
    return { success: false, error: 'Could not update the stock. Please try again.' }
  }
  if (!dispensed) return { success: false, error: 'This pick-list is already dispensed.' }

  await writeAuditLog({
    tableName: 'ticket_materials',
    recordId: ticketId,
    action: 'UPDATE',
    changedBy: userId,
    newValues: { dispensed: pending },
  })
  return { success: true, data: { dispensed } }
}
