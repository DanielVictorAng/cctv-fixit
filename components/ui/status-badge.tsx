import { cn } from '@/lib/utils'
import type { Database } from '@/lib/types'

type TicketStatus = Database['public']['Enums']['ticket_status']

const STATUS_STYLES: Record<TicketStatus, string> = {
  NEW: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200',
  QUOTED: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200',
  SCHEDULED: 'bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-200',
  DISPATCHED: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200',
  IN_PROGRESS: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-200',
  COMPLETED: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200',
  PAID: 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200',
  CLOSED: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
  CANCELLED: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200',
}

export function StatusBadge({ status, className }: { status: TicketStatus; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        STATUS_STYLES[status],
        className
      )}
    >
      {status.replace(/_/g, ' ')}
    </span>
  )
}
