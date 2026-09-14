'use client'

import { useRouter } from 'next/navigation'

import { quoteTicket } from '@/lib/actions/tickets'
import { Dialog } from '@/components/ui/dialog'
import { toast } from '@/components/ui/toaster'
import {
  PriceCalculator,
  type MaterialOption,
  type QuoteInput,
  type ServiceOption,
} from '@/components/tickets/price-calculator'
import { TechAssignment, type TechOption } from '@/components/tickets/tech-assignment'
import { CancelForm, PaymentForm, ScheduleForm } from '@/components/tickets/transition-forms'
import type { TicketStatus } from '@/lib/ticket-state'

const TITLES: Partial<Record<TicketStatus, string>> = {
  QUOTED: 'Submit quote',
  SCHEDULED: 'Schedule job',
  DISPATCHED: 'Assign technician',
  PAID: 'Confirm payment',
  CANCELLED: 'Cancel ticket',
}

export function TransitionDialog({
  open,
  onClose,
  ticketId,
  targetStatus,
  services,
  materials,
  techs,
}: {
  open: boolean
  onClose: () => void
  ticketId: string
  targetStatus: TicketStatus | null
  services: ServiceOption[]
  materials: MaterialOption[]
  techs: TechOption[]
}) {
  const router = useRouter()

  function done() {
    onClose()
    router.refresh()
  }

  async function handleQuote(input: QuoteInput) {
    const result = await quoteTicket({ ticket_id: ticketId, ...input })
    if (!result.success) {
      toast({ title: 'Could not save quote', description: result.error, variant: 'destructive' })
      return
    }
    toast({ title: 'Quote saved' })
    done()
  }

  if (!targetStatus) return null

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={TITLES[targetStatus] ?? 'Update ticket'}
      className="max-w-lg"
    >
      {targetStatus === 'QUOTED' ? (
        <PriceCalculator services={services} materials={materials} onSubmit={handleQuote} />
      ) : null}
      {targetStatus === 'SCHEDULED' ? <ScheduleForm ticketId={ticketId} onDone={done} /> : null}
      {targetStatus === 'DISPATCHED' ? (
        <TechAssignment ticketId={ticketId} availableTechs={techs} onDone={done} />
      ) : null}
      {targetStatus === 'PAID' ? <PaymentForm ticketId={ticketId} onDone={done} /> : null}
      {targetStatus === 'CANCELLED' ? <CancelForm ticketId={ticketId} onDone={done} /> : null}
    </Dialog>
  )
}
