import { addDays, differenceInCalendarDays, endOfWeek, format, startOfWeek } from 'date-fns'

import { createServerClient } from '@/lib/supabase-client'
import { EmptyState } from '@/components/ui/empty-state'
import { DispatchCalendar, type DispatchJob } from '@/components/coordinator/dispatch-calendar'

export const dynamic = 'force-dynamic'

export default async function DispatchPage() {
  const supabase = await createServerClient()

  const now = new Date()
  const weekStart = startOfWeek(now, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 })

  const { data: tickets } = await supabase
    .from('tickets')
    .select('id,zone,scheduled_start,customers(full_name)')
    .not('scheduled_start', 'is', null)
    .gte('scheduled_start', weekStart.toISOString())
    .lte('scheduled_start', weekEnd.toISOString())
    .order('scheduled_start', { ascending: true })

  const days = Array.from({ length: 7 }, (_, index) => ({
    index,
    label: format(addDays(weekStart, index), 'EEE d'),
  }))

  const jobs: DispatchJob[] = (tickets ?? []).map((ticket) => {
    const start = new Date(ticket.scheduled_start as string)
    return {
      id: ticket.id,
      zone: ticket.zone,
      customer_name: ticket.customers?.full_name ?? null,
      time_label: format(start, 'HH:mm'),
      day_index: differenceInCalendarDays(start, weekStart),
    }
  })

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6">
      <div>
        <h1 className="text-xl font-semibold">Dispatch — week of {format(weekStart, 'PPP')}</h1>
        <p className="text-sm text-zinc-500">Scheduled jobs this week, grouped by zone and day.</p>
      </div>

      {jobs.length === 0 ? (
        <EmptyState
          title="No jobs scheduled this week"
          message="Schedule a quoted ticket to see it appear on the dispatch board."
        />
      ) : (
        <DispatchCalendar jobs={jobs} days={days} />
      )}
    </div>
  )
}
