'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { logoutAction } from '@/app/login/actions'

export function SignOutButton() {
  const router = useRouter()
  const [pending, setPending] = useState(false)

  async function handleSignOut() {
    setPending(true)
    try {
      await logoutAction()
      router.replace('/login')
      router.refresh()
    } finally {
      setPending(false)
    }
  }

  return (
    <Button variant="outline" onClick={handleSignOut} disabled={pending}>
      {pending ? 'Signing out…' : 'Sign out'}
    </Button>
  )
}
