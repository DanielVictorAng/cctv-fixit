import { LOW_STOCK_THRESHOLD } from '@/lib/constants'
import { createServerClient } from '@/lib/supabase-client'
import { EmptyState } from '@/components/ui/empty-state'

export const dynamic = 'force-dynamic'

export default async function InventoryPage() {
  const supabase = await createServerClient()
  const { data } = await supabase
    .from('materials')
    .select('id,sku,name,category,stock_qty')
    .order('name')

  const materials = data ?? []

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4 px-4 py-5">
      <h1 className="text-lg font-semibold">Inventory</h1>

      {materials.length === 0 ? (
        <EmptyState title="No materials yet" message="Materials added by an admin will show up here." />
      ) : (
        <ul className="divide-y divide-zinc-200 rounded-lg border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-950">
          {materials.map((material) => (
            <li key={material.id} className="flex items-center justify-between gap-3 p-4 text-base">
              <div>
                <p className="font-medium">{material.name}</p>
                <p className="text-zinc-500">
                  {material.sku}
                  {material.category ? ` · ${material.category}` : ''}
                </p>
              </div>
              <span
                className={
                  material.stock_qty <= LOW_STOCK_THRESHOLD ? 'font-semibold text-red-600' : ''
                }
              >
                {material.stock_qty}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
