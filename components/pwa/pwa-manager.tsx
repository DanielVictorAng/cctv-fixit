'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CloudUpload, WifiOff } from 'lucide-react'

import { uploadTicketPhoto } from '@/lib/actions/photos'
import { getQueuedPhotos, removeQueuedPhoto } from '@/lib/offline-queue'
import { toast } from '@/components/ui/toaster'

export function PwaManager() {
  const router = useRouter()
  const [online, setOnline] = useState(true)
  const [pending, setPending] = useState(0)

  const refreshPending = useCallback(async () => {
    try {
      setPending((await getQueuedPhotos()).length)
    } catch {
      setPending(0)
    }
  }, [])

  const flush = useCallback(async () => {
    let queued
    try {
      queued = await getQueuedPhotos()
    } catch {
      return
    }
    if (queued.length === 0) return

    let uploaded = 0
    for (const photo of queued) {
      const formData = new FormData()
      formData.append('ticketId', photo.ticketId)
      formData.append('file', new File([photo.blob], photo.filename, { type: 'image/jpeg' }))
      const result = await uploadTicketPhoto(formData)
      if (result.success) {
        await removeQueuedPhoto(photo.id)
        uploaded += 1
      }
    }
    await refreshPending()
    if (uploaded > 0) {
      toast({ title: `${uploaded} photo(s) synced` })
      router.refresh()
    }
  }, [refreshPending, router])

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }

    const update = () => setOnline(navigator.onLine)
    const onOnline = () => {
      update()
      void flush()
    }
    const onOffline = () => update()

    update()
    void refreshPending()
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    if (navigator.onLine) void flush()

    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [flush, refreshPending])

  if (online && pending === 0) return null

  return (
    <div
      className={
        online
          ? 'flex items-center justify-center gap-2 bg-blue-600 px-4 py-2 text-sm font-medium text-white'
          : 'flex items-center justify-center gap-2 bg-amber-500 px-4 py-2 text-sm font-medium text-black'
      }
    >
      {online ? (
        <>
          <CloudUpload className="h-4 w-4" />
          {pending} photo(s) waiting to sync
        </>
      ) : (
        <>
          <WifiOff className="h-4 w-4" />
          Offline — changes will sync
        </>
      )}
    </div>
  )
}
