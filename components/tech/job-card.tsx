import Link from 'next/link'
import { CalendarClock, MapPin } from 'lucide-react'

import { StatusBadge } from '@/components/ui/status-badge'
import type { Database } from '@/lib/types'

type JobStatus = Database['public']['Enums']['job_status']
type BaguioZone = Database['public']['Enums']['baguio_zone']

export type JobSummary = {
  id: string
  status: JobStatus
  service_category: string
  zone: BaguioZone
  customer_name: string | null
  address: string | null
  scheduled_label: string | null
}

export function JobCard({ ticket }: { ticket: JobSummary }) {
  return (
    <Link
      href={`/tech/jobs/${ticket.id}`}
      className="block rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition-shadow active:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-base font-semibold">{ticket.customer_name ?? 'Unknown customer'}</p>
          <p className="text-sm text-zinc-500">{ticket.service_category}</p>
        </div>
        <StatusBadge status={ticket.status} />
      </div>
      <div className="mt-3 space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
        <p className="flex items-start gap-2">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
          {ticket.address ?? ticket.zone.replace(/_/g, ' ')}
        </p>
        {ticket.scheduled_label ? (
          <p className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4 shrink-0" />
            {ticket.scheduled_label}
          </p>
        ) : null}
      </div>
    </Link>
  )
}
