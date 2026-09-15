'use server'

import { hasRole, requireSession, type RequiredSession, type UserRole } from '@/lib/auth'
import { writeAuditLog } from '@/lib/audit'
import { isJobPhotoPath } from '@/lib/job-photos'
import { lineCosts, mergeMaterialLines, priceMaterialLines } from '@/lib/materials'
import { calculateQuote } from '@/lib/pricing'
import { createAdminClient } from '@/lib/supabase-client'
import { assertTransition, type TicketStatus } from '@/lib/ticket-state'
import type { ActionResult } from '@/lib/action-result'
import type { Database } from '@/lib/types'
import {
  cancelTicketSchema,
  completeTicketSchema,
  confirmPaymentSchema,
  dispatchTicketSchema,
  quoteTicketSchema,
  scheduleTicketSchema,
  ticketCreateSchema,
  ticketIdSchema,
  ticketRefSchema,
  ticketUpdateSchema,
  type CancelTicketInput,
  type CompleteTicketInput,
  type ConfirmPaymentInput,
  type DispatchTicketInput,
  type QuoteTicketInput,
  type ScheduleTicketInput,
  type TicketCreateInput,
  type TicketUpdateInput,
} from '@/lib/validators'

type TicketRow = Database['public']['Tables']['tickets']['Row']
type TicketUpdate = Database['public']['Tables']['tickets']['Update']
type MaterialLine = QuoteTicketInput['materials'][number]

const WRITE_ROLES: UserRole[] = ['ADMIN', 'COORDINATOR']
const TECH_TRANSITIONS: TicketStatus[] = ['IN_PROGRESS', 'COMPLETED']
const FEE_STATUSES: TicketStatus[] = ['DISPATCHED', 'IN_PROGRESS', 'COMPLETED', 'PAID']
const CANCELLATION_FEE = 200

async function loadTicket(
  supabase: RequiredSession['supabase'],
  id: string
): Promise<TicketRow | null> {
  const { data } = await supabase.from('tickets').select('*').eq('id', id).single()
  return data ?? null
}

type TransitionCheck = { ok: true; before: TicketRow } | { ok: false; error: string }

/** Load the ticket and confirm both the move and the caller (docs/02-logic.md §Ticket State Machine). */
async function checkTransition(
  session: RequiredSession,
  ticketId: string,
  to: TicketStatus
): Promise<TransitionCheck> {
  const before = await loadTicket(session.supabase, ticketId)
  if (!before) return { ok: false, error: 'Ticket not found.' }

  try {
    assertTransition(before.status, to, session.profile.role)
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Invalid transition.' }
  }

  if (TECH_TRANSITIONS.includes(to) && before.assigned_tech_id !== session.userId) {
    return { ok: false, error: 'You are not assigned to this ticket.' }
  }
  return { ok: true, before }
}

/**
 * Shared state-machine transition: validates the move + role, applies the
 * patch, and writes an audit row (docs/02-logic.md §Ticket State Machine).
 * The update only lands while the status is still the one that was validated,
 * so two people moving the same ticket at once cannot both succeed.
 */
async function applyTransition(
  session: RequiredSession,
  ticketId: string,
  to: TicketStatus,
  changes: TicketUpdate | ((before: TicketRow) => TicketUpdate),
  auditExtra?: Record<string, unknown>
): Promise<ActionResult> {
  const check = await checkTransition(session, ticketId, to)
  if (!check.ok) return { success: false, error: check.error }
  const { before } = check

  const patch = typeof changes === 'function' ? changes(before) : changes
  const { data: updated, error } = await session.supabase
    .from('tickets')
    .update({ ...patch, status: to })
    .eq('id', ticketId)
    .eq('status', before.status)
    .select('id')
  if (error) return { success: false, error: 'Could not update the ticket.' }
  if (!updated || updated.length === 0) {
    return { success: false, error: 'Someone else just changed this ticket. Refresh and try again.' }
  }

  await writeAuditLog({
    tableName: 'tickets',
    recordId: ticketId,
    action: 'UPDATE',
    changedBy: session.userId,
    oldValues: before,
    newValues: { ...patch, status: to, ...auditExtra },
  })
  return { success: true }
}

// --- CRUD ---------------------------------------------------------------

export async function createTicket(
  input: TicketCreateInput
): Promise<ActionResult<{ id: string }>> {
  const parsed = ticketCreateSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'Please check the ticket details.' }

  const auth = await requireSession()
  if (!auth.ok) return { success: false, error: auth.error }
  const { supabase, userId, profile } = auth.session
  if (!hasRole(profile, WRITE_ROLES)) {
    return { success: false, error: 'You do not have permission to do that.' }
  }

  const { data, error } = await supabase
    .from('tickets')
    .insert({ ...parsed.data, status: 'NEW' })
    .select('id')
    .single()
  if (error || !data) return { success: false, error: 'Could not create the ticket.' }

  await writeAuditLog({
    tableName: 'tickets',
    recordId: data.id,
    action: 'INSERT',
    changedBy: userId,
    newValues: parsed.data,
  })
  return { success: true, data: { id: data.id } }
}

export async function updateTicket(input: TicketUpdateInput): Promise<ActionResult> {
  const parsed = ticketUpdateSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'Please check the ticket details.' }

  const auth = await requireSession()
  if (!auth.ok) return { success: false, error: auth.error }
  const { supabase, userId, profile } = auth.session
  if (!hasRole(profile, WRITE_ROLES)) {
    return { success: false, error: 'You do not have permission to do that.' }
  }

  const { id, ...changes } = parsed.data
  const before = await loadTicket(supabase, id)
  if (!before) return { success: false, error: 'Ticket not found.' }

  const { error } = await supabase.from('tickets').update(changes).eq('id', id)
  if (error) return { success: false, error: 'Could not update the ticket.' }

  await writeAuditLog({
    tableName: 'tickets',
    recordId: id,
    action: 'UPDATE',
    changedBy: userId,
    oldValues: before,
    newValues: changes,
  })
  return { success: true }
}

export async function deleteTicket(input: { id: string }): Promise<ActionResult> {
  const parsed = ticketIdSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'Invalid ticket.' }

  const auth = await requireSession()
  if (!auth.ok) return { success: false, error: auth.error }
  const { supabase, userId, profile } = auth.session
  if (!hasRole(profile, WRITE_ROLES)) {
    return { success: false, error: 'You do not have permission to do that.' }
  }

  const { id } = parsed.data
  const before = await loadTicket(supabase, id)
  if (!before) return { success: false, error: 'Ticket not found.' }

  const { error } = await supabase.from('tickets').delete().eq('id', id)
  if (error) return { success: false, error: 'Could not delete the ticket.' }

  await writeAuditLog({
    tableName: 'tickets',
    recordId: id,
    action: 'DELETE',
    changedBy: userId,
    oldValues: before,
  })
  return { success: true }
}

// --- Quote materials -----------------------------------------------------

/** Save the quoted materials — the store's pick-list is built from these rows. */
async function attachMaterials(
  supabase: RequiredSession['supabase'],
  ticketId: string,
  lines: MaterialLine[]
): Promise<boolean> {
  if (lines.length === 0) return true
  const { error } = await supabase.from('ticket_materials').insert(
    lines.map((line) => ({
      ticket_id: ticketId,
      material_id: line.material_id,
      quantity_used: line.quantity,
    }))
  )
  return !error
}

/**
 * Undo attachMaterials when the transition itself fails. Coordinators have no
 * DELETE policy on ticket_materials, so this one clean-up uses the service role.
 */
async function detachMaterials(ticketId: string, lines: MaterialLine[]): Promise<void> {
  if (lines.length === 0) return
  const admin = createAdminClient()
  await admin
    .from('ticket_materials')
    .delete()
    .eq('ticket_id', ticketId)
    .in('material_id', lines.map((line) => line.material_id))
}

// --- State machine transitions -----------------------------------------

export async function quoteTicket(input: QuoteTicketInput): Promise<ActionResult> {
  const parsed = quoteTicketSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'Please check the quote.' }
  const { ticket_id, base_labour, surcharges } = parsed.data
  if (base_labour <= 0) return { success: false, error: 'Quoted labour must be greater than zero.' }

  const auth = await requireSession()
  if (!auth.ok) return { success: false, error: auth.error }
  const check = await checkTransition(auth.session, ticket_id, 'QUOTED')
  if (!check.ok) return { success: false, error: check.error }

  const lines = await priceMaterialLines(
    auth.session.supabase,
    mergeMaterialLines(parsed.data.materials)
  )
  if (!lines) return { success: false, error: 'A material on this quote is no longer in the catalog.' }
  if (!(await attachMaterials(auth.session.supabase, ticket_id, lines))) {
    return { success: false, error: 'Could not save the materials on this quote.' }
  }

  const pricing = calculateQuote({
    baseLabour: base_labour,
    materialCosts: lineCosts(lines),
    surcharges,
  })
  const result = await applyTransition(auth.session, ticket_id, 'QUOTED', { ...pricing })
  if (!result.success) {
    await detachMaterials(ticket_id, lines)
    return result
  }

  if (lines.length > 0) {
    await writeAuditLog({
      tableName: 'ticket_materials',
      recordId: ticket_id,
      action: 'INSERT',
      changedBy: auth.session.userId,
      newValues: { materials: lines },
    })
  }
  return result
}

export async function scheduleTicket(input: ScheduleTicketInput): Promise<ActionResult> {
  const parsed = scheduleTicketSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'Please check the schedule.' }

  const auth = await requireSession()
  if (!auth.ok) return { success: false, error: auth.error }

  return applyTransition(auth.session, parsed.data.ticket_id, 'SCHEDULED', {
    scheduled_start: parsed.data.scheduled_start,
    scheduled_end: parsed.data.scheduled_end ?? null,
  })
}

export async function dispatchTicket(input: DispatchTicketInput): Promise<ActionResult> {
  const parsed = dispatchTicketSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'Please choose a technician.' }

  const auth = await requireSession()
  if (!auth.ok) return { success: false, error: auth.error }

  return applyTransition(auth.session, parsed.data.ticket_id, 'DISPATCHED', {
    assigned_tech_id: parsed.data.assigned_tech_id,
  })
}

export async function startTicket(input: { ticket_id: string }): Promise<ActionResult> {
  const parsed = ticketRefSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'Invalid ticket.' }

  const auth = await requireSession()
  if (!auth.ok) return { success: false, error: auth.error }

  return applyTransition(auth.session, parsed.data.ticket_id, 'IN_PROGRESS', {})
}

export async function completeTicket(input: CompleteTicketInput): Promise<ActionResult> {
  const parsed = completeTicketSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'Invalid ticket.' }

  const auth = await requireSession()
  if (!auth.ok) return { success: false, error: auth.error }
  const { ticket_id } = parsed.data

  const check = await checkTransition(auth.session, ticket_id, 'COMPLETED')
  if (!check.ok) return { success: false, error: check.error }

  // docs/02-logic.md: a photo of the work is required. Labour-only jobs may
  // complete without materials (owner decision).
  if (!check.before.photo_urls.some((path) => isJobPhotoPath(ticket_id, path))) {
    return { success: false, error: 'Add at least one photo of the finished job first.' }
  }

  return applyTransition(auth.session, ticket_id, 'COMPLETED', {
    completed_at: new Date().toISOString(),
  })
}

export async function confirmPayment(input: ConfirmPaymentInput): Promise<ActionResult> {
  const parsed = confirmPaymentSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'Please choose a payment method.' }

  const auth = await requireSession()
  if (!auth.ok) return { success: false, error: auth.error }

  return applyTransition(auth.session, parsed.data.ticket_id, 'PAID', {
    is_paid: true,
    payment_method: parsed.data.payment_method,
  })
}

export async function closeTicket(input: { ticket_id: string }): Promise<ActionResult> {
  const parsed = ticketRefSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'Invalid ticket.' }

  const auth = await requireSession()
  if (!auth.ok) return { success: false, error: auth.error }

  return applyTransition(auth.session, parsed.data.ticket_id, 'CLOSED', {})
}

export async function cancelTicket(input: CancelTicketInput): Promise<ActionResult> {
  const parsed = cancelTicketSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'A cancellation reason is required.' }

  const auth = await requireSession()
  if (!auth.ok) return { success: false, error: auth.error }

  return applyTransition(
    auth.session,
    parsed.data.ticket_id,
    'CANCELLED',
    (before) => ({
      cancellation_fee: FEE_STATUSES.includes(before.status) ? CANCELLATION_FEE : 0,
    }),
    { reason: parsed.data.reason }
  )
}
