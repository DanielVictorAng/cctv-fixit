import { createHmac, timingSafeEqual } from 'node:crypto'
import { NextResponse, after, type NextRequest } from 'next/server'

import { claimInboundEvent, releaseInboundEvent } from '@/lib/messaging/inbound-events'
import { intakeInboundMessage, type InboundMessage } from '@/lib/messaging/intake'
import { sendMessage } from '@/lib/messaging/send'
import { renderTemplate } from '@/lib/messaging/templates'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
/** Vercel: the after() work must outlive the response. Hobby caps functions at 60s. */
export const maxDuration = 60

/** Stand-in issue text when the customer sends a photo with no caption. */
const IMAGE_PLACEHOLDER = '[image]'

/** Meta webhook verification (also usable by n8n). */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const verifyToken = process.env.MESSENGER_VERIFY_TOKEN
  const challenge = params.get('hub.challenge')

  if (
    params.get('hub.mode') === 'subscribe' &&
    verifyToken &&
    params.get('hub.verify_token') === verifyToken &&
    challenge
  ) {
    return new NextResponse(challenge, { status: 200 })
  }
  return new NextResponse('Forbidden', { status: 403 })
}

function validSignature(raw: string, header: string | null): boolean {
  const secret = process.env.MESSENGER_APP_SECRET
  if (!secret || !header) return false
  const expected = `sha256=${createHmac('sha256', secret).update(raw, 'utf8').digest('hex')}`
  const a = Buffer.from(expected)
  const b = Buffer.from(header)
  return a.length === b.length && timingSafeEqual(a, b)
}

/** Accept either an authenticated n8n forward or a raw Meta-signed request. */
function authorized(request: NextRequest, raw: string): boolean {
  const n8nSecret = process.env.N8N_WEBHOOK_SECRET
  if (n8nSecret && request.headers.get('x-n8n-secret') === n8nSecret) return true
  return validSignature(raw, request.headers.get('x-hub-signature-256'))
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

/**
 * Meta sends images as attachment objects whose payload URL is short-lived and
 * signed. We keep the URL; downloading into Supabase Storage is a later concern.
 */
function attachmentUrls(message: Record<string, unknown>): string[] {
  if (!Array.isArray(message.attachments)) return []
  const urls: string[] = []
  for (const item of message.attachments) {
    if (typeof item !== 'object' || item === null) continue
    const payload = (item as Record<string, unknown>).payload
    if (typeof payload !== 'object' || payload === null) continue
    const url = (payload as Record<string, unknown>).url
    if (typeof url === 'string' && url.length > 0) urls.push(url)
  }
  return urls
}

/** Normalise either the n8n-sanitised shape or Meta's raw webhook shape. */
function normalize(payload: unknown): InboundMessage[] {
  if (typeof payload !== 'object' || payload === null) return []
  const record = payload as Record<string, unknown>

  // Shape 1 — already sanitised by n8n.
  if (typeof record.sender_id === 'string') {
    const text = typeof record.text === 'string' ? record.text : ''
    const attachments = stringArray(record.attachments)
    if (!text && attachments.length === 0) return []
    return [
      {
        channel: 'messenger',
        senderId: record.sender_id,
        text: text || IMAGE_PLACEHOLDER,
        phoneNumber: typeof record.phone_number === 'string' ? record.phone_number : null,
        senderName: typeof record.sender_name === 'string' ? record.sender_name : null,
        category: typeof record.category === 'string' ? record.category : null,
        messageId: typeof record.message_id === 'string' ? record.message_id : null,
        attachments,
      },
    ]
  }

  // Shape 2 — Meta's raw envelope.
  const messages: InboundMessage[] = []
  const entries = Array.isArray(record.entry) ? record.entry : []
  for (const entry of entries) {
    if (typeof entry !== 'object' || entry === null) continue
    const messagingRaw = (entry as Record<string, unknown>).messaging
    if (!Array.isArray(messagingRaw)) continue
    for (const item of messagingRaw) {
      if (typeof item !== 'object' || item === null) continue
      const event = item as Record<string, unknown>
      const sender =
        typeof event.sender === 'object' && event.sender !== null
          ? (event.sender as Record<string, unknown>)
          : null
      const message =
        typeof event.message === 'object' && event.message !== null
          ? (event.message as Record<string, unknown>)
          : null
      if (!sender || typeof sender.id !== 'string' || !message) continue

      // Echoes are our own outbound messages coming back. Ingesting them would
      // make the bot open a ticket on itself and answer in a loop.
      if (message.is_echo === true) continue

      const text = typeof message.text === 'string' ? message.text : ''
      const attachments = attachmentUrls(message)
      if (!text && attachments.length === 0) continue

      messages.push({
        channel: 'messenger',
        senderId: sender.id,
        text: text || IMAGE_PLACEHOLDER,
        messageId: typeof message.mid === 'string' ? message.mid : null,
        attachments,
      })
    }
  }
  return messages
}

export async function POST(request: NextRequest) {
  const raw = await request.text()
  if (!authorized(request, raw)) {
    return NextResponse.json({ error: 'invalid signature' }, { status: 401 })
  }

  let payload: unknown
  try {
    payload = JSON.parse(raw)
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }

  const messages = normalize(payload)

  // Answer Meta immediately and work afterwards. Meta re-delivers an event when
  // our response is slow, and a re-delivery used to open a second ticket. The
  // Graph API retry ladder alone can run 21s, so it must never gate the 200.
  after(async () => {
    for (const message of messages) {
      // A re-delivered event must not open a second ticket or send a second
      // auto-reply (docs/01-schema.md §inbound_events).
      if (message.messageId && !(await claimInboundEvent('messenger', message.messageId))) {
        continue
      }

      try {
        const result = await intakeInboundMessage(message)
        await sendMessage(
          'messenger',
          message.senderId,
          renderTemplate('ack', { name: result.customerName }),
          result.ticketId
        )
      } catch (error) {
        // Give the claim back so the platform's retry can still be handled.
        if (message.messageId) await releaseInboundEvent('messenger', message.messageId)
        // Docs: never block the app when messaging is down. The coordinator can
        // still create the ticket by hand.
        console.error('[webhooks/messenger] intake failed', error)
      }
    }
  })

  return NextResponse.json({ received: messages.length })
}
