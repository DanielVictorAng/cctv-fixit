import { getCurrentUser } from '@/lib/supabase-client'
import { SignOutButton } from '@/components/sign-out-button'

export async function RolePlaceholder({ label }: { label: string }) {
  const { user } = await getCurrentUser()

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-sm font-medium uppercase tracking-wider text-zinc-500">{label}</p>
      <h1 className="text-2xl font-semibold">Dashboard coming soon</h1>
      <p className="text-sm text-zinc-500">
        Signed in as{' '}
        <span className="font-medium text-zinc-900 dark:text-zinc-100">
          {user?.email ?? 'unknown'}
        </span>
      </p>
      <SignOutButton />
    </main>
  )
}
