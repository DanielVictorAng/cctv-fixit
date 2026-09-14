import { format } from 'date-fns'

import { createServerClient } from '@/lib/supabase-client'
import { EmptyState } from '@/components/ui/empty-state'
import { KanbanBoard } from '@/components/coordinator/kanban-board'
import { NewTicketDialog, type CustomerOption } from '@/components/coordinator/new-ticket-dialog'
import type { KanbanTicket } from '@/components/tickets/ticket-card'
import type { MaterialOption, ServiceOption } from '@/components/tickets/price-calculator'
import type { TechOption } from '@/components/tickets/tech-assignment'

export const dynamic = 'force-dynamic'

export default async function CoordinatorPage() {
  const supabase = await createServerClient()

  const [ticketsResult, servicesResult, materialsResult, customersResult] = await Promise.all([
    supabase
      .from('tickets')
      .select('id,status,service_category,zone,scheduled_start,final_total,customers(full_name)')
      .order('created_at', { ascending: false }),
    supabase.from('services').select('id,name,base_labour_price').order('name'),
    supabase.from('materials').select('id,name,cost_price').order('name'),
    supabase.from('customers').select('id,full_name').order('full_name'),
  ])

  const { data: techRows } = await supabase
    .from('profiles')
    .select('id,full_name')
    .eq('role', 'TECHNICIAN')
    .eq('is_active', true)
    .order('full_name')

  const tickets: KanbanTicket[] = (ticketsResult.data ?? []).map((t) => ({
    id: t.id,
    status: t.status,
    service_category: t.service_category,
    zone: t.zone,
    customer_name: t.customers?.full_name ?? null,
    scheduled_label: t.scheduled_start ? format(new Date(t.scheduled_start), 'MMM d, HH:mm') : null,
    final_total: Number(t.final_total),
  }))

  const customers: CustomerOption[] = (customersResult.data ?? []).map((c) => ({
    id: c.id,
    full_name: c.full_name,
  }))

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Ticket board</h1>
        <NewTicketDialog customers={customers} />
      </div>

      {tickets.length === 0 ? (
        <EmptyState
          title="No tickets yet"
          message="Create your first ticket to start quoting and dispatching jobs."
          action={<NewTicketDialog customers={customers} />}
        />
      ) : (
        <KanbanBoard
          tickets={tickets}
          services={(servicesResult.data ?? []) as ServiceOption[]}
          materials={(materialsResult.data ?? []) as MaterialOption[]}
          techs={(techRows ?? []) as TechOption[]}
        />
      )}
    </div>
  )
}
