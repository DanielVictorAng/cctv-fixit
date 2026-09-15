'use server'

import { hasRole, requireSession, type UserRole } from '@/lib/auth'
import { writeAuditLog } from '@/lib/audit'
import type { ActionResult } from '@/lib/action-result'
import {
  customerCreateSchema,
  customerIdSchema,
  customerUpdateSchema,
  type CustomerCreateInput,
  type CustomerUpdateInput,
} from '@/lib/validators'

/** docs/01-schema.md §RLS: ADMIN+STORE_STAFF create and update customers; ADMIN deletes. */
const WRITE_ROLES: UserRole[] = ['ADMIN', 'STORE_STAFF']

export async function createCustomer(
  input: CustomerCreateInput
): Promise<ActionResult<{ id: string }>> {
  const parsed = customerCreateSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'Please check the customer details.' }

  const auth = await requireSession()
  if (!auth.ok) return { success: false, error: auth.error }
  const { supabase, userId, profile } = auth.session
  if (!hasRole(profile, WRITE_ROLES)) {
    return { success: false, error: 'You do not have permission to do that.' }
  }

  const { data, error } = await supabase
    .from('customers')
    .insert({ ...parsed.data, created_by: userId })
    .select('id')
    .single()
  if (error || !data) return { success: false, error: 'Could not save the customer.' }

  await writeAuditLog({
    tableName: 'customers',
    recordId: data.id,
    action: 'INSERT',
    changedBy: userId,
    newValues: parsed.data,
  })
  return { success: true, data: { id: data.id } }
}

export async function updateCustomer(input: CustomerUpdateInput): Promise<ActionResult> {
  const parsed = customerUpdateSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'Please check the customer details.' }

  const auth = await requireSession()
  if (!auth.ok) return { success: false, error: auth.error }
  const { supabase, userId, profile } = auth.session
  if (!hasRole(profile, WRITE_ROLES)) {
    return { success: false, error: 'You do not have permission to do that.' }
  }

  const { id, ...changes } = parsed.data
  const { data: before } = await supabase.from('customers').select('*').eq('id', id).single()
  if (!before) return { success: false, error: 'Customer not found.' }

  const { error } = await supabase.from('customers').update(changes).eq('id', id)
  if (error) return { success: false, error: 'Could not update the customer.' }

  // Log the same fields on both sides so the audit viewer shows real changes only.
  const oldValues = Object.fromEntries(
    Object.keys(changes).map((field) => [field, before[field as keyof typeof before]])
  )
  await writeAuditLog({
    tableName: 'customers',
    recordId: id,
    action: 'UPDATE',
    changedBy: userId,
    oldValues,
    newValues: changes,
  })
  return { success: true }
}

export async function deleteCustomer(input: { id: string }): Promise<ActionResult> {
  const parsed = customerIdSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'Invalid customer.' }

  const auth = await requireSession()
  if (!auth.ok) return { success: false, error: auth.error }
  const { supabase, userId, profile } = auth.session
  if (!hasRole(profile, ['ADMIN'])) {
    return { success: false, error: 'Only an admin can delete a customer.' }
  }

  const { id } = parsed.data
  const { data: before } = await supabase.from('customers').select('*').eq('id', id).single()
  if (!before) return { success: false, error: 'Customer not found.' }

  const { error } = await supabase.from('customers').delete().eq('id', id)
  if (error) {
    return { success: false, error: 'Could not delete the customer. Customers with jobs are kept.' }
  }

  await writeAuditLog({
    tableName: 'customers',
    recordId: id,
    action: 'DELETE',
    changedBy: userId,
    oldValues: before,
  })
  return { success: true }
}
