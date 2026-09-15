import { AUDIT_PAGE_SIZE, summariseChanges } from '@/lib/audit-log'
import { createServerClient } from '@/lib/supabase-client'
import { AuditLogPanel, type AuditEntry } from '@/components/admin/audit-log-panel'

export const dynamic = 'force-dynamic'

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const auditTable = typeof params.audit === 'string' ? params.audit : ''
  const requestedPage = typeof params.page === 'string' ? Number(params.page) : 1
  const page = Number.isFinite(requestedPage) && requestedPage > 1 ? Math.floor(requestedPage) : 1
  const from = (page - 1) * AUDIT_PAGE_SIZE

  const supabase = await createServerClient()

  // Ask for one row more than a page: its presence is what proves an Older link.
  const query = supabase
    .from('audit_log')
    .select('id,table_name,record_id,action,changed_by,changed_at,old_values,new_values')
    .order('changed_at', { ascending: false })
    .range(from, from + AUDIT_PAGE_SIZE)
  const { data, error } = await (auditTable ? query.eq('table_name', auditTable) : query)

  const rows = data ?? []
  const hasNext = rows.length > AUDIT_PAGE_SIZE
  const pageRows = rows.slice(0, AUDIT_PAGE_SIZE)

  // Join the actor by hand rather than with an embedded select, which infers as
  // an array in the generated types.
  const actorIds = [
    ...new Set(pageRows.map((row) => row.changed_by).filter((id): id is string => Boolean(id))),
  ]
  const actors = actorIds.length
    ? await supabase.from('profiles').select('id,full_name').in('id', actorIds)
    : { data: [] }
  const actorName = new Map((actors.data ?? []).map((actor) => [actor.id, actor.full_name]))

  const entries: AuditEntry[] = pageRows.map((row) => ({
    id: row.id,
    tableName: row.table_name,
    recordId: row.record_id,
    action: row.action,
    changedAt: row.changed_at,
    changedByName: (row.changed_by ? actorName.get(row.changed_by) : null) ?? 'System',
    changes: summariseChanges(row.action, row.old_values, row.new_values),
  }))

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6">
      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
          Could not load the audit log right now. Try again shortly.
        </div>
      ) : (
        <AuditLogPanel entries={entries} activeTable={auditTable} page={page} hasNext={hasNext} />
      )}
    </div>
  )
}
