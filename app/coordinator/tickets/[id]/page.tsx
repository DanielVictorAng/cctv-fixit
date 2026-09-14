import { format } from 'date-fns'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

import { getSessionContext } from '@/lib/auth'
import { createAdminClient, createServerClient } from '@/lib/supabase-client'
import { StatusBadge } from '@/components/ui/status-badge'
import { TicketActions } from '@/components/coordinator/ticket-actions'
import type { MaterialOption, ServiceOption } from '@/components/tickets/price-calculator'
import type { TechOption } from '@/components/tickets/tech-assignment'

export const dynamic = 'force-dynamic'

export default async function TicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createServerClient()
  const { profile } = await getSessionContext()
  if (!profile) notFound()

  const [ticketResult, servicesResult, materialsResult] = await Promise.all([
    supabase.from('tickets').select('*, customers(*)').eq('id', id).single(),
    supabase.from('services').select('id,name,base_labour_price').order('name'),
    supabase.from('materials').select('id,name,cost_price').order('name'),
  ])

  const ticket = ticketResult.data
  if (!ticket) notFound()

  const admin = createAdminClient()
  const { data: techRows } = await admin
    .from('profiles')
    .select('id,full_name')
    .eq('role', 'TECHNICIAN')
    .eq('is_active', true)
    .order('full_name')

  const customer = ticket.customers

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6">
      <Link
        href="/coordinator"
        className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to board
      </Link>

      <div className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold">{customer?.full_name ?? 'Unknown customer'}</h1>
            <p className="text-sm text-zinc-500">
              {ticket.service_category} · {ticket.zone.replace(/_/g, ' ')}
            </p>
          </div>
          <StatusBadge status={ticket.status} />
        </div>

        <dl className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-zinc-500">Phone</dt>
            <dd>{customer?.phone_number ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Address</dt>
            <dd>{customer?.default_address ?? '—'}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-zinc-500">Issue</dt>
            <dd className="whitespace-pre-wrap">{ticket.issue_description}</dd>
          </div>
          {ticket.scheduled_start ? (
            <div className="sm:col-span-2">
              <dt className="text-zinc-500">Scheduled</dt>
              <dd>{format(new Date(ticket.scheduled_start), 'PPP p')}</dd>
            </div>
          ) : null}
        </dl>

        <div className="mt-4 grid grid-cols-3 gap-3 border-t border-zinc-200 pt-4 text-sm dark:border-zinc-800">
          <div>
            <dt className="text-zinc-500">Labour</dt>
            <dd>₱{Number(ticket.quoted_labour).toLocaleString()}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Materials</dt>
            <dd>₱{Number(ticket.quoted_materials).toLocaleString()}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Total</dt>
            <dd className="font-semibold">₱{Number(ticket.final_total).toLocaleString()}</dd>
          </div>
        </div>

        {ticket.downpayment_amount ? (
          <p className="mt-3 text-xs text-zinc-500">
            Downpayment required: ₱{Number(ticket.downpayment_amount).toLocaleString()}
          </p>
        ) : null}
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="mb-3 text-sm font-semibold">Actions</h2>
        <TicketActions
          ticketId={ticket.id}
          status={ticket.status}
          role={profile.role}
          services={(servicesResult.data ?? []) as ServiceOption[]}
          materials={(materialsResult.data ?? []) as MaterialOption[]}
          techs={(techRows ?? []) as TechOption[]}
        />
      </div>
    </div>
  )
}
