'use client'

import { useMemo, useState } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Trash2 } from 'lucide-react'

import { calculateQuote, SURCHARGES, type SurchargeType } from '@/lib/pricing'
import { surchargeSchema } from '@/lib/validators'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'

export type ServiceOption = { id: string; name: string; base_labour_price: number }
export type MaterialOption = { id: string; name: string; cost_price: number }

export type QuoteInput = {
  base_labour: number
  material_costs: number[]
  surcharges: SurchargeType[]
}

const amountField = z
  .string()
  .trim()
  .min(1, 'Required')
  .refine((v) => !Number.isNaN(Number(v)) && Number(v) >= 0, 'Enter a valid amount')

const quoteFormSchema = z.object({
  service_id: z.string(),
  base_labour: amountField,
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
  surcharges: z.array(surchargeSchema),
})

type QuoteFormValues = z.infer<typeof quoteFormSchema>

export function PriceCalculator({
  services,
  materials,
  onSubmit,
}: {
  services: ServiceOption[]
  materials: MaterialOption[]
  onSubmit: (input: QuoteInput) => Promise<void> | void
}) {
  const [pending, setPending] = useState(false)
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    formState: { errors },
  } = useForm<QuoteFormValues>({
    resolver: zodResolver(quoteFormSchema),
    defaultValues: { service_id: '', base_labour: '0', materials: [], surcharges: [] },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'materials' })
  const watched = watch()

  const preview = useMemo(() => {
    const costs = (watched.materials ?? []).map((row) => {
      const material = materials.find((m) => m.id === row.material_id)
      return material ? material.cost_price * (Number(row.quantity) || 0) : 0
    })
    return calculateQuote({
      baseLabour: Number(watched.base_labour) || 0,
      materialCosts: costs,
      surcharges: (watched.surcharges ?? []) as SurchargeType[],
    })
  }, [watched, materials])

  async function submit(values: QuoteFormValues) {
    const costs = values.materials.map((row) => {
      const material = materials.find((m) => m.id === row.material_id)
      return material ? material.cost_price * Number(row.quantity) : 0
    })
    setPending(true)
    try {
      await onSubmit({
        base_labour: Number(values.base_labour),
        material_costs: costs,
        surcharges: values.surcharges,
      })
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-4" noValidate>
      <div className="space-y-2">
        <Label htmlFor="service">Service</Label>
        <Select
          id="service"
          {...register('service_id', {
            onChange: (event: React.ChangeEvent<HTMLSelectElement>) => {
              const service = services.find((s) => s.id === event.target.value)
              if (service) setValue('base_labour', String(service.base_labour_price))
            },
          })}
        >
          <option value="">Select a service…</option>
          {services.map((service) => (
            <option key={service.id} value={service.id}>
              {service.name} — ₱{service.base_labour_price}
            </option>
          ))}
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="base_labour">Labour (₱)</Label>
        <Input id="base_labour" inputMode="decimal" {...register('base_labour')} />
        {errors.base_labour ? (
          <p className="text-sm text-red-600">{errors.base_labour.message}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Materials</Label>
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
          <p className="text-sm text-zinc-500">No materials added yet.</p>
        ) : (
          <div className="space-y-2">
            {fields.map((field, index) => (
              <div key={field.id} className="flex items-start gap-2">
                <div className="flex-1">
                  <Select {...register(`materials.${index}.material_id`)}>
                    <option value="">Select material…</option>
                    {materials.map((material) => (
                      <option key={material.id} value={material.id}>
                        {material.name} (cost ₱{material.cost_price})
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

      <div className="space-y-2">
        <Label>Surcharges</Label>
        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(SURCHARGES) as SurchargeType[]).map((key) => (
            <label key={key} className="flex items-center gap-2 text-sm">
              <input type="checkbox" value={key} {...register('surcharges')} />
              {key.replace(/_/g, ' ')} (+₱{SURCHARGES[key]})
            </label>
          ))}
        </div>
      </div>

      <div className="rounded-md bg-zinc-100 p-3 text-sm dark:bg-zinc-900">
        <div className="flex justify-between">
          <span>Labour</span>
          <span>₱{preview.quoted_labour.toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span>Materials (×1.20)</span>
          <span>₱{preview.quoted_materials.toLocaleString()}</span>
        </div>
        <div className="mt-1 flex justify-between border-t border-zinc-300 pt-1 font-semibold dark:border-zinc-700">
          <span>Total</span>
          <span>₱{preview.final_total.toLocaleString()}</span>
        </div>
        {preview.downpayment_amount ? (
          <p className="mt-1 text-xs text-zinc-500">
            50% downpayment required: ₱{preview.downpayment_amount.toLocaleString()}
          </p>
        ) : null}
      </div>

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? 'Saving quote…' : 'Save quote'}
      </Button>
    </form>
  )
}
