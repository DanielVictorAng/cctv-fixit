import type { ReactNode } from 'react'

import { getSessionContext } from '@/lib/auth'
import { StaffHeader } from '@/components/staff-header'

// Shared frame for /admin, /quotes and /store. (staff) is a route group, so it
// adds no URL segment.
export default async function StaffLayout({ children }: { children: ReactNode }) {
  const { profile } = await getSessionContext()

  return (
    <div className="flex min-h-screen flex-col">
      <StaffHeader role={profile?.role ?? null} />
      <main className="flex-1 bg-zinc-50 dark:bg-black">{children}</main>
    </div>
  )
}
