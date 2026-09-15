// Dashboard maths. Deliberately free of imports so it can be unit tested
// directly with node:test (see analytics.test.ts) — the queries live in
// analytics-queries.ts.

/** Work that still needs someone in the shop. */
export const OPEN_STATUSES = ['NEW', 'QUOTED', 'SCHEDULED', 'DISPATCHED', 'IN_PROGRESS'] as const

/** Work that finished, and therefore earned its money. */
export const EARNED_STATUSES = ['COMPLETED', 'PAID', 'CLOSED'] as const

/** Statuses that count towards a technician's current load. */
export const LOADED_STATUSES = ['SCHEDULED', 'DISPATCHED', 'IN_PROGRESS'] as const

export type StatusCount = { status: string; count: number }

export type MonthSummary = {
  label: string
  created: number
  completed: number
  earned: number
}

export type TechLoad = { techId: string; name: string; open: number }

export type Attention = {
  possibleDuplicates: number
  unassignedScheduled: number
  lowStock: number
  unpaidCount: number
  unpaidAmount: number
}

export type Analytics = {
  openCount: number
  pipeline: StatusCount[]
  thisMonth: MonthSummary
  lastMonth: MonthSummary
  techs: TechLoad[]
  attention: Attention
}

/** The columns the month summary reads. */
export type MonthRow = {
  status: string
  created_at: string
  completed_at: string | null
  final_total: number | null
}

/** The columns the technician load reads. */
export type TechRow = {
  assigned_tech_id: string | null
  status: string
  profiles: { full_name: string } | null
}

const OPEN = new Set<string>(OPEN_STATUSES)
const EARNED = new Set<string>(EARNED_STATUSES)
const LOADED = new Set<string>(LOADED_STATUSES)

/** Open tickets per status, in pipeline order, hiding statuses with nothing in them. */
export function countByStatus(rows: { status: string }[]): StatusCount[] {
  return OPEN_STATUSES.map((status) => ({
    status,
    count: rows.filter((row) => row.status === status).length,
  })).filter((entry) => entry.count > 0)
}

/**
 * Created, completed and earned inside the half-open window [start, end).
 * A quote is not revenue, so only finished work adds to "earned".
 */
export function summariseMonth(
  rows: MonthRow[],
  start: Date,
  end: Date,
  label: string
): MonthSummary {
  const from = start.getTime()
  const to = end.getTime()

  const inside = (value: string | null): boolean => {
    if (!value) return false
    const time = new Date(value).getTime()
    return time >= from && time < to
  }

  let created = 0
  let completed = 0
  let earned = 0

  for (const row of rows) {
    if (inside(row.created_at)) created += 1
    if (inside(row.completed_at) && EARNED.has(row.status)) {
      completed += 1
      earned += Number(row.final_total ?? 0)
    }
  }

  return { label, created, completed, earned }
}

/** Current open jobs per technician, busiest first. */
export function techLoad(rows: TechRow[]): TechLoad[] {
  const byTech = new Map<string, TechLoad>()

  for (const row of rows) {
    if (!row.assigned_tech_id) continue
    if (!LOADED.has(row.status)) continue

    const existing = byTech.get(row.assigned_tech_id)
    if (existing) {
      existing.open += 1
      continue
    }

    byTech.set(row.assigned_tech_id, {
      techId: row.assigned_tech_id,
      name: row.profiles?.full_name ?? 'Unknown technician',
      open: 1,
    })
  }

  return [...byTech.values()].sort((a, b) => b.open - a.open || a.name.localeCompare(b.name))
}

/** Percentage change over last month; null when there is no base to compare against. */
export function delta(thisMonth: number, lastMonth: number): number | null {
  if (lastMonth === 0) return null
  return Math.round(((thisMonth - lastMonth) / lastMonth) * 100)
}

/** Open total, derived from the pipeline rather than a second query. */
export function openCount(pipeline: StatusCount[]): number {
  return pipeline.reduce((total, entry) => total + entry.count, 0)
}

