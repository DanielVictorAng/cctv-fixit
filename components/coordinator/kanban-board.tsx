'use client'

import { useMemo, useState, type ReactNode } from 'react'
import {
  DndContext,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'

import { TicketCard, type KanbanTicket } from '@/components/tickets/ticket-card'
import { TransitionDialog } from '@/components/tickets/transition-dialog'
import type { MaterialOption, ServiceOption } from '@/components/tickets/price-calculator'
import type { TechOption } from '@/components/tickets/tech-assignment'
import { toast } from '@/components/ui/toaster'
import { canTransition, type TicketStatus } from '@/lib/ticket-state'
import { cn } from '@/lib/utils'

const COLUMNS: TicketStatus[] = [
  'NEW',
  'QUOTED',
  'SCHEDULED',
  'DISPATCHED',
  'IN_PROGRESS',
  'COMPLETED',
  'PAID',
  'CLOSED',
  'CANCELLED',
]

function DroppableColumn({ status, children }: { status: TicketStatus; children: ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: status })
  return (
    <div
      ref={setNodeRef}
      className={cn(
        'min-h-24 space-y-2 rounded-lg bg-zinc-100 p-2 dark:bg-zinc-900/50',
        isOver && 'ring-2 ring-zinc-400'
      )}
    >
      {children}
    </div>
  )
}

export function KanbanBoard({
  tickets,
  services,
  materials,
  techs,
}: {
  tickets: KanbanTicket[]
  services: ServiceOption[]
  materials: MaterialOption[]
  techs: TechOption[]
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))
  const [dialog, setDialog] = useState<{ ticketId: string; target: TicketStatus } | null>(null)

  const grouped = useMemo(() => {
    const map = new Map<TicketStatus, KanbanTicket[]>()
    for (const status of COLUMNS) map.set(status, [])
    for (const ticket of tickets) map.get(ticket.status)?.push(ticket)
    return map
  }, [tickets])

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over) return
    const ticket = tickets.find((t) => t.id === active.id)
    if (!ticket) return
    const target = over.id as TicketStatus
    if (target === ticket.status) return
    if (!canTransition(ticket.status, target)) {
      toast({
        title: 'Invalid move',
        description: `${ticket.status.replace(/_/g, ' ')} → ${target.replace(/_/g, ' ')} is not allowed.`,
        variant: 'destructive',
      })
      return
    }
    setDialog({ ticketId: ticket.id, target })
  }

  return (
    <>
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {COLUMNS.map((status) => {
            const columnTickets = grouped.get(status) ?? []
            return (
              <section key={status} className="w-72 shrink-0">
                <div className="mb-2 flex items-center justify-between px-1">
                  <span className="text-sm font-semibold">{status.replace(/_/g, ' ')}</span>
                  <span className="text-xs text-zinc-500">{columnTickets.length}</span>
                </div>
                <DroppableColumn status={status}>
                  {columnTickets.length === 0 ? (
                    <p className="py-4 text-center text-xs text-zinc-400">No tickets</p>
                  ) : (
                    columnTickets.map((ticket) => <TicketCard key={ticket.id} ticket={ticket} />)
                  )}
                </DroppableColumn>
              </section>
            )
          })}
        </div>
      </DndContext>

      <TransitionDialog
        open={dialog !== null}
        onClose={() => setDialog(null)}
        ticketId={dialog?.ticketId ?? ''}
        targetStatus={dialog?.target ?? null}
        services={services}
        materials={materials}
        techs={techs}
      />
    </>
  )
}
