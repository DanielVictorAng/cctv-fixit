import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
  formatShopTime,
  shopDayIndex,
  shopDayRange,
  shopInputToIso,
  shopMonthStart,
  shopWeekRange,
} from './time.ts'

const at = (iso: string) => new Date(iso)

test('formatShopTime shows Philippine wall-clock time', () => {
  assert.equal(formatShopTime('2026-09-15T01:00:00Z', 'yyyy-MM-dd HH:mm'), '2026-09-15 09:00')
  // 17:30 UTC is already the next morning in Baguio.
  assert.equal(formatShopTime(at('2026-09-15T17:30:00Z'), 'EEE d, HH:mm'), 'Wed 16, 01:30')
})

test('shopDayRange is the Philippine calendar day, not the UTC one', () => {
  const lateNight = shopDayRange(at('2026-09-15T15:59:59Z')) // 23:59:59 on the 15th
  assert.equal(lateNight.start.toISOString(), '2026-09-14T16:00:00.000Z')
  assert.equal(lateNight.end.toISOString(), '2026-09-15T16:00:00.000Z')

  const earlyMorning = shopDayRange(at('2026-09-15T16:30:00Z')) // 00:30 on the 16th
  assert.equal(earlyMorning.start.toISOString(), '2026-09-15T16:00:00.000Z')
})

test('shopWeekRange runs Monday to Monday in Philippine time', () => {
  // Sunday 23:30 on the 20th still belongs to the week of Monday the 14th.
  const sunday = shopWeekRange(at('2026-09-20T15:30:00Z'))
  assert.equal(sunday.start.toISOString(), '2026-09-13T16:00:00.000Z')
  assert.equal(sunday.end.toISOString(), '2026-09-20T16:00:00.000Z')

  // 00:30 on Monday the 21st starts the next week.
  const monday = shopWeekRange(at('2026-09-20T16:30:00Z'))
  assert.equal(monday.start.toISOString(), '2026-09-20T16:00:00.000Z')

  // Tuesday 1 September: the week began in August.
  const firstOfMonth = shopWeekRange(at('2026-09-01T04:00:00Z'))
  assert.equal(firstOfMonth.start.toISOString(), '2026-08-30T16:00:00.000Z')
})

test('shopMonthStart uses Philippine months and rolls over years', () => {
  const now = at('2026-08-31T16:30:00Z') // 00:30 on 1 September
  assert.equal(shopMonthStart(now).toISOString(), '2026-08-31T16:00:00.000Z')
  assert.equal(shopMonthStart(now, -1).toISOString(), '2026-07-31T16:00:00.000Z')
  assert.equal(shopMonthStart(now, 1).toISOString(), '2026-09-30T16:00:00.000Z')

  const newYear = at('2026-12-31T17:00:00Z') // 01:00 on 1 January 2027
  assert.equal(shopMonthStart(newYear).toISOString(), '2026-12-31T16:00:00.000Z')
  assert.equal(shopMonthStart(newYear, -1).toISOString(), '2026-11-30T16:00:00.000Z')
})

test('shopDayIndex puts early-morning jobs on the right day', () => {
  const weekStart = at('2026-09-13T16:00:00Z') // Monday 14 September, 00:00
  assert.equal(shopDayIndex('2026-09-13T23:00:00Z', weekStart), 0) // Monday 07:00
  assert.equal(shopDayIndex('2026-09-20T15:00:00Z', weekStart), 6) // Sunday 23:00
})

test('shopInputToIso reads a datetime-local value as Philippine time', () => {
  assert.equal(shopInputToIso('2026-09-15T09:00'), '2026-09-15T01:00:00.000Z')
  assert.equal(shopInputToIso('2026-09-15T09:00:30'), '2026-09-15T01:00:30.000Z')
})
