'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PackageCheck } from 'lucide-react'

import { dispenseTicketMaterials } from '@/lib/actions/inventory'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/toaster'

export type PickListItem = {
  material_id: string
  name: string
  quantity_used: number
  dispensed: boolean
  stock_qty: number
}

export function PickList({
  ticketId,
  customerName,
  scheduledLabel,
  items,
}: {
  ticketId: string
  customerName: string | null
  scheduledLabel: string | null
  items: PickListItem[]
}) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const allDispensed = items.length > 0 && items.every((item) => item.dispensed)

  async function dispense() {
    setPending(true)
    try {
      const result = await dispenseTicketMaterials({ ticket_id: ticketId })
      if (!result.success) {
        toast({ title: 'Could not dispense', description: result.error, variant: 'destructive' })
        return
      }
      toast({ title: 'Stock updated' })
      router.refresh()
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-base font-semibold">{customerName ?? 'Unknown customer'}</p>
          {scheduledLabel ? <p className="text-base text-zinc-500">{scheduledLabel}</p> : null}
        </div>
        {allDispensed ? (
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-base text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
            Dispensed
          </span>
        ) : (
          <Button className="h-12 text-base" onClick={dispense} disabled={pending}>
            <PackageCheck className="h-5 w-5" />
            {pending ? 'Updating…' : 'DISPENSED'}
          </Button>
        )}
      </div>

      {items.length === 0 ? (
        <p className="mt-3 text-base text-zinc-500">No materials on this pick-list.</p>
      ) : (
        <ul className="mt-3 space-y-2 text-base">
          {items.map((item) => (
            <li key={item.material_id} className="flex items-center justify-between gap-3">
              <span className={item.dispensed ? 'text-zinc-400 line-through' : ''}>{item.name}</span>
              <span
                className={
                  item.quantity_used > item.stock_qty ? 'font-medium text-red-600' : 'text-zinc-500'
                }
              >
                × {item.quantity_used} (stock {item.stock_qty})
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
