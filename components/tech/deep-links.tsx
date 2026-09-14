import { MapPin, Navigation } from 'lucide-react'

export function DeepLinks({ address }: { address: string | null }) {
  if (!address) return null
  const encoded = encodeURIComponent(address)

  return (
    <div className="grid grid-cols-2 gap-2">
      <a
        href={`https://waze.com/ul?q=${encoded}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex h-12 items-center justify-center gap-2 rounded-md bg-zinc-900 text-sm font-medium text-white dark:bg-zinc-50 dark:text-zinc-900"
      >
        <Navigation className="h-5 w-5" />
        Open Waze
      </a>
      <a
        href={`https://maps.google.com/?q=${encoded}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex h-12 items-center justify-center gap-2 rounded-md border border-zinc-300 text-sm font-medium dark:border-zinc-700"
      >
        <MapPin className="h-5 w-5" />
        Google Maps
      </a>
    </div>
  )
}
