import { EmptyState } from '@/components/ui/empty-state'

// Technician jobs are rebuilt on the new job model in Phase 2 (docs/02-logic.md).
export default function TechPage() {
  return (
    <div className="mx-auto w-full max-w-2xl space-y-4 px-4 py-5">
      <h1 className="text-lg font-semibold">Today&apos;s jobs</h1>
      <EmptyState
        title="No jobs yet"
        message="Surveys and installations assigned to you will show up here."
      />
    </div>
  )
}
