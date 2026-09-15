import { LOW_STOCK_THRESHOLD } from '@/lib/constants'
import { createServerClient } from '@/lib/supabase-client'
import { formatShopTime, shopDayRange } from '@/lib/time'
import { EmptyState } from '@/components/ui/empty-state'
import { PickList, type PickListItem } from '@/components/store/pick-list'

export const dynamic = 'force-dynamic'

type PickTicket = { status: string; scheduled_start: string | null }

function pickListLabel(ticket: PickTicket): string | null {
  if (ticket.status === 'IN_PROGRESS') return 'Job in progress — extra materials'
  return ticket.scheduled_start ? formatShopTime(ticket.scheduled_start, 'HH:mm') : null
}

export default async function StorePage() {
  const supabase = await createServerClient()
  const { start, end } = shopDayRange()

  const [scheduledResult, inProgressResult, materialsResult] = await Promise.all([
    supabase
      .from('tickets')
      .select('id,status,service_category,scheduled_start,customers(full_name)')
      .in('status', ['SCHEDULED', 'DISPATCHED'])
      .gte('scheduled_start', start.toISOString())
      .lt('scheduled_start', end.toISOString())
      .order('scheduled_start'),
    // A job already under way only shows while an approved change order still
    // has materials to hand over.
    supabase
      .from('tickets')
      .select('id,status,service_category,scheduled_start,customers(full_name)')
      .eq('status', 'IN_PROGRESS')
      .order('scheduled_start'),
    supabase.from('materials').select('id,name,stock_qty').order('name'),
  ])

  const scheduled = scheduledResult.data ?? []
  const inProgress = inProgressResult.data ?? []
  const materials = materialsResult.data ?? []
  const stockById = new Map(materials.map((material) => [material.id, material.stock_qty]))
  const lowStock = materials.filter((material) => material.stock_qty <= LOW_STOCK_THRESHOLD)

  let lines: {
    ticket_id: string
    material_id: string
    quantity_used: number
    dispensed_qty: number
    materials: { name: string } | null
  }[] = []

  const ticketIds = [...scheduled, ...inProgress].map((ticket) => ticket.id)
  if (ticketIds.length > 0) {
    const { data } = await supabase
      .from('ticket_materials')
      .select('ticket_id,material_id,quantity_used,dispensed_qty,materials(name)')
      .in('ticket_id', ticketIds)
    lines = data ?? []
  }

  const hasMaterialsToHandOver = (ticketId: string) =>
    lines.some((line) => line.ticket_id === ticketId && line.quantity_used > line.dispensed_qty)
  const tickets = [...scheduled, ...inProgress.filter((ticket) => hasMaterialsToHandOver(ticket.id))]

  return (
    <div className="mx-auto w-full max-w-2xl space-y-5 px-4 py-5">
      <h1 className="text-lg font-semibold">Today&apos;s pick-lists</h1>

      {lowStock.length > 0 ? (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-base text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100">
          <p className="font-semibold">Low stock</p>
          <p className="mt-1">
            {lowStock.map((material) => `${material.name} (${material.stock_qty})`).join(', ')}
          </p>
        </div>
      ) : null}

      {tickets.length === 0 ? (
        <EmptyState title="No pick-lists today" message="Scheduled jobs for today will appear here." />
      ) : (
        <div className="space-y-4">
          {tickets.map((ticket) => {
            const items: PickListItem[] = lines
              .filter((line) => line.ticket_id === ticket.id)
              .map((line) => ({
                material_id: line.material_id,
                name: line.materials?.name ?? 'Material',
                quantity_used: line.quantity_used,
                remaining: Math.max(0, line.quantity_used - line.dispensed_qty),
                stock_qty: stockById.get(line.material_id) ?? 0,
              }))
            return (
              <PickList
                key={ticket.id}
                ticketId={ticket.id}
                customerName={ticket.customers?.full_name ?? null}
                scheduledLabel={pickListLabel(ticket)}
                items={items}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
