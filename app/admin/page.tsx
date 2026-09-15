import type { ReactNode } from 'react'

import { delta, type Analytics } from '@/lib/analytics'
import { getAnalytics } from '@/lib/analytics-queries'
import { createServerClient } from '@/lib/supabase-client'
import { EmptyState } from '@/components/ui/empty-state'
import { SignOutButton } from '@/components/sign-out-button'

export const dynamic = 'force-dynamic'

function peso(amount: number): string {
  return '₱' + amount.toLocaleString()
}

function Metric({ label, value, children }: { label: string; value: string; children?: ReactNode }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
      {children ? <div className="mt-1 text-xs">{children}</div> : null}
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">{title}</h2>
      {children}
    </section>
  )
}

function Change({ current, previous }: { current: number; previous: number }) {
  const change = delta(current, previous)
  if (change === null) return <span className="text-zinc-500">nothing to compare last month</span>
  if (change === 0) return <span className="text-zinc-500">same as last month</span>
  const tone = change > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
  return <span className={tone}>{(change > 0 ? '+' : '') + change}% vs last month</span>
}

function Overview({ data }: { data: Analytics }) {
  const nothingYet =
    data.openCount === 0 && data.thisMonth.created === 0 && data.lastMonth.created === 0

  if (nothingYet) {
    return (
      <EmptyState
        title="No tickets yet"
        message="Once the coordinator starts taking tickets, the numbers show up here."
      />
    )
  }

  return (
    <>
      <Section title="Open pipeline">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Metric label="Open jobs" value={String(data.openCount)}>
            <span className="text-zinc-500">Everything before completion</span>
          </Metric>
          {data.pipeline.map((entry) => (
            <Metric
              key={entry.status}
              label={entry.status.replace(/_/g, ' ')}
              value={String(entry.count)}
            />
          ))}
        </div>
      </Section>

      <Section title={data.thisMonth.label + ' vs ' + data.lastMonth.label}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Metric label="Tickets created" value={String(data.thisMonth.created)}>
            <Change current={data.thisMonth.created} previous={data.lastMonth.created} />
          </Metric>
          <Metric label="Tickets completed" value={String(data.thisMonth.completed)}>
            <Change current={data.thisMonth.completed} previous={data.lastMonth.completed} />
          </Metric>
          <Metric label="Earned" value={peso(data.thisMonth.earned)}>
            <Change current={data.thisMonth.earned} previous={data.lastMonth.earned} />
          </Metric>
        </div>
      </Section>

      <Section title="Needs attention">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Customers to review" value={String(data.attention.possibleDuplicates)}>
            <span className="text-zinc-500">Flagged by intake as a possible duplicate</span>
          </Metric>
          <Metric label="Unassigned scheduled" value={String(data.attention.unassignedScheduled)}>
            <span className="text-zinc-500">Scheduled with no technician yet</span>
          </Metric>
          <Metric label="Unpaid invoices" value={String(data.attention.unpaidCount)}>
            <span className="text-zinc-500">{peso(data.attention.unpaidAmount)} outstanding</span>
          </Metric>
          <Metric label="Low stock" value={String(data.attention.lowStock)}>
            <span className="text-zinc-500">At or below the reorder threshold</span>
          </Metric>
        </div>
      </Section>

      <Section title="Technician load">
        {data.techs.length === 0 ? (
          <p className="rounded-lg border border-zinc-200 bg-white p-4 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950">
            No jobs are currently assigned to a technician.
          </p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50 text-left dark:border-zinc-800 dark:bg-zinc-900">
                  <th className="p-3 font-medium">Technician</th>
                  <th className="p-3 font-medium">Open jobs</th>
                </tr>
              </thead>
              <tbody>
                {data.techs.map((tech) => (
                  <tr
                    key={tech.techId}
                    className="border-b border-zinc-200 last:border-0 dark:border-zinc-800"
                  >
                    <td className="p-3 font-medium">{tech.name}</td>
                    <td className="p-3">{tech.open}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </>
  )
}

export default async function AdminPage() {
  const supabase = await createServerClient()
  const result = await getAnalytics(supabase)

  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Admin</h1>
          <p className="text-sm text-zinc-500">Shop overview, this month against last.</p>
        </div>
        <SignOutButton />
      </div>

      {result.success && result.data ? (
        <Overview data={result.data} />
      ) : (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
          {result.error ?? 'Could not load the analytics right now.'}
        </div>
      )}
    </main>
  )
}
