import type { Database } from '@/lib/types'

export type TicketStatus = Database['public']['Enums']['ticket_status']
export type UserRole = Database['public']['Enums']['user_role']

/** Allowed status transitions — docs/02-logic.md §Ticket State Machine. */
export const TICKET_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  NEW: ['QUOTED', 'CANCELLED'],
  QUOTED: ['SCHEDULED', 'CANCELLED'],
  SCHEDULED: ['DISPATCHED', 'CANCELLED'],
  DISPATCHED: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
  COMPLETED: ['PAID', 'CANCELLED'],
  PAID: ['CLOSED', 'CANCELLED'],
  CLOSED: [],
  CANCELLED: [],
}

/** Roles permitted to move a ticket INTO the given status. */
export const TRANSITION_ROLES: Record<TicketStatus, UserRole[]> = {
  NEW: ['ADMIN', 'COORDINATOR'],
  QUOTED: ['ADMIN', 'COORDINATOR'],
  SCHEDULED: ['ADMIN', 'COORDINATOR'],
  DISPATCHED: ['ADMIN', 'COORDINATOR'],
  IN_PROGRESS: ['TECHNICIAN'],
  COMPLETED: ['TECHNICIAN'],
  PAID: ['ADMIN', 'COORDINATOR'],
  CLOSED: ['ADMIN'],
  CANCELLED: ['ADMIN', 'COORDINATOR'],
}

export function canTransition(from: TicketStatus, to: TicketStatus): boolean {
  return TICKET_TRANSITIONS[from]?.includes(to) ?? false
}

/** Throws on an invalid transition or an unauthorised role. */
export function assertTransition(from: TicketStatus, to: TicketStatus, role: UserRole): void {
  if (!canTransition(from, to)) {
    throw new Error(`Invalid transition: ${from} → ${to}`)
  }
  if (!TRANSITION_ROLES[to].includes(role)) {
    throw new Error(`Role ${role} cannot move a ticket to ${to}`)
  }
}
