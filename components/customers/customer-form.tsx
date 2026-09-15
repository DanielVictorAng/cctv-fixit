'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'

import { createCustomer, updateCustomer } from '@/lib/actions/customers'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from '@/components/ui/toaster'

export type EditableCustomer = {
  id: string
  full_name: string
  phone_number: string | null
  address: string | null
  fb_messenger_id: string | null
  viber_id: string | null
}

const customerFormSchema = z.object({
  full_name: z.string().trim().min(1, 'Name is required'),
  phone_number: z.string(),
  address: z.string(),
  fb_messenger_id: z.string(),
  viber_id: z.string(),
})

type CustomerFormValues = z.infer<typeof customerFormSchema>

const EMPTY: CustomerFormValues = {
  full_name: '',
  phone_number: '',
  address: '',
  fb_messenger_id: '',
  viber_id: '',
}

export function CustomerFormDialog({
  open,
  onClose,
  customer,
}: {
  open: boolean
  onClose: () => void
  customer: EditableCustomer | null
}) {
  const router = useRouter()
  const [pending, setPending] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CustomerFormValues>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: EMPTY,
  })

  useEffect(() => {
    if (!open) return
    reset(
      customer
        ? {
            full_name: customer.full_name,
            phone_number: customer.phone_number ?? '',
            address: customer.address ?? '',
            fb_messenger_id: customer.fb_messenger_id ?? '',
            viber_id: customer.viber_id ?? '',
          }
        : EMPTY
    )
  }, [open, customer, reset])

  async function submit(values: CustomerFormValues) {
    const payload = {
      full_name: values.full_name,
      phone_number: values.phone_number || null,
      address: values.address || null,
      fb_messenger_id: values.fb_messenger_id || null,
      viber_id: values.viber_id || null,
    }

    setPending(true)
    try {
      const result = customer
        ? await updateCustomer({ id: customer.id, ...payload })
        : await createCustomer(payload)
      if (!result.success) {
        toast({ title: 'Could not save customer', description: result.error, variant: 'destructive' })
        return
      }
      toast({ title: customer ? 'Customer updated' : 'Customer created' })
      onClose()
      router.refresh()
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={customer ? 'Edit customer' : 'New customer'}
      className="max-w-lg"
    >
      <form onSubmit={handleSubmit(submit)} className="space-y-4" noValidate>
        <div className="space-y-2">
          <Label htmlFor="full_name">Full name</Label>
          <Input id="full_name" {...register('full_name')} />
          {errors.full_name ? <p className="text-sm text-red-600">{errors.full_name.message}</p> : null}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="phone_number">Phone</Label>
            <Input id="phone_number" inputMode="tel" {...register('phone_number')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Input id="address" {...register('address')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fb_messenger_id">Messenger ID</Label>
            <Input id="fb_messenger_id" {...register('fb_messenger_id')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="viber_id">Viber ID</Label>
            <Input id="viber_id" {...register('viber_id')} />
          </div>
        </div>

        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? 'Saving…' : customer ? 'Save changes' : 'Create customer'}
        </Button>
      </form>
    </Dialog>
  )
}
