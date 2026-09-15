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

const WRITE_ROLES: UserRole[] = ['ADMIN', 'COORDINATOR']

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
    .insert(parsed.data)
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

  await writeAuditLog({
    tableName: 'customers',
    recordId: id,
    action: 'UPDATE',
    changedBy: userId,
    oldValues: before,
    newValues: changes,
  })
  return { success: true }
}

/**
 * Clear the intake "possible_duplicate" flag once a coordinator has looked.
 * docs/04-integrations.md §Duplicate Prevention: unsure matches are created
 * flagged and reviewed by hand; this is the review.
 */
export async function resolveDuplicateCustomer(input: { id: string }): Promise<ActionResult> {
  const parsed = customerIdSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'Invalid customer.' }

  const auth = await requireSession()
  if (!auth.ok) return { success: false, error: auth.error }
  const { supabase, userId, profile } = auth.session
  if (!hasRole(profile, WRITE_ROLES)) {
    return { success: false, error: 'You do not have permission to do that.' }
  }

  const { id } = parsed.data
  const { data: before } = await supabase
    .from('customers')
    .select('possible_duplicate')
    .eq('id', id)
    .single()
  if (!before) return { success: false, error: 'Customer not found.' }

  const { error } = await supabase
    .from('customers')
    .update({ possible_duplicate: false })
    .eq('id', id)
  if (error) return { success: false, error: 'Could not update the customer.' }

  await writeAuditLog({
    tableName: 'customers',
    recordId: id,
    action: 'UPDATE',
    changedBy: userId,
    oldValues: before,
    newValues: { possible_duplicate: false },
  })
  return { success: true }
}

export async function deleteCustomer(input: { id: string }): Promise<ActionResult> {
  const parsed = customerIdSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'Invalid customer.' }

  const auth = await requireSession()
  if (!auth.ok) return { success: false, error: auth.error }
  const { supabase, userId, profile } = auth.session
  if (!hasRole(profile, WRITE_ROLES)) {
    return { success: false, error: 'You do not have permission to do that.' }
  }

  const { id } = parsed.data
  const { data: before } = await supabase.from('customers').select('*').eq('id', id).single()
  if (!before) return { success: false, error: 'Customer not found.' }

  const { error } = await supabase.from('customers').delete().eq('id', id)
  if (error) return { success: false, error: 'Could not delete the customer.' }

  await writeAuditLog({
    tableName: 'customers',
    recordId: id,
    action: 'DELETE',
    changedBy: userId,
    oldValues: before,
  })
  return { success: true }
}
