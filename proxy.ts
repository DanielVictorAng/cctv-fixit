import { NextResponse, type NextRequest } from 'next/server'
import { createMiddlewareClient } from '@/lib/supabase-client'
import type { Database } from '@/lib/types'

type UserRole = Database['public']['Enums']['user_role']

/** Route areas each role may open; the first is its home (docs/03-ui-map.md §Routes). */
const ROLE_AREAS: Record<UserRole, string[]> = {
  ADMIN: ['/admin', '/coordinator'],
  COORDINATOR: ['/coordinator'],
  TECHNICIAN: ['/tech'],
  STORE_STAFF: ['/store'],
}

function canOpen(areas: string[], pathname: string): boolean {
  return areas.some((area) => pathname === area || pathname.startsWith(area + '/'))
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
  const areas = role ? ROLE_AREAS[role] : null

  // Signed in but no profile/role (e.g. trigger not yet applied): force re-auth.
  if (!areas) {
    await supabase.auth.signOut()
    return redirect('/login')
  }

  const home = areas[0]

  // Already on /login → send to their role home.
  if (pathname === '/login') return redirect(home)

  // Allow their own areas (and anything under them).
  if (canOpen(areas, pathname)) return response

  // Everything else → their role home.
  return redirect(home)
}

export const config = {
  matcher: [
    // sw.js and the manifest must never be redirected: browsers reject a
    // redirected service worker script and fetch the manifest without cookies.
    '/((?!api|_next/static|_next/image|favicon.ico|sw\\.js$|manifest\\.webmanifest$|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml|json)$).*)',
  ],
}
