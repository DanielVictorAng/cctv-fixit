'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, X } from 'lucide-react'

import { approveChangeOrder, rejectChangeOrder } from '@/lib/actions/change-orders'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/toaster'
import type { Database } from '@/lib/types'

type ChangeOrderStatus = Database['public']['Enums']['change_order_status']

export type ChangeOrderView = {
  id: string
  new_description: string
  additional_labour: number
  additional_materials: unknown
  status: ChangeOrderStatus
  created_label: string
}

export type ChangeOrderMaterialOption = { id: string; name: string }

type ParsedLine = { material_id: string; quantity: number; unit_cost: number }

function parseLines(value: unknown): ParsedLine[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((entry) => {
    if (typeof entry !== 'object' || entry === null) return []
    const record = entry as Record<string, unknown>
    const materialId = typeof record.material_id === 'string' ? record.material_id : null
    const quantity = typeof record.quantity === 'number' ? record.quantity : null
    const unitCost = typeof record.unit_cost === 'number' ? record.unit_cost : null
    if (!materialId || quantity === null || unitCost === null) return []
    return [{ material_id: materialId, quantity, unit_cost: unitCost }]
  })
}

export function ChangeOrderReview({
  orders,
  materials,
}: {
  orders: ChangeOrderView[]
  materials: ChangeOrderMaterialOption[]
}) {
  const router = useRouter()
  const [pending, setPending] = useState<string | null>(null)

  async function resolve(id: string, approve: boolean) {
    setPending(id)
    try {
      const result = approve ? await approveChangeOrder({ id }) : await rejectChangeOrder({ id })
      if (!result.success) {
        toast({ title: 'Could not resolve', description: result.error, variant: 'destructive' })
        return
      }
      toast({ title: approve ? 'Change order approved' : 'Change order rejected' })
      router.refresh()
    } finally {
      setPending(null)
    }
  }

  if (orders.length === 0) {
    return <p className="text-sm text-zinc-500">No change orders.</p>
  }

  return (
    <div className="space-y-3">
      {orders.map((order) => {
        const lines = parseLines(order.additional_materials)
        return (
          <div
            key={order.id}
            className="rounded-md border border-zinc-200 p-3 text-sm dark:border-zinc-800"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium">{order.status}</span>
              <span className="text-xs text-zinc-500">{order.created_label}</span>
            </div>
            <p className="mt-1 whitespace-pre-wrap">{order.new_description}</p>
            <p className="mt-2 text-zinc-500">
              Additional labour: ₱{order.additional_labour.toLocaleString()}
            </p>
            {lines.length > 0 ? (
              <ul className="mt-1 list-inside list-disc text-zinc-500">
                {lines.map((line, index) => {
                  const material = materials.find((m) => m.id === line.material_id)
                  return (
                    <li key={index}>
                      {material?.name ?? 'Material'} × {line.quantity} (₱{line.unit_cost} each)
                    </li>
                  )
                })}
              </ul>
            ) : null}
            {order.status === 'PENDING' ? (
              <div className="mt-3 flex gap-2">
                <Button size="sm" onClick={() => resolve(order.id, true)} disabled={pending === order.id}>
                  <Check className="h-4 w-4" />
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => resolve(order.id, false)}
                  disabled={pending === order.id}
                >
                  <X className="h-4 w-4" />
                  Reject
                </Button>
              </div>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}
