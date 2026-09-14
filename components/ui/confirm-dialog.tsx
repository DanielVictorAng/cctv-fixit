'use client'

import { useState } from 'react'
import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

export function ConfirmDialog({
  open,
  onClose,
  title,
  message,
  confirmLabel = 'Confirm',
  destructive = false,
  onConfirm,
}: {
  open: boolean
  onClose: () => void
  title: string
  message: string
  confirmLabel?: string
  destructive?: boolean
  onConfirm: () => Promise<void> | void
}) {
  const [pending, setPending] = useState(false)

  async function handleConfirm() {
    setPending(true)
    try {
      await onConfirm()
      onClose()
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title={title} description={message}>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose} disabled={pending}>
          Cancel
        </Button>
        <Button variant={destructive ? 'destructive' : 'default'} onClick={handleConfirm} disabled={pending}>
          {pending ? 'Working…' : confirmLabel}
        </Button>
      </div>
    </Dialog>
  )
}
