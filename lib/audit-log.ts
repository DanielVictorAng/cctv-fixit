// Audit trail rendering. Import-free on purpose so it can be unit tested
// directly with node:test (see audit-log.test.ts).

/** Rows per page in the /admin audit viewer. */
export const AUDIT_PAGE_SIZE = 25

/** Tables the app writes audit rows for. Used as the filter chips. */
export const AUDIT_TABLES = [
  'change_orders',
  'customers',
  'materials',
  'profiles',
  'services',
  'ticket_materials',
  'tickets',
]

export type AuditChange = { field: string; from: string; to: string }

/** Shown in place of a value that was not present on one side of the change. */
const NONE = '—'
const MAX_LENGTH = 60

function clip(text: string): string {
  const flat = text.replace(/\s+/g, ' ').trim()
  return flat.length > MAX_LENGTH ? flat.slice(0, MAX_LENGTH - 1) + '…' : flat
}

/** One-line, length-capped rendering of a jsonb value. */
export function renderValue(value: unknown): string {
  if (value === null || value === undefined) return NONE
  if (typeof value === 'string') return value === '' ? '(empty)' : clip(value)
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (Array.isArray(value)) {
    return value.length === 0 ? '[]' : clip(value.map(renderValue).join(', '))
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
    if (entries.length === 0) return '{}'
    return clip(entries.map((entry) => entry[0] + ': ' + renderValue(entry[1])).join(', '))
  }
  return clip(String(value))
}

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

/**
 * What an audit row actually changed.
 *
 * INSERT shows the new values, DELETE shows the old ones, and UPDATE shows only
 * the fields whose rendered value differs — which is what makes the log readable
 * rather than a pile of near-identical blobs.
 */
export function summariseChanges(
  action: string,
  oldValues: unknown,
  newValues: unknown
): AuditChange[] {
  const before = asRecord(oldValues)
  const after = asRecord(newValues)

  if (action === 'INSERT') {
    return Object.keys(after)
      .sort()
      .map((field) => ({ field, from: NONE, to: renderValue(after[field]) }))
  }

  if (action === 'DELETE') {
    return Object.keys(before)
      .sort()
      .map((field) => ({ field, from: renderValue(before[field]), to: NONE }))
  }

  const fields = [...new Set([...Object.keys(before), ...Object.keys(after)])].sort()
  const changes: AuditChange[] = []
  for (const field of fields) {
    const from = renderValue(before[field])
    const to = renderValue(after[field])
    if (from !== to) changes.push({ field, from, to })
  }
  return changes
}
