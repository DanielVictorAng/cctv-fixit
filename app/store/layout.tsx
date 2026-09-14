import Link from 'next/link'
import type { ReactNode } from 'react'
import { Boxes, ClipboardList } from 'lucide-react'

import { SignOutButton } from '@/components/sign-out-button'

export default function StoreLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col pb-16">
      <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950">
        <span className="text-base font-semibold">CCTV Fix-It — Store</span>
        <SignOutButton />
      </header>
      <main className="flex-1 bg-zinc-50 dark:bg-black">{children}</main>
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-2 border-t border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <Link
          href="/store"
          className="flex min-h-14 items-center justify-center gap-2 text-base font-medium"
        >
          <ClipboardList className="h-5 w-5" />
          Pick-lists
        </Link>
        <Link
          href="/store/inventory"
          className="flex min-h-14 items-center justify-center gap-2 text-base font-medium"
        >
          <Boxes className="h-5 w-5" />
          Inventory
        </Link>
      </nav>
    </div>
  )
}
