import type { ReactNode } from 'react'

export function EmptyState({
  title,
  message,
  action,
}: {
  title: string
  message: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-zinc-300 bg-white py-16 text-center dark:border-zinc-700 dark:bg-zinc-950">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="max-w-sm text-sm text-zinc-500">{message}</p>
      {action}
    </div>
  )
}
