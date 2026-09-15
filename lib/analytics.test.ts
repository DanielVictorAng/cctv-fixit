import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
  countByStatus,
  delta,
  openCount,
  summariseMonth,
  techLoad,
  type MonthRow,
  type TechRow,
} from './analytics.ts'

const JAN = new Date('2026-01-01T00:00:00.000Z')
const FEB = new Date('2026-02-01T00:00:00.000Z')

function monthRow(partial: Partial<MonthRow> = {}): MonthRow {
  return {
    status: 'NEW',
    created_at: '2026-01-05T02:00:00.000Z',
    completed_at: null,
    final_total: null,
    ...partial,
  }
}

test('countByStatus keeps pipeline order and hides empty statuses', () => {
  const rows = [{ status: 'NEW' }, { status: 'IN_PROGRESS' }, { status: 'NEW' }]
  assert.deepEqual(countByStatus(rows), [
    { status: 'NEW', count: 2 },
    { status: 'IN_PROGRESS', count: 1 },
  ])
  assert.deepEqual(countByStatus([]), [])
})

test('countByStatus ignores statuses that are not part of the pipeline', () => {
  assert.deepEqual(countByStatus([{ status: 'PAID' }, { status: 'CLOSED' }]), [])
})

test('openCount totals the pipeline', () => {
  assert.equal(openCount([{ status: 'NEW', count: 3 }, { status: 'QUOTED', count: 2 }]), 5)
  assert.equal(openCount([]), 0)
})

test('summariseMonth uses a half-open window [start, end)', () => {
  const rows = [
    monthRow({ created_at: '2025-12-31T23:59:59.000Z' }),
    monthRow({ created_at: '2026-01-01T00:00:00.000Z' }),
    monthRow({ created_at: '2026-01-31T23:59:59.000Z' }),
    monthRow({ created_at: '2026-02-01T00:00:00.000Z' }),
  ]
  assert.equal(summariseMonth(rows, JAN, FEB, 'Jan').created, 2)
})

test('summariseMonth only counts revenue from finished work', () => {
  const rows = [
    monthRow({ status: 'COMPLETED', completed_at: '2026-01-10T00:00:00.000Z', final_total: 1000 }),
    monthRow({ status: 'PAID', completed_at: '2026-01-11T00:00:00.000Z', final_total: 500 }),
    monthRow({ status: 'NEW', completed_at: '2026-01-12T00:00:00.000Z', final_total: 9999 }),
    monthRow({ status: 'CANCELLED', completed_at: '2026-01-13T00:00:00.000Z', final_total: 300 }),
  ]
  const summary = summariseMonth(rows, JAN, FEB, 'Jan')
  assert.equal(summary.completed, 2)
  assert.equal(summary.earned, 1500)
})

test('summariseMonth tolerates missing completion data', () => {
  const rows = [
    monthRow({ status: 'COMPLETED', completed_at: null, final_total: 500 }),
    monthRow({ status: 'COMPLETED', completed_at: '2026-01-20T00:00:00.000Z', final_total: null }),
  ]
  const summary = summariseMonth(rows, JAN, FEB, 'Jan')
  assert.equal(summary.completed, 1)
  assert.equal(summary.earned, 0)
})

test('techLoad groups by technician, busiest first, ignoring irrelevant rows', () => {
  const rows: TechRow[] = [
    { assigned_tech_id: 'a', status: 'DISPATCHED', profiles: { full_name: 'Pedro' } },
    { assigned_tech_id: 'a', status: 'IN_PROGRESS', profiles: { full_name: 'Pedro' } },
    { assigned_tech_id: 'b', status: 'SCHEDULED', profiles: { full_name: 'Ana' } },
    { assigned_tech_id: null, status: 'SCHEDULED', profiles: null },
    { assigned_tech_id: 'c', status: 'COMPLETED', profiles: { full_name: 'Jose' } },
  ]
  assert.deepEqual(techLoad(rows), [
    { techId: 'a', name: 'Pedro', open: 2 },
    { techId: 'b', name: 'Ana', open: 1 },
  ])
})

test('techLoad falls back when the technician lookup misses', () => {
  const rows: TechRow[] = [{ assigned_tech_id: 'z', status: 'DISPATCHED', profiles: null }]
  assert.deepEqual(techLoad(rows), [{ techId: 'z', name: 'Unknown technician', open: 1 }])
})

test('delta reports change and refuses to divide by zero', () => {
  assert.equal(delta(150, 100), 50)
  assert.equal(delta(50, 100), -50)
  assert.equal(delta(0, 100), -100)
  assert.equal(delta(10, 0), null)
})
