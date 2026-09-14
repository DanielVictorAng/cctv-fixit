import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { getCurrentUser } from '@/lib/supabase-client'
import { LoginForm } from '@/components/login-form'

export const metadata: Metadata = {
  title: 'Sign in — CCTV Fix-It',
}

export default async function LoginPage() {
  const { user } = await getCurrentUser()
  if (user) redirect('/')

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
          <p className="text-sm text-zinc-500">CCTV Fix-It — field service dashboard</p>
        </div>
        <LoginForm />
      </div>
    </main>
  )
}
