'use client'

import { useEffect, useSyncExternalStore } from 'react'
import { WifiOff } from 'lucide-react'

function subscribe(onChange: () => void) {
  window.addEventListener('online', onChange)
  window.addEventListener('offline', onChange)
  return () => {
    window.removeEventListener('online', onChange)
    window.removeEventListener('offline', onChange)
  }
}

/**
 * Registers the service worker and shows the offline banner
 * (docs/03-ui-map.md §Offline). The photo sync queue returns in Phase 2.
 */
export function PwaManager() {
  const online = useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true
  )

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }
  }, [])

  if (online) return null

  return (
    <div className="flex items-center justify-center gap-2 bg-amber-500 px-4 py-2 text-sm font-medium text-black">
      <WifiOff className="h-4 w-4" />
      Offline — changes will sync
    </div>
  )
}
