'use client'

import { useSyncExternalStore } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

export type Toast = {
  id: number
  title?: string
  description?: string
  variant?: 'default' | 'destructive'
}

type Listener = () => void

let toasts: Toast[] = []
const listeners = new Set<Listener>()
let idCounter = 0

function emit() {
  for (const listener of listeners) listener()
}

function subscribe(listener: Listener) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function getSnapshot() {
  return toasts
}

const emptyToasts: Toast[] = []

function getServerSnapshot() {
  return emptyToasts
}

function dismiss(id: number) {
  toasts = toasts.filter((t) => t.id !== id)
  emit()
}

/** Show a toast. Auto-dismisses after 5 seconds. */
export function toast(input: Omit<Toast, 'id'>) {
  const id = ++idCounter
  toasts = [...toasts, { ...input, id }]
  emit()
  setTimeout(() => dismiss(id), 5000)
}

export function Toaster() {
  const items = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[100] flex w-full max-w-sm flex-col gap-2">
      {items.map((t) => (
        <div
          key={t.id}
          role="status"
          className={cn(
            'pointer-events-auto flex items-start justify-between gap-3 rounded-lg border bg-white p-4 shadow-lg dark:bg-zinc-900',
            t.variant === 'destructive'
              ? 'border-red-200 text-red-800 dark:border-red-900 dark:text-red-200'
              : 'border-zinc-200 text-zinc-900 dark:border-zinc-800 dark:text-zinc-100'
          )}
        >
          <div className="grid gap-1 text-sm">
            {t.title ? <div className="font-semibold">{t.title}</div> : null}
            {t.description ? <div className="opacity-90">{t.description}</div> : null}
          </div>
          <button
            type="button"
            onClick={() => dismiss(t.id)}
            className="shrink-0 rounded opacity-60 transition-opacity hover:opacity-100"
            aria-label="Dismiss notification"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  )
}
