import { createServerClient } from '@/lib/supabase-client'

export const dynamic = 'force-dynamic'

function Count({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value ?? '—'}</p>
    </div>
  )
}

// Pending overrides join this page in Phase 1g, monthly figures in Phase 5.
export default async function AdminPage() {
  const supabase = await createServerClient()

  const [jobs, rates, templates] = await Promise.all([
    supabase.from('jobs').select('id', { count: 'exact', head: true }),
    supabase
      .from('rate_card_items')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true),
    supabase
      .from('quote_templates')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true),
  ])

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6">
      <div>
        <h1 className="text-xl font-semibold">Admin</h1>
        <p className="text-sm text-zinc-500">
          The rate card, template and override screens are on their way.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Count label="Jobs" value={jobs.count} />
        <Count label="Active rate card items" value={rates.count} />
        <Count label="Active templates" value={templates.count} />
      </div>
    </div>
  )
}
