import { LOW_STOCK_THRESHOLD } from '@/lib/constants'
import { createServerClient } from '@/lib/supabase-client'
import { EmptyState } from '@/components/ui/empty-state'

export const dynamic = 'force-dynamic'

function peso(amount: number): string {
  return '₱' + Number(amount).toLocaleString()
}

// Read-only for now; adding and editing equipment arrives in Phase 1e.
export default async function InventoryPage() {
  const supabase = await createServerClient()
  const { data } = await supabase
    .from('equipment')
    .select('id,sku,name,category,sell_price,stock_qty,is_active')
    .order('name')

  const equipment = data ?? []

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4 px-4 py-5">
      <h1 className="text-lg font-semibold">Inventory</h1>

      {equipment.length === 0 ? (
        <EmptyState
          title="No equipment yet"
          message="Cameras, recorders and other items the store sells will show up here."
        />
      ) : (
        <ul className="divide-y divide-zinc-200 rounded-lg border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-950">
          {equipment.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-3 p-4 text-base">
              <div>
                <p className="font-medium">
                  {item.name}
                  {item.is_active ? '' : ' (inactive)'}
                </p>
                <p className="text-zinc-500">
                  {item.sku} · {item.category} · {peso(item.sell_price)}
                </p>
              </div>
              <span
                className={item.stock_qty <= LOW_STOCK_THRESHOLD ? 'font-semibold text-red-600' : ''}
              >
                {item.stock_qty}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
