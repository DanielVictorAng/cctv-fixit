import { createServerClient } from '@/lib/supabase-client'
import { DAY_MS, formatShopTime, shopDayIndex, shopWeekRange } from '@/lib/time'
import { EmptyState } from '@/components/ui/empty-state'
import { DispatchCalendar, type DispatchJob } from '@/components/coordinator/dispatch-calendar'

export const dynamic = 'force-dynamic'

export default async function DispatchPage() {
  const supabase = await createServerClient()
  const week = shopWeekRange()

  const { data: tickets } = await supabase
    .from('tickets')
    .select('id,zone,scheduled_start,customers(full_name)')
    .not('scheduled_start', 'is', null)
    .gte('scheduled_start', week.start.toISOString())
    .lt('scheduled_start', week.end.toISOString())
    .order('scheduled_start', { ascending: true })

  const days = Array.from({ length: 7 }, (_, index) => ({
    index,
    label: formatShopTime(new Date(week.start.getTime() + index * DAY_MS), 'EEE d'),
  }))

  const jobs: DispatchJob[] = (tickets ?? []).map((ticket) => {
    const start = ticket.scheduled_start as string
    return {
      id: ticket.id,
      zone: ticket.zone,
      customer_name: ticket.customers?.full_name ?? null,
      time_label: formatShopTime(start, 'HH:mm'),
      day_index: shopDayIndex(start, week.start),
    }
  })

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6">
      <div>
        <h1 className="text-xl font-semibold">
          Dispatch — week of {formatShopTime(week.start, 'PPP')}
        </h1>
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
