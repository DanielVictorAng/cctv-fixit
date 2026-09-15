import { format } from 'date-fns'
import Link from 'next/link'

import { AUDIT_TABLES, type AuditChange } from '@/lib/audit-log'
import { EmptyState } from '@/components/ui/empty-state'
import { cn } from '@/lib/utils'

export type AuditEntry = {
  id: string
  tableName: string
  recordId: string
  action: string
  changedAt: string
  changedByName: string
  changes: AuditChange[]
}

const ACTION_STYLES: Record<string, string> = {
  INSERT: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200',
  UPDATE: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200',
  DELETE: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200',
}

function href(table: string, page: number): string {
  const params = new URLSearchParams()
  if (table) params.set('audit', table)
  if (page > 1) params.set('page', String(page))
  const query = params.toString()
  return query ? '/admin?' + query : '/admin'
}

function Chip({ label, active, to }: { label: string; active: boolean; to: string }) {
  return (
    <Link
      href={to}
      className={cn(
        'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
        active
          ? 'border-zinc-900 bg-zinc-900 text-zinc-50 dark:border-zinc-50 dark:bg-zinc-50 dark:text-zinc-900'
          : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-900'
      )}
    >
      {label}
    </Link>
  )
}

export function AuditLogPanel({
  entries,
  activeTable,
  page,
  hasNext,
}: {
  entries: AuditEntry[]
  activeTable: string
  page: number
  hasNext: boolean
}) {
  // Anything unexpected in the log still gets a filter chip of its own.
  const tables = [...new Set([...AUDIT_TABLES, ...entries.map((entry) => entry.tableName)])].sort()

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">Audit log</h2>

      <div className="flex flex-wrap gap-2">
        <Chip label="All" active={activeTable === ''} to={href('', 1)} />
        {tables.map((table) => (
          <Chip
            key={table}
            label={table.replace(/_/g, ' ')}
            active={activeTable === table}
            to={href(table, 1)}
          />
        ))}
      </div>

      {entries.length === 0 ? (
        <EmptyState
          title="Nothing logged yet"
          message="Every create, update and delete the app makes is recorded here with who did it and what changed."
        />
      ) : (
        <div className="divide-y divide-zinc-200 overflow-hidden rounded-lg border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-950">
          {entries.map((entry) => (
            <div key={entry.id} className="space-y-2 p-3">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span
                  className={cn(
                    'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                    ACTION_STYLES[entry.action] ??
                      'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
                  )}
                >
                  {entry.action}
                </span>
                <span className="font-medium">{entry.tableName.replace(/_/g, ' ')}</span>
                <span className="font-mono text-xs text-zinc-500">
                  {entry.recordId.slice(0, 8)}
                </span>
                <span className="text-xs text-zinc-500">
                  {entry.changedByName} · {format(new Date(entry.changedAt), 'MMM d, HH:mm')}
                </span>
              </div>

              {entry.changes.length === 0 ? (
                <p className="text-xs text-zinc-500">No field changes recorded.</p>
              ) : (
                <ul className="space-y-0.5 text-xs">
                  {entry.changes.map((change) => (
                    <li key={change.field} className="flex flex-wrap gap-1 text-zinc-600 dark:text-zinc-400">
                      <span className="font-mono text-zinc-500">{change.field}</span>
                      <span className="text-red-600 line-through decoration-red-400 dark:text-red-400">
                        {change.from}
                      </span>
                      <span aria-hidden className="text-zinc-400">
                        →
                      </span>
                      <span className="text-emerald-700 dark:text-emerald-400">{change.to}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}

      {page > 1 || hasNext ? (
        <div className="flex items-center justify-between gap-3 text-sm">
          {page > 1 ? (
            <Link className="underline underline-offset-4" href={href(activeTable, page - 1)}>
              ← Newer
            </Link>
          ) : (
            <span />
          )}
          <span className="text-xs text-zinc-500">Page {page}</span>
          {hasNext ? (
            <Link className="underline underline-offset-4" href={href(activeTable, page + 1)}>
              Older →
            </Link>
          ) : (
            <span />
          )}
        </div>
      ) : null}
    </section>
  )
}
