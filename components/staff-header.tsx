import Link from 'next/link'

import type { UserRole } from '@/lib/auth'
import { SignOutButton } from '@/components/sign-out-button'

const LINKS: { href: string; label: string; roles: UserRole[] }[] = [
  { href: '/admin', label: 'Admin', roles: ['ADMIN'] },
  { href: '/quotes', label: 'Quotes', roles: ['ADMIN', 'STORE_STAFF'] },
  { href: '/store/inventory', label: 'Inventory', roles: ['ADMIN', 'STORE_STAFF'] },
  { href: '/admin/audit', label: 'Audit log', roles: ['ADMIN'] },
]

/** Top bar for the admin, quotes and store areas (docs/03-ui-map.md §Routes). */
export function StaffHeader({ role }: { role: UserRole | null }) {
  const links = LINKS.filter((link) => role !== null && link.roles.includes(role))

  return (
    <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-2">
        <div className="flex flex-wrap items-center gap-x-6">
          <span className="text-base font-semibold">CCTV Fix-It</span>
          <nav className="flex flex-wrap gap-x-4 text-base">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="inline-flex min-h-11 items-center text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <SignOutButton />
      </div>
    </header>
  )
}
