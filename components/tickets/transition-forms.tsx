'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

import { cancelTicket, confirmPayment, scheduleTicket } from '@/lib/actions/tickets'
import { shopInputToIso } from '@/lib/time'
import { paymentMethodSchema } from '@/lib/validators'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/components/ui/toaster'

// --- Schedule ------------------------------------------------------------

const scheduleSchema = z.object({
  scheduled_start: z.string().min(1, 'Start time is required'),
  scheduled_end: z.string(),
})
type ScheduleValues = z.infer<typeof scheduleSchema>

export function ScheduleForm({ ticketId, onDone }: { ticketId: string; onDone: () => void }) {
  const [pending, setPending] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ScheduleValues>({
    resolver: zodResolver(scheduleSchema),
    defaultValues: { scheduled_start: '', scheduled_end: '' },
  })

  async function submit(values: ScheduleValues) {
    setPending(true)
    try {
      const result = await scheduleTicket({
        ticket_id: ticketId,
        scheduled_start: shopInputToIso(values.scheduled_start),
        scheduled_end: values.scheduled_end ? shopInputToIso(values.scheduled_end) : null,
      })
      if (!result.success) {
        toast({ title: 'Could not schedule', description: result.error, variant: 'destructive' })
        return
      }
      toast({ title: 'Ticket scheduled' })
      onDone()
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-4" noValidate>
      <div className="space-y-2">
        <Label htmlFor="scheduled_start">Start (Philippine time)</Label>
        <Input id="scheduled_start" type="datetime-local" {...register('scheduled_start')} />
        {errors.scheduled_start ? (
          <p className="text-sm text-red-600">{errors.scheduled_start.message}</p>
        ) : null}
      </div>
      <div className="space-y-2">
        <Label htmlFor="scheduled_end">End (optional)</Label>
        <Input id="scheduled_end" type="datetime-local" {...register('scheduled_end')} />
      </div>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? 'Scheduling…' : 'Schedule'}
      </Button>
    </form>
  )
}

// --- Payment -------------------------------------------------------------

const paymentSchema = z.object({ payment_method: paymentMethodSchema })
type PaymentValues = z.infer<typeof paymentSchema>

export function PaymentForm({ ticketId, onDone }: { ticketId: string; onDone: () => void }) {
  const [pending, setPending] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PaymentValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: { payment_method: 'CASH' },
  })

  async function submit(values: PaymentValues) {
    setPending(true)
    try {
      const result = await confirmPayment({ ticket_id: ticketId, payment_method: values.payment_method })
      if (!result.success) {
        toast({ title: 'Could not confirm', description: result.error, variant: 'destructive' })
        return
      }
      toast({ title: 'Payment confirmed' })
      onDone()
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-4" noValidate>
      <div className="space-y-2">
        <Label htmlFor="payment_method">Payment method</Label>
        <Select id="payment_method" {...register('payment_method')}>
          <option value="CASH">Cash</option>
          <option value="GCASH">GCash</option>
          <option value="MAYA">Maya</option>
          <option value="BANK_TRANSFER">Bank transfer</option>
        </Select>
        {errors.payment_method ? (
          <p className="text-sm text-red-600">Choose a payment method.</p>
        ) : null}
      </div>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? 'Confirming…' : 'Confirm payment'}
      </Button>
    </form>
  )
}

// --- Cancel --------------------------------------------------------------

const cancelSchema = z.object({ reason: z.string().trim().min(1, 'A reason is required') })
type CancelValues = z.infer<typeof cancelSchema>

export function CancelForm({ ticketId, onDone }: { ticketId: string; onDone: () => void }) {
  const [pending, setPending] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CancelValues>({
    resolver: zodResolver(cancelSchema),
    defaultValues: { reason: '' },
  })

  async function submit(values: CancelValues) {
    setPending(true)
    try {
      const result = await cancelTicket({ ticket_id: ticketId, reason: values.reason })
      if (!result.success) {
        toast({ title: 'Could not cancel', description: result.error, variant: 'destructive' })
        return
      }
      toast({ title: 'Ticket cancelled' })
      onDone()
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-4" noValidate>
      <div className="space-y-2">
        <Label htmlFor="reason">Reason</Label>
        <Textarea id="reason" rows={3} {...register('reason')} />
        {errors.reason ? <p className="text-sm text-red-600">{errors.reason.message}</p> : null}
      </div>
      <Button type="submit" variant="destructive" className="w-full" disabled={pending}>
        {pending ? 'Cancelling…' : 'Cancel ticket'}
      </Button>
    </form>
  )
}
