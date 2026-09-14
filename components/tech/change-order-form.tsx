'use client'

import { useState } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { Plus, Trash2 } from 'lucide-react'

import { requestChangeOrder } from '@/lib/actions/change-orders'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/components/ui/toaster'

export type ChangeOrderMaterial = { id: string; name: string; cost_price: number }

const amountField = (message: string) =>
  z
    .string()
    .trim()
    .min(1, 'Required')
    .refine((v) => !Number.isNaN(Number(v)) && Number(v) >= 0, message)

const changeOrderSchema = z.object({
  new_description: z.string().trim().min(1, 'Describe the extra work'),
  additional_labour: amountField('Enter a valid amount'),
  materials: z.array(
    z.object({
      material_id: z.string().min(1, 'Pick a material'),
      quantity: z
        .string()
        .trim()
        .min(1, 'Required')
        .refine((v) => Number.isInteger(Number(v)) && Number(v) > 0, 'Qty must be 1+'),
    })
  ),
})

type ChangeOrderValues = z.infer<typeof changeOrderSchema>

export function ChangeOrderForm({
  ticketId,
  materials,
  onDone,
}: {
  ticketId: string
  materials: ChangeOrderMaterial[]
  onDone: () => void
}) {
  const router = useRouter()
  const [pending, setPending] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<ChangeOrderValues>({
    resolver: zodResolver(changeOrderSchema),
    defaultValues: { new_description: '', additional_labour: '0', materials: [] },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'materials' })

  async function submit(values: ChangeOrderValues) {
    const lines = values.materials.map((row) => {
      const material = materials.find((m) => m.id === row.material_id)
      return {
        material_id: row.material_id,
        quantity: Number(row.quantity),
        unit_cost: material?.cost_price ?? 0,
      }
    })

    setPending(true)
    try {
      const result = await requestChangeOrder({
        ticket_id: ticketId,
        new_description: values.new_description,
        additional_labour: Number(values.additional_labour),
        additional_materials: lines,
      })
      if (!result.success) {
        toast({ title: 'Could not submit', description: result.error, variant: 'destructive' })
        return
      }
      toast({ title: 'Change order sent to the coordinator' })
      reset()
      onDone()
      router.refresh()
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-4" noValidate>
      <div className="space-y-2">
        <Label htmlFor="new_description">Extra work</Label>
        <Textarea id="new_description" rows={3} {...register('new_description')} />
        {errors.new_description ? (
          <p className="text-sm text-red-600">{errors.new_description.message}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="additional_labour">Additional labour (₱)</Label>
        <Input id="additional_labour" inputMode="decimal" {...register('additional_labour')} />
        {errors.additional_labour ? (
          <p className="text-sm text-red-600">{errors.additional_labour.message}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Extra materials</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => append({ material_id: '', quantity: '1' })}
          >
            <Plus className="h-4 w-4" />
            Add
          </Button>
        </div>
        {fields.length === 0 ? (
          <p className="text-sm text-zinc-500">No extra materials.</p>
        ) : (
          <div className="space-y-2">
            {fields.map((field, index) => (
              <div key={field.id} className="flex items-start gap-2">
                <div className="flex-1">
                  <Select {...register(`materials.${index}.material_id`)}>
                    <option value="">Select material…</option>
                    {materials.map((material) => (
                      <option key={material.id} value={material.id}>
                        {material.name}
                      </option>
                    ))}
                  </Select>
                </div>
                <Input
                  className="w-20"
                  inputMode="numeric"
                  placeholder="Qty"
                  {...register(`materials.${index}.quantity`)}
                />
                <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <Button type="submit" className="h-12 w-full" disabled={pending}>
        {pending ? 'Sending…' : 'Request change order'}
      </Button>
    </form>
  )
}
