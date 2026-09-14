'use client'

import Link from 'next/link'
import { useDraggable } from '@dnd-kit/core'
import { CalendarDays, MapPin } from 'lucide-react'

import { StatusBadge } from '@/components/ui/status-badge'
import { cn } from '@/lib/utils'
import type { Database } from '@/lib/types'

type TicketStatus = Database['public']['Enums']['ticket_status']
type BaguioZone = Database['public']['Enums']['baguio_zone']

export type KanbanTicket = {
  id: string
  status: TicketStatus
  service_category: string
  zone: BaguioZone
  customer_name: string | null
  scheduled_label: string | null
  final_total: number
}

export function TicketCard({ ticket }: { ticket: KanbanTicket }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: ticket.id,
  })

  return (
    <div
      ref={setNodeRef}
      style={
        transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined
      }
      {...attributes}
      {...listeners}
      className={cn(
        'touch-none rounded-lg border border-zinc-200 bg-white p-3 shadow-sm transition-shadow hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900',
        isDragging && 'opacity-50'
      )}
    >
      <Link href={`/coordinator/tickets/${ticket.id}`} className="block space-y-2">
        <div className="flex items-start justify-between gap-2">
          <span className="text-sm font-medium">{ticket.customer_name ?? 'Unknown customer'}</span>
          <StatusBadge status={ticket.status} />
        </div>
        <p className="text-xs text-zinc-500">{ticket.service_category}</p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500">
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {ticket.zone.replace('ZONE_', 'Z').replace(/_/g, ' ')}
          </span>
          {ticket.scheduled_label ? (
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="h-3 w-3" />
              {ticket.scheduled_label}
            </span>
          ) : null}
        </div>
        {ticket.final_total > 0 ? (
          <p className="text-sm font-semibold">₱{ticket.final_total.toLocaleString()}</p>
        ) : null}
      </Link>
    </div>
  )
}
