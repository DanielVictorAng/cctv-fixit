import { addMonths, startOfMonth, subMonths } from 'date-fns'

import {
  countByStatus,
  openCount,
  summariseMonth,
  techLoad,
  LOADED_STATUSES,
  OPEN_STATUSES,
  type Analytics,
  type MonthRow,
  type TechRow,
} from '@/lib/analytics'
import type { ActionResult } from '@/lib/action-result'
import { LOW_STOCK_THRESHOLD } from '@/lib/constants'
import type { DBClient } from '@/lib/supabase-client'

/**
 * Everything /admin needs, read through the ADMIN session client so RLS still
 * applies. Read-only: no writes and no service-role client (docs/00-rules.md).
 */
export async function getAnalytics(supabase: DBClient): Promise<ActionResult<Analytics>> {
  const now = new Date()
  const thisStart = startOfMonth(now)
  const nextStart = startOfMonth(addMonths(now, 1))
  const lastStart = startOfMonth(subMonths(now, 1))
  const lastIso = lastStart.toISOString()
  // One pass covers both months: a job completed this month may have been
  // created long before it.
  const recentFilter = 'created_at.gte.' + lastIso + ',completed_at.gte.' + lastIso

  const [open, recent, loaded, technicians, duplicates, unassigned, lowStock, unpaid] =
    await Promise.all([
      supabase.from('tickets').select('status').in('status', OPEN_STATUSES),
      supabase.from('tickets').select('status,created_at,completed_at,final_total').or(recentFilter),
      supabase
        .from('tickets')
        .select('assigned_tech_id,status')
        .in('status', LOADED_STATUSES)
        .not('assigned_tech_id', 'is', null),
      supabase.from('profiles').select('id,full_name').eq('role', 'TECHNICIAN'),
      supabase
        .from('customers')
        .select('id', { count: 'exact', head: true })
        .eq('possible_duplicate', true),
      supabase
        .from('tickets')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'SCHEDULED')
        .is('assigned_tech_id', null),
      supabase
        .from('materials')
        .select('id', { count: 'exact', head: true })
        .lte('stock_qty', LOW_STOCK_THRESHOLD),
      supabase.from('tickets').select('final_total').eq('is_paid', false).gt('final_total', 0),
    ])

  const failure =
    open.error ??
    recent.error ??
    loaded.error ??
    technicians.error ??
    duplicates.error ??
    unassigned.error ??
    lowStock.error ??
    unpaid.error

  if (failure) {
    console.error('[analytics] dashboard query failed', failure.message)
    return { success: false, error: 'Could not load the analytics right now. Try again shortly.' }
  }

  // Joined by hand rather than with an embedded select, so every step is typed
  // without casting.
  const nameById = new Map((technicians.data ?? []).map((tech) => [tech.id, tech.full_name]))
  const techRows: TechRow[] = (loaded.data ?? []).map((row) => ({
    assigned_tech_id: row.assigned_tech_id,
    status: row.status,
    profiles: nameById.has(row.assigned_tech_id ?? '')
      ? { full_name: nameById.get(row.assigned_tech_id as string) as string }
      : null,
  }))

  const pipeline = countByStatus(open.data ?? [])
  const unpaidRows = unpaid.data ?? []

  return {
    success: true,
    data: {
      openCount: openCount(pipeline),
      pipeline,
      thisMonth: summariseMonth(recent.data ?? [], thisStart, nextStart, 'This month'),
      lastMonth: summariseMonth(recent.data ?? [], lastStart, thisStart, 'Last month'),
      techs: techLoad(techRows),
      attention: {
        possibleDuplicates: duplicates.count ?? 0,
        unassignedScheduled: unassigned.count ?? 0,
        lowStock: lowStock.count ?? 0,
        unpaidCount: unpaidRows.length,
        unpaidAmount: unpaidRows.reduce((total, row) => total + Number(row.final_total ?? 0), 0),
      },
    },
  }
}
