'use client'

import { useRef, useState } from 'react'
import { Camera } from 'lucide-react'

import { uploadTicketPhoto } from '@/lib/actions/photos'
import { queuePhoto } from '@/lib/offline-queue'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/toaster'

const MAX_BYTES = 1024 * 1024

/** Compress an image to <= maxBytes using a canvas (docs/03-ui-map.md). */
async function compressImage(file: File, maxBytes = MAX_BYTES): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(bitmap.width * scale))
    canvas.height = Math.max(1, Math.round(bitmap.height * scale))
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)

    let quality = 0.85
    let blob: Blob | null = file
    for (let attempt = 0; attempt < 6; attempt += 1) {
      blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((result) => resolve(result), 'image/jpeg', quality)
      )
      if (blob && blob.size <= maxBytes) break
      quality -= 0.1
    }
    return blob ?? file
  } catch {
    return file
  }
}

export function PhotoUploader({
  ticketId,
  onUploaded,
}: {
  ticketId: string
  onUploaded?: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)

  async function handleFiles(files: FileList) {
    setBusy(true)
    try {
      for (const file of Array.from(files)) {
        const compressed = await compressImage(file)
        const name = file.name.replace(/\.\w+$/, '') + '.jpg'

        if (typeof navigator !== 'undefined' && !navigator.onLine) {
          await queuePhoto({
            id: crypto.randomUUID(),
            ticketId,
            blob: compressed,
            filename: name,
            createdAt: Date.now(),
          })
          toast({ title: 'Saved offline', description: 'This photo will upload when you reconnect.' })
          continue
        }

        const formData = new FormData()
        formData.append('ticketId', ticketId)
        formData.append('file', new File([compressed], name, { type: 'image/jpeg' }))
        const result = await uploadTicketPhoto(formData)
        if (!result.success) {
          await queuePhoto({
            id: crypto.randomUUID(),
            ticketId,
            blob: compressed,
            filename: name,
            createdAt: Date.now(),
          })
          toast({ title: 'Queued for retry', description: result.error, variant: 'destructive' })
        } else {
          toast({ title: 'Photo added' })
          onUploaded?.()
        }
      }
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        multiple
        className="hidden"
        onChange={(event) => {
          if (event.target.files?.length) void handleFiles(event.target.files)
        }}
      />
      <Button
        type="button"
        variant="outline"
        className="h-12 w-full"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
      >
        <Camera className="h-5 w-5" />
        {busy ? 'Processing…' : 'Add photo'}
      </Button>
    </div>
  )
}
