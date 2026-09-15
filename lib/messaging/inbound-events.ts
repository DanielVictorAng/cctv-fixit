import { INBOUND_EVENT_RETENTION_MS } from '@/lib/constants'
import type { MessageChannel } from '@/lib/messaging/send'
import { createAdminClient } from '@/lib/supabase-client'

/** Postgres unique-violation. */
const UNIQUE_VIOLATION = '23505'

/**
 * Claim a platform message id (docs/01-schema.md §inbound_events).
 *
 * True means this delivery is ours to process. False means we already handled
 * that id — which is what stops a Meta/Viber re-delivery from opening a second
 * ticket or sending a second auto-reply.
 *
 * Fails OPEN on an unexpected error. Losing a customer's message is worse than
 * answering it twice, so a broken guard must never block delivery.
 */
export async function claimInboundEvent(
  channel: MessageChannel,
  messageId: string
): Promise<boolean> {
  try {
    const admin = createAdminClient()
    const { error } = await admin
      .from('inbound_events')
      .insert({ channel, message_id: messageId })

    if (error) {
      if (error.code === UNIQUE_VIOLATION) return false
      console.error('[inbound-events] claim failed, processing anyway', error.message)
      return true
    }
    return true
  } catch (error) {
    console.error('[inbound-events] claim crashed, processing anyway', error)
    return true
  }
}

/**
 * Give the claim back after a failed intake, so the platform's retry can still
 * be handled. Without this a transient DB error would silently swallow the
 * message forever.
 */
export async function releaseInboundEvent(
  channel: MessageChannel,
  messageId: string
): Promise<void> {
  try {
    const admin = createAdminClient()
    await admin
      .from('inbound_events')
      .delete()
      .eq('channel', channel)
      .eq('message_id', messageId)
  } catch (error) {
    console.error('[inbound-events] release failed', error)
  }
}

/** Drop events past the retention window. Called by the cron drain. */
export async function pruneInboundEvents(): Promise<number> {
  const cutoff = new Date(Date.now() - INBOUND_EVENT_RETENTION_MS).toISOString()
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('inbound_events')
    .delete()
    .lt('received_at', cutoff)
    .select('id')

  if (error) throw new Error(error.message)
  return data?.length ?? 0
}
