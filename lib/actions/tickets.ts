'use server'

import { hasRole, requireSession, type RequiredSession, type UserRole } from '@/lib/auth'
import { writeAuditLog } from '@/lib/audit'
import { calculateQuote } from '@/lib/pricing'
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

/**
 * Shared state-machine transition: validates the move + role, applies the
 * patch, and writes an audit row (docs/02-logic.md §Ticket State Machine).
 */
async function applyTransition(
  session: RequiredSession,
  ticketId: string,
  to: TicketStatus,
  changes: TicketUpdate | ((before: TicketRow) => TicketUpdate),
  auditExtra?: Record<string, unknown>
): Promise<ActionResult> {
  const { supabase, userId, profile } = session

  const before = await loadTicket(supabase, ticketId)
  if (!before) return { success: false, error: 'Ticket not found.' }

  try {
    assertTransition(before.status, to, profile.role)
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Invalid transition.' }
  }

  if (TECH_TRANSITIONS.includes(to) && before.assigned_tech_id !== userId) {
    return { success: false, error: 'You are not assigned to this ticket.' }
  }

  const patch = typeof changes === 'function' ? changes(before) : changes
  const { error } = await supabase
    .from('tickets')
    .update({ ...patch, status: to })
    .eq('id', ticketId)
  if (error) return { success: false, error: 'Could not update the ticket.' }

  await writeAuditLog({
    tableName: 'tickets',
    recordId: ticketId,
    action: 'UPDATE',
    changedBy: userId,
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

// --- State machine transitions -----------------------------------------

export async function quoteTicket(input: QuoteTicketInput): Promise<ActionResult> {
  const parsed = quoteTicketSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'Please check the quote.' }
  if (parsed.data.base_labour <= 0) {
    return { success: false, error: 'Quoted labour must be greater than zero.' }
  }

  const auth = await requireSession()
  if (!auth.ok) return { success: false, error: auth.error }

  const pricing = calculateQuote({
    baseLabour: parsed.data.base_labour,
    materialCosts: parsed.data.material_costs,
    surcharges: parsed.data.surcharges,
  })
  return applyTransition(auth.session, parsed.data.ticket_id, 'QUOTED', { ...pricing })
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
  if (!parsed.success) {
    return { success: false, error: 'At least one photo is required to complete a job.' }
  }

  const auth = await requireSession()
  if (!auth.ok) return { success: false, error: auth.error }

  return applyTransition(auth.session, parsed.data.ticket_id, 'COMPLETED', {
    photo_urls: parsed.data.photo_urls,
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
