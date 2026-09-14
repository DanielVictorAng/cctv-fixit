import Link from 'next/link'
import type { Database } from '@/lib/types'

type BaguioZone = Database['public']['Enums']['baguio_zone']

export type DispatchJob = {
  id: string
  zone: BaguioZone
  customer_name: string | null
  time_label: string
  day_index: number
}

const ZONES: BaguioZone[] = [
  'ZONE_1_CENTER',
  'ZONE_2_EAST',
  'ZONE_3_WEST',
  'ZONE_4_SOUTH',
  'ZONE_5_NORTH',
  'ZONE_6_PERIPHERAL',
]

export function DispatchCalendar({
  jobs,
  days,
}: {
  jobs: DispatchJob[]
  days: { index: number; label: string }[]
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <table className="w-full min-w-[860px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
            <th className="p-2 text-left font-medium">Zone</th>
            {days.map((day) => (
              <th key={day.index} className="p-2 text-left font-medium">
                {day.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ZONES.map((zone) => (
            <tr key={zone} className="border-b border-zinc-200 last:border-0 dark:border-zinc-800">
              <td className="p-2 align-top font-medium whitespace-nowrap">
                {zone.replace('ZONE_', 'Z').replace(/_/g, ' ')}
              </td>
              {days.map((day) => {
                const cellJobs = jobs.filter((job) => job.zone === zone && job.day_index === day.index)
                return (
                  <td key={day.index} className="p-2 align-top">
                    {cellJobs.length === 0 ? (
                      <span className="text-xs text-zinc-400">—</span>
                    ) : (
                      <div className="space-y-1">
                        {cellJobs.map((job) => (
                          <Link
                            key={job.id}
                            href={`/coordinator/tickets/${job.id}`}
                            className="block rounded bg-zinc-100 px-2 py-1 text-xs transition-colors hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800"
                          >
                            <span className="font-medium">{job.time_label}</span>{' '}
                            {job.customer_name ?? 'Unknown'}
                          </Link>
                        ))}
                      </div>
                    )}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
