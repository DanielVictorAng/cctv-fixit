import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6">
      <Skeleton className="h-7 w-40" />
      <div className="flex gap-4 overflow-hidden">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="w-72 shrink-0 space-y-2">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ))}
      </div>
    </div>
  )
}
