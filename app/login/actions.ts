'use server'

import { createServerClient } from '@/lib/supabase-client'
import { loginSchema, type LoginInput } from '@/lib/validators'

export type ActionResult = {
  success: boolean
  data?: unknown
  error?: string
}

export async function loginAction(input: LoginInput): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: 'Invalid email or password.' }
  }

  const supabase = await createServerClient()
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  })

  if (error) {
    // Never leak raw auth errors (e.g. "Invalid login credentials") to the UI.
    return { success: false, error: 'Invalid email or password.' }
  }

  return { success: true, data: { email: data.user?.email ?? null } }
}

export async function logoutAction(): Promise<ActionResult> {
  const supabase = await createServerClient()
  const { error } = await supabase.auth.signOut()
  if (error) {
    return { success: false, error: 'Could not sign out. Please try again.' }
  }
  return { success: true }
}
