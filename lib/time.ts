import { format } from 'date-fns'

// Shop time. The shop works in Baguio City but the server runs in UTC, so
// "today", the dispatch week, month boundaries and every displayed time are
// worked out in Philippine time. The Philippines is UTC+8 all year with no
// daylight saving, so a fixed offset is exact.

const SHOP_OFFSET_MS = 8 * 60 * 60 * 1000
const SHOP_OFFSET = '+08:00'
const MINUTE_MS = 60 * 1000
export const DAY_MS = 24 * 60 * 60 * 1000

export type TimeRange = { start: Date; end: Date }

/** Format an instant as shop wall-clock time with a date-fns pattern. */
export function formatShopTime(value: string | Date, pattern: string): string {
  const instant = new Date(value)
  // A Date whose local fields read as shop time — only ever handed to format().
  const wallClock = new Date(
    instant.getTime() + SHOP_OFFSET_MS + instant.getTimezoneOffset() * MINUTE_MS
  )
  return format(wallClock, pattern)
}

/** The shop calendar date of an instant; month is 1–12, weekday 0 = Sunday. */
function shopDate(instant: Date) {
  const shifted = new Date(instant.getTime() + SHOP_OFFSET_MS)
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    weekday: shifted.getUTCDay(),
  }
}

/** Shop midnight at the start of a calendar date. Out-of-range days and months roll over. */
function shopMidnight(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day) - SHOP_OFFSET_MS)
}

/** Today in the shop, as the half-open window [start, end). */
export function shopDayRange(now: Date = new Date()): TimeRange {
  const { year, month, day } = shopDate(now)
  return { start: shopMidnight(year, month, day), end: shopMidnight(year, month, day + 1) }
}

/** This shop week, Monday 00:00 up to the next Monday 00:00. */
export function shopWeekRange(now: Date = new Date()): TimeRange {
  const { year, month, day, weekday } = shopDate(now)
  const monday = day - ((weekday + 6) % 7)
  return { start: shopMidnight(year, month, monday), end: shopMidnight(year, month, monday + 7) }
}

/** Start of a shop month relative to the current one (-1 = last month, 1 = next). */
export function shopMonthStart(now: Date = new Date(), monthOffset = 0): Date {
  const { year, month } = shopDate(now)
  return shopMidnight(year, month + monthOffset, 1)
}

/** Which day of a range an instant falls on (0 = the range's first day). */
export function shopDayIndex(value: string | Date, rangeStart: Date): number {
  return Math.floor((new Date(value).getTime() - rangeStart.getTime()) / DAY_MS)
}

/** Read a datetime-local input value ("2026-09-15T14:30") as shop time; returns ISO. */
export function shopInputToIso(value: string): string {
  const withSeconds = value.length === 16 ? value + ':00' : value
  return new Date(withSeconds + SHOP_OFFSET).toISOString()
}
