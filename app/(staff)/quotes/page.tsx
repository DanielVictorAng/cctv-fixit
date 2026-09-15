import { EmptyState } from '@/components/ui/empty-state'

// The quote builder arrives in Phase 1f (docs/02-logic.md §Phase 1 — Quote).
export default function QuotesPage() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6">
      <h1 className="text-xl font-semibold">Quotes</h1>
      <EmptyState
        title="No quotes yet"
        message="The quote builder is on its way. Projects you create will be listed here."
      />
    </div>
  )
}
