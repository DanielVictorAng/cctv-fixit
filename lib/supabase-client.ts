import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { NextRequest, NextResponse } from 'next/server'
import type { Database } from '@/lib/types'

// Server-only module. next/headers is loaded lazily (dynamic import) so this
// module stays safe to import from middleware.

/** Supabase client typed against the generated public schema. */
export type DBClient = SupabaseClient<Database>

export type CookieStorage = {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
  removeItem: (key: string) => void
}

function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anonKey) {
    throw new Error(
      'Missing Supabase env vars: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY'
    )
  }
  return { url, anonKey }
}

const SESSION_COOKIE_OPTIONS = {
  path: '/',
  sameSite: 'lax',
  httpOnly: true,
  maxAge: 60 * 60 * 24 * 365, // 1 year
} as const

function createSupabaseClient(storage: CookieStorage): DBClient {
  const { url, anonKey } = getSupabaseEnv()
  return createClient<Database>(url, anonKey, {
    auth: {
      flowType: 'pkce',
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: true,
      storage,
    },
  })
}

/**
 * Server client for Server Components, Server Actions, and Route Handlers.
 * The session lives in the standard sb-<ref>-auth-token httpOnly cookie.
 */
export async function createServerClient(): Promise<DBClient> {
  const { cookies } = await import('next/headers')
  const cookieStore = await cookies()

  return createSupabaseClient({
    getItem: (key) => cookieStore.get(key)?.value ?? null,
    setItem: (key, value) => {
      try {
        cookieStore.set(key, value, SESSION_COOKIE_OPTIONS)
      } catch {
        // Cannot set cookies while rendering a Server Component — ignore.
      }
    },
    removeItem: (key) => {
      try {
        cookieStore.delete(key)
      } catch {
        // Cannot delete cookies while rendering a Server Component — ignore.
      }
    },
  })
}

/**
 * Middleware client: reads the session from request cookies and writes
 * refreshed tokens back to the response cookies.
 */
export function createMiddlewareClient(
  request: NextRequest,
  response: NextResponse
): DBClient {
  return createSupabaseClient({
    getItem: (key) => request.cookies.get(key)?.value ?? null,
    setItem: (key, value) => {
      request.cookies.set(key, value)
      response.cookies.set(key, value, SESSION_COOKIE_OPTIONS)
    },
    removeItem: (key) => {
      request.cookies.delete(key)
      response.cookies.delete(key)
    },
  })
}

/**
 * Service-role client. Server-only — bypasses RLS. Never import this from a
 * Client Component and never expose the key to the browser.
 */
export function createAdminClient(): DBClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    throw new Error(
      'Missing Supabase admin env vars: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY'
    )
  }
  return createClient<Database>(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  })
}

/** Convenience wrapper: authenticated user for the current request. */
export async function getCurrentUser() {
  const supabase = await createServerClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  return { user, error }
}
