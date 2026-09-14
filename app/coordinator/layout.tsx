import Link from 'next/link'
import type { ReactNode } from 'react'

import { SignOutButton } from '@/components/sign-out-button'

const NAV = [
  { href: '/coordinator', label: 'Kanban' },
  { href: '/coordinator/customers', label: 'Customers' },
  { href: '/coordinator/dispatch', label: 'Dispatch' },
]

export default function CoordinatorLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-6">
            <span className="font-semibold">CCTV Fix-It</span>
            <nav className="flex gap-4 text-sm">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <SignOutButton />
        </div>
      </header>
      <main className="flex-1 bg-zinc-50 dark:bg-black">{children}</main>
    </div>
  )
}
