import { createServerClient, type DBClient } from '@/lib/supabase-client'
import type { Database } from '@/lib/types'

export type UserRole = Database['public']['Enums']['user_role']
export type ProfileRow = Database['public']['Tables']['profiles']['Row']

export type SessionContext = {
  supabase: DBClient
  userId: string | null
  profile: ProfileRow | null
}

/** Current Supabase client + auth user + profile row (or nulls when signed out). */
export async function getSessionContext(): Promise<SessionContext> {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { supabase, userId: null, profile: null }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return { supabase, userId: user.id, profile: profile ?? null }
}

export type RequiredSession = {
  supabase: DBClient
  userId: string
  profile: ProfileRow
}

/** Require an authenticated caller with a profile row. */
export async function requireSession(): Promise<
  { ok: true; session: RequiredSession } | { ok: false; error: string }
> {
  const { supabase, userId, profile } = await getSessionContext()
  if (!userId || !profile) {
    return { ok: false, error: 'You must be signed in.' }
  }
  return { ok: true, session: { supabase, userId, profile } }
}

export function hasRole(profile: ProfileRow, roles: UserRole[]): boolean {
  return roles.includes(profile.role)
}
