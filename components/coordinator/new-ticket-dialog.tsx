'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'

import { createTicket } from '@/lib/actions/tickets'
import { baguioZoneSchema } from '@/lib/validators'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/components/ui/toaster'

const SERVICE_CATEGORIES = ['Plumbing', 'Electrical', 'Roofing', 'Carpentry', 'Painting', 'General']

const newTicketSchema = z.object({
  customer_id: z.string().min(1, 'Choose a customer'),
  service_category: z.string().min(1, 'Choose a category'),
  issue_description: z.string().trim().min(1, 'Describe the issue'),
  zone: baguioZoneSchema,
})

type NewTicketValues = z.infer<typeof newTicketSchema>

export type CustomerOption = { id: string; full_name: string }

export function NewTicketDialog({ customers }: { customers: CustomerOption[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<NewTicketValues>({
    resolver: zodResolver(newTicketSchema),
    defaultValues: { customer_id: '', service_category: '', issue_description: '', zone: 'ZONE_1_CENTER' },
  })

  async function submit(values: NewTicketValues) {
    setPending(true)
    try {
      const result = await createTicket(values)
      if (!result.success) {
        toast({ title: 'Could not create ticket', description: result.error, variant: 'destructive' })
        return
      }
      toast({ title: 'Ticket created' })
      reset()
      setOpen(false)
      router.push(`/coordinator/tickets/${result.data?.id}`)
    } finally {
      setPending(false)
    }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        New ticket
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title="New ticket" className="max-w-lg">
        {customers.length === 0 ? (
          <p className="text-sm text-zinc-500">
            Add a customer first, then you can create a ticket for them.
          </p>
        ) : (
          <form onSubmit={handleSubmit(submit)} className="space-y-4" noValidate>
            <div className="space-y-2">
              <Label htmlFor="customer_id">Customer</Label>
              <Select id="customer_id" {...register('customer_id')}>
                <option value="">Select a customer…</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.full_name}
                  </option>
                ))}
              </Select>
              {errors.customer_id ? (
                <p className="text-sm text-red-600">{errors.customer_id.message}</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="service_category">Category</Label>
              <Select id="service_category" {...register('service_category')}>
                <option value="">Select a category…</option>
                {SERVICE_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </Select>
              {errors.service_category ? (
                <p className="text-sm text-red-600">{errors.service_category.message}</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="zone">Zone</Label>
              <Select id="zone" {...register('zone')}>
                <option value="ZONE_1_CENTER">Zone 1 — Center</option>
                <option value="ZONE_2_EAST">Zone 2 — East</option>
                <option value="ZONE_3_WEST">Zone 3 — West</option>
                <option value="ZONE_4_SOUTH">Zone 4 — South</option>
                <option value="ZONE_5_NORTH">Zone 5 — North</option>
                <option value="ZONE_6_PERIPHERAL">Zone 6 — Peripheral</option>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="issue_description">Issue</Label>
              <Textarea id="issue_description" rows={3} {...register('issue_description')} />
              {errors.issue_description ? (
                <p className="text-sm text-red-600">{errors.issue_description.message}</p>
              ) : null}
            </div>
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? 'Creating…' : 'Create ticket'}
            </Button>
          </form>
        )}
      </Dialog>
    </>
  )
}
