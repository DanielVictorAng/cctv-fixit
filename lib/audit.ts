import { createAdminClient } from '@/lib/supabase-client'
import type { Json } from '@/lib/types'

export type AuditAction = 'INSERT' | 'UPDATE' | 'DELETE'

export type AuditEntry = {
  tableName: string
  recordId: string
  action: AuditAction
  changedBy: string | null
  oldValues?: unknown
  newValues?: unknown
}

/**
 * Append an audit row. Uses the service-role client because audit_log has no
 * INSERT policy (docs/01-schema.md: "ADMIN SELECT only. No UPDATE. No DELETE.").
 * Never throws — a failed audit write is logged but must not mask a mutation.
 */
export async function writeAuditLog(entry: AuditEntry): Promise<void> {
  try {
    const admin = createAdminClient()
    const { error } = await admin.from('audit_log').insert({
      table_name: entry.tableName,
      record_id: entry.recordId,
      action: entry.action,
      changed_by: entry.changedBy,
      old_values: (entry.oldValues ?? null) as Json | null,
      new_values: (entry.newValues ?? null) as Json | null,
    })
    if (error) console.error('[audit] insert failed:', error.message)
  } catch (err) {
    console.error('[audit] unexpected failure:', err)
  }
}
