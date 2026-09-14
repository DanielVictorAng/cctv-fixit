'use client'

import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { TransitionDialog } from '@/components/tickets/transition-dialog'
import type { MaterialOption, ServiceOption } from '@/components/tickets/price-calculator'
import type { TechOption } from '@/components/tickets/tech-assignment'
import { TICKET_TRANSITIONS, TRANSITION_ROLES, type TicketStatus } from '@/lib/ticket-state'
import type { UserRole } from '@/lib/auth'

const ACTION_LABELS: Partial<Record<TicketStatus, string>> = {
  QUOTED: 'Submit quote',
  SCHEDULED: 'Schedule',
  DISPATCHED: 'Assign technician',
  PAID: 'Confirm payment',
  CANCELLED: 'Cancel ticket',
}

export function TicketActions({
  ticketId,
  status,
  role,
  services,
  materials,
  techs,
}: {
  ticketId: string
  status: TicketStatus
  role: UserRole
  services: ServiceOption[]
  materials: MaterialOption[]
  techs: TechOption[]
}) {
  const [target, setTarget] = useState<TicketStatus | null>(null)

  const actions = TICKET_TRANSITIONS[status].filter(
    (next) => TRANSITION_ROLES[next].includes(role) && next !== 'CANCELLED'
  )
  const canCancel = TRANSITION_ROLES.CANCELLED.includes(role) && status !== 'CANCELLED'

  if (actions.length === 0 && !canCancel) {
    return <p className="text-sm text-zinc-500">No actions available for this ticket.</p>
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {actions.map((next) => (
          <Button key={next} onClick={() => setTarget(next)}>
            {ACTION_LABELS[next] ?? next}
          </Button>
        ))}
        {canCancel ? (
          <Button variant="destructive" onClick={() => setTarget('CANCELLED')}>
            Cancel ticket
          </Button>
        ) : null}
      </div>

      <TransitionDialog
        open={target !== null}
        onClose={() => setTarget(null)}
        ticketId={ticketId}
        targetStatus={target}
        services={services}
        materials={materials}
        techs={techs}
      />
    </>
  )
}
