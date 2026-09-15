'use server'

import { hasRole, requireSession, type UserRole } from '@/lib/auth'
import { writeAuditLog } from '@/lib/audit'
import type { ActionResult } from '@/lib/action-result'
import {
  serviceCreateSchema,
  serviceIdSchema,
  serviceUpdateSchema,
  type ServiceCreateInput,
  type ServiceUpdateInput,
} from '@/lib/validators'

/** RLS allows "ADMIN full CRUD. Others SELECT only." for services. */
const WRITE_ROLES: UserRole[] = ['ADMIN']

export async function createService(
  input: ServiceCreateInput
): Promise<ActionResult<{ id: string }>> {
  const parsed = serviceCreateSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'Please check the service details.' }

  const auth = await requireSession()
  if (!auth.ok) return { success: false, error: auth.error }
  const { supabase, userId, profile } = auth.session
  if (!hasRole(profile, WRITE_ROLES)) {
    return { success: false, error: 'Only an admin can change the service catalog.' }
  }

  const { data, error } = await supabase.from('services').insert(parsed.data).select('id').single()
  if (error || !data) return { success: false, error: 'Could not save the service.' }

  await writeAuditLog({
    tableName: 'services',
    recordId: data.id,
    action: 'INSERT',
    changedBy: userId,
    newValues: parsed.data,
  })
  return { success: true, data: { id: data.id } }
}

export async function updateService(input: ServiceUpdateInput): Promise<ActionResult> {
  const parsed = serviceUpdateSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'Please check the service details.' }

  const auth = await requireSession()
  if (!auth.ok) return { success: false, error: auth.error }
  const { supabase, userId, profile } = auth.session
  if (!hasRole(profile, WRITE_ROLES)) {
    return { success: false, error: 'Only an admin can change the service catalog.' }
  }

  const { id, ...changes } = parsed.data
  const { data: before } = await supabase.from('services').select('*').eq('id', id).single()
  if (!before) return { success: false, error: 'Service not found.' }

  const { error } = await supabase.from('services').update(changes).eq('id', id)
  if (error) return { success: false, error: 'Could not update the service.' }

  await writeAuditLog({
    tableName: 'services',
    recordId: id,
    action: 'UPDATE',
    changedBy: userId,
    oldValues: before,
    newValues: changes,
  })
  return { success: true }
}

export async function deleteService(input: { id: string }): Promise<ActionResult> {
  const parsed = serviceIdSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'Invalid service.' }

  const auth = await requireSession()
  if (!auth.ok) return { success: false, error: auth.error }
  const { supabase, userId, profile } = auth.session
  if (!hasRole(profile, WRITE_ROLES)) {
    return { success: false, error: 'Only an admin can change the service catalog.' }
  }

  const { id } = parsed.data
  const { data: before } = await supabase.from('services').select('*').eq('id', id).single()
  if (!before) return { success: false, error: 'Service not found.' }

  const { error } = await supabase.from('services').delete().eq('id', id)
  if (error) return { success: false, error: 'Could not delete the service.' }

  await writeAuditLog({
    tableName: 'services',
    recordId: id,
    action: 'DELETE',
    changedBy: userId,
    oldValues: before,
  })
  return { success: true }
}
