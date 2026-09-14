'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Play } from 'lucide-react'

import { completeTicket, startTicket } from '@/lib/actions/tickets'
import { Button } from '@/components/ui/button'
import { PhotoUploader } from '@/components/ui/photo-uploader'
import { toast } from '@/components/ui/toaster'
import type { TicketStatus } from '@/lib/ticket-state'

export function JobActions({
  ticketId,
  status,
  photoUrls,
}: {
  ticketId: string
  status: TicketStatus
  photoUrls: string[]
}) {
  const router = useRouter()
  const [pending, setPending] = useState(false)

  async function handleStart() {
    setPending(true)
    try {
      const result = await startTicket({ ticket_id: ticketId })
      if (!result.success) {
        toast({ title: 'Could not start', description: result.error, variant: 'destructive' })
        return
      }
      toast({ title: 'Job started' })
      router.refresh()
    } finally {
      setPending(false)
    }
  }

  async function handleComplete() {
    setPending(true)
    try {
      const result = await completeTicket({ ticket_id: ticketId, photo_urls: photoUrls })
      if (!result.success) {
        toast({ title: 'Could not complete', description: result.error, variant: 'destructive' })
        return
      }
      toast({ title: 'Job completed' })
      router.refresh()
    } finally {
      setPending(false)
    }
  }

  if (status === 'DISPATCHED') {
    return (
      <Button className="h-12 w-full" onClick={handleStart} disabled={pending}>
        <Play className="h-5 w-5" />
        {pending ? 'Starting…' : 'Start job'}
      </Button>
    )
  }

  if (status === 'IN_PROGRESS') {
    return (
      <div className="space-y-3">
        <PhotoUploader ticketId={ticketId} onUploaded={() => router.refresh()} />
        <Button className="h-12 w-full" onClick={handleComplete} disabled={pending || photoUrls.length === 0}>
          <CheckCircle2 className="h-5 w-5" />
          {pending ? 'Completing…' : 'Complete job'}
        </Button>
        {photoUrls.length === 0 ? (
          <p className="text-xs text-zinc-500">Add at least one photo to complete this job.</p>
        ) : null}
      </div>
    )
  }

  if (status === 'COMPLETED' || status === 'PAID' || status === 'CLOSED') {
    return <p className="text-sm text-zinc-500">This job is complete.</p>
  }

  return null
}
