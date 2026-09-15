import { createAdminClient } from '@/lib/supabase-client'
import type { Database } from '@/lib/types'

export type MessageChannel = 'messenger' | 'viber'

export type InboundMessage = {
  channel: MessageChannel
  senderId: string
  text: string
  phoneNumber?: string | null
  /** Platform display name. Viber sends one; Messenger's webhook does not. */
  senderName?: string | null
  category?: string | null
  attachments?: string[]
}

export type IntakeResult = {
  customerId: string
  customerName: string
  ticketId: string | null
  createdCustomer: boolean
  createdTicket: boolean
}

type CustomerRow = Database['public']['Tables']['customers']['Row']
type CustomerUpdate = Database['public']['Tables']['customers']['Update']

const DUPLICATE_WINDOW_MS = 24 * 60 * 60 * 1000
const CLOSED_STATUSES = ['CLOSED', 'CANCELLED', 'PAID']

/**
 * Inbound intake + duplicate prevention (docs/04-integrations.md).
 * Match order: phone_number → fb_messenger_id → viber_id.
 * Same customer with an open ticket in the last 24h → link, do not duplicate.
 */
export async function intakeInboundMessage(message: InboundMessage): Promise<IntakeResult> {
  const admin = createAdminClient()

  // 1. Match an existing customer.
  let customer: CustomerRow | null = null

  if (message.phoneNumber) {
    const { data } = await admin
      .from('customers')
      .select('*')
      .eq('phone_number', message.phoneNumber)
      .maybeSingle()
    customer = data
  }
  if (!customer && message.channel === 'messenger') {
    const { data } = await admin
      .from('customers')
      .select('*')
      .eq('fb_messenger_id', message.senderId)
      .maybeSingle()
    customer = data
  }
  if (!customer && message.channel === 'viber') {
    const { data } = await admin
      .from('customers')
      .select('*')
      .eq('viber_id', message.senderId)
      .maybeSingle()
    customer = data
  }

  // 2. Create or enrich the customer.
  let createdCustomer = false
  if (!customer) {
    const { data, error } = await admin
      .from('customers')
      .insert({
        full_name:
          message.phoneNumber ??
          message.senderName ??
          `${message.channel} ${message.senderId}`,
        phone_number: message.phoneNumber ?? null,
        fb_messenger_id: message.channel === 'messenger' ? message.senderId : null,
        viber_id: message.channel === 'viber' ? message.senderId : null,
        // No phone number means we cannot cross-verify → coordinator reviews.
        possible_duplicate: !message.phoneNumber,
      })
      .select('*')
      .single()
    if (error || !data) throw new Error('Could not create the customer')
    customer = data
    createdCustomer = true
  } else {
    const patch: CustomerUpdate = {}
    if (message.channel === 'messenger' && !customer.fb_messenger_id) {
      patch.fb_messenger_id = message.senderId
    }
    if (message.channel === 'viber' && !customer.viber_id) {
      patch.viber_id = message.senderId
    }
    // Upgrade the auto-generated placeholder to a real name — but never touch a
    // name a coordinator has since edited.
    if (message.senderName && customer.full_name === `${message.channel} ${message.senderId}`) {
      patch.full_name = message.senderName
    }
    if (Object.keys(patch).length > 0) {
      await admin.from('customers').update(patch).eq('id', customer.id)
    }
  }

  // 3. Same issue within 24h on an open ticket → link instead of duplicating.
  const since = new Date(Date.now() - DUPLICATE_WINDOW_MS).toISOString()
  const { data: recentTickets } = await admin
    .from('tickets')
    .select('id,status')
    .eq('customer_id', customer.id)
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(10)

  const openTicket = (recentTickets ?? []).find(
    (ticket) => !CLOSED_STATUSES.includes(ticket.status)
  )

  if (openTicket) {
    return {
      customerId: customer.id,
      customerName: customer.full_name,
      ticketId: openTicket.id,
      createdCustomer,
      createdTicket: false,
    }
  }

  // 4. New ticket. Zone/category fall back until the coordinator triages.
  const { data: ticket, error: ticketError } = await admin
    .from('tickets')
    .insert({
      customer_id: customer.id,
      service_category: message.category ?? 'General',
      issue_description: message.text,
      zone: customer.zone ?? 'ZONE_1_CENTER',
      photo_urls: message.attachments ?? [],
    })
    .select('id')
    .single()

  return {
    customerId: customer.id,
    customerName: customer.full_name,
    ticketId: ticketError ? null : (ticket?.id ?? null),
    createdCustomer,
    createdTicket: !ticketError,
  }
}
