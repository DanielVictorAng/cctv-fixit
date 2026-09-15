import { createAdminClient } from '@/lib/supabase-client'

export type MessageChannel = 'messenger' | 'viber'

const MESSENGER_API = 'https://graph.facebook.com/v18.0/me/messages'
const VIBER_API = 'https://chatapi.viber.com/pa/send_message'
const BACKOFF_MS = [1000, 4000, 16000]

type Delivery = { ok: boolean; error?: string }

async function postJson(
  url: string,
  headers: Record<string, string>,
  body: unknown
): Promise<Delivery> {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
    })
    if (response.ok) return { ok: true }
    const detail = await response.text()
    return { ok: false, error: `${response.status} ${detail}`.slice(0, 500) }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'network error' }
  }
}

/** One delivery attempt, no retries and no queueing. Used by the queue drain. */
export async function deliverOnce(
  channel: MessageChannel,
  recipientId: string,
  body: string
): Promise<Delivery> {
  if (channel === 'messenger') {
    const token = process.env.MESSENGER_PAGE_ACCESS_TOKEN
    if (!token) return { ok: false, error: 'MESSENGER_PAGE_ACCESS_TOKEN is not configured' }
    return postJson(
      MESSENGER_API,
      { Authorization: `Bearer ${token}` },
      { recipient: { id: recipientId }, message: { text: body } }
    )
  }

  const token = process.env.VIBER_AUTH_TOKEN
  if (!token) return { ok: false, error: 'VIBER_AUTH_TOKEN is not configured' }
  return postJson(
    VIBER_API,
    { 'X-Viber-Auth-Token': token },
    { receiver: recipientId, type: 'text', text: body }
  )
}

/**
 * Outbound send with 3 retries (1s / 4s / 16s). On total failure the message is
 * queued and this resolves false — it never throws, so callers are not blocked.
 */
export async function sendMessage(
  channel: MessageChannel,
  recipientId: string,
  body: string,
  jobId?: string | null
): Promise<boolean> {
  let lastError = 'unknown error'

  for (let attempt = 0; attempt < BACKOFF_MS.length; attempt += 1) {
    const result = await deliverOnce(channel, recipientId, body)
    if (result.ok) return true
    lastError = result.error ?? 'unknown error'
    if (attempt < BACKOFF_MS.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, BACKOFF_MS[attempt]))
    }
  }

  try {
    const admin = createAdminClient()
    await admin.from('outbound_queue').insert({
      channel,
      recipient_id: recipientId,
      body,
      job_id: jobId ?? null,
      attempts: BACKOFF_MS.length,
      last_error: lastError,
    })
  } catch {
    // Queueing is best-effort; the caller must never be blocked.
  }

  return false
}
