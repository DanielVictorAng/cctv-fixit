import { endOfDay, format, startOfDay } from 'date-fns'

import { getSessionContext } from '@/lib/auth'
import { createServerClient } from '@/lib/supabase-client'
import { EmptyState } from '@/components/ui/empty-state'
import { JobCard, type JobSummary } from '@/components/tech/job-card'

export const dynamic = 'force-dynamic'

export default async function TechPage() {
  const supabase = await createServerClient()
  const { userId } = await getSessionContext()
  if (!userId) return null

  const start = startOfDay(new Date())
  const end = endOfDay(new Date())

  const [todayResult, activeResult] = await Promise.all([
    supabase
      .from('tickets')
      .select(
        'id,status,service_category,zone,scheduled_start,customers(full_name,default_address)'
      )
      .eq('assigned_tech_id', userId)
      .gte('scheduled_start', start.toISOString())
      .lte('scheduled_start', end.toISOString())
      .order('scheduled_start'),
    supabase
      .from('tickets')
      .select(
        'id,status,service_category,zone,scheduled_start,customers(full_name,default_address)'
      )
      .eq('assigned_tech_id', userId)
      .in('status', ['DISPATCHED', 'IN_PROGRESS'])
      .order('scheduled_start'),
  ])

  const merged = new Map<string, JobSummary>()
  for (const row of [...(activeResult.data ?? []), ...(todayResult.data ?? [])]) {
    merged.set(row.id, {
      id: row.id,
      status: row.status,
      service_category: row.service_category,
      zone: row.zone,
      customer_name: row.customers?.full_name ?? null,
      address: row.customers?.default_address ?? null,
      scheduled_label: row.scheduled_start ? format(new Date(row.scheduled_start), 'HH:mm') : null,
    })
  }
  const jobs = [...merged.values()]

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4 px-4 py-5">
      <h1 className="text-lg font-semibold">Today&apos;s jobs</h1>
      {jobs.length === 0 ? (
        <EmptyState
          title="No jobs today"
          message="When a coordinator assigns you a job it will show up here."
        />
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => (
            <JobCard key={job.id} ticket={job} />
          ))}
        </div>
      )}
    </div>
  )
}
