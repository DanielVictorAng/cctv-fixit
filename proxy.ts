import { NextResponse, type NextRequest } from 'next/server'
import { createMiddlewareClient } from '@/lib/supabase-client'
import type { Database } from '@/lib/types'

type UserRole = Database['public']['Enums']['user_role']

const ROLE_HOME: Record<UserRole, string> = {
  ADMIN: '/admin',
  COORDINATOR: '/coordinator',
  TECHNICIAN: '/tech',
  STORE_STAFF: '/store',
}

export async function proxy(request: NextRequest) {
  const response = NextResponse.next({ request })
  const supabase = createMiddlewareClient(request, response)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  const redirect = (path: string) => {
    const url = request.nextUrl.clone()
    url.pathname = path
    url.search = ''
    return NextResponse.redirect(url)
  }

  // Not authenticated: only /login is reachable.
  if (!user) {
    if (pathname === '/login') return response
    return redirect('/login')
  }

  // Authenticated: resolve role from the profile.
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const role = (profile?.role ?? null) as UserRole | null
  const home = role ? ROLE_HOME[role] : null

  // Signed in but no profile/role (e.g. trigger not yet applied): force re-auth.
  if (!home) {
    await supabase.auth.signOut()
    return redirect('/login')
  }

  // Already on /login → send to their role home.
  if (pathname === '/login') return redirect(home)

  // Allow their own area (and anything under it).
  if (pathname === home || pathname.startsWith(home + '/')) return response

  // Everything else → their role home.
  return redirect(home)
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml|json)$).*)',
  ],
}
