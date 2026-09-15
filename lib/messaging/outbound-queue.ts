import {
  OUTBOUND_BATCH_SIZE,
  OUTBOUND_MAX_ATTEMPTS,
  OUTBOUND_RETRY_MS,
} from '@/lib/constants'
import { deliverOnce, type MessageChannel } from '@/lib/messaging/send'
import { createAdminClient } from '@/lib/supabase-client'

export type DrainSummary = {
  /** Rows that were due this run. */
  considered: number
  sent: number
  /** Failed again, waiting for the next run. */
  rescheduled: number
  /** Hit the attempt ceiling (or an unusable row) and stopped retrying. */
  exhausted: number
}

function isChannel(value: string): value is MessageChannel {
  return value === 'messenger' || value === 'viber'
}

/**
 * Retry queued outbound messages (docs/04-integrations.md §Failure Handling).
 *
 * Uses the service-role client because outbound_queue has no UPDATE policy.
 * One attempt per row per run — the 15-minute schedule IS the backoff, so this
 * deliberately calls deliverOnce rather than sendMessage (which would retry
 * again and, on failure, enqueue a second copy of the same message).
 */
export async function drainOutboundQueue(): Promise<DrainSummary> {
  const admin = createAdminClient()

  const { data: rows, error } = await admin
    .from('outbound_queue')
    .select('*')
    .eq('status', 'PENDING')
    .lte('next_attempt_at', new Date().toISOString())
    .order('next_attempt_at', { ascending: true })
    .limit(OUTBOUND_BATCH_SIZE)

  if (error || !rows) throw new Error(error?.message ?? 'Could not read the outbound queue')

  const summary: DrainSummary = {
    considered: rows.length,
    sent: 0,
    rescheduled: 0,
    exhausted: 0,
  }

  for (const row of rows) {
    // The column is a free string in the generated types; the CHECK constraint
    // only allows the two channels, so an unknown value means real corruption.
    if (!isChannel(row.channel)) {
      await admin
        .from('outbound_queue')
        .update({ status: 'FAILED', last_error: `unsupported channel: ${row.channel}` })
        .eq('id', row.id)
      summary.exhausted += 1
      continue
    }

    const result = await deliverOnce(row.channel, row.recipient_id, row.body)

    if (result.ok) {
      await admin
        .from('outbound_queue')
        .update({ status: 'SENT', sent_at: new Date().toISOString(), last_error: null })
        .eq('id', row.id)
      summary.sent += 1
      continue
    }

    const attempts = row.attempts + 1
    const giveUp = attempts >= OUTBOUND_MAX_ATTEMPTS

    await admin
      .from('outbound_queue')
      .update({
        attempts,
        last_error: (result.error ?? 'unknown error').slice(0, 500),
        status: giveUp ? 'FAILED' : 'PENDING',
        next_attempt_at: new Date(Date.now() + OUTBOUND_RETRY_MS).toISOString(),
      })
      .eq('id', row.id)

    if (giveUp) summary.exhausted += 1
    else summary.rescheduled += 1
  }

  return summary
}
