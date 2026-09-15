import { createHmac, timingSafeEqual } from 'node:crypto'
import { NextResponse, after, type NextRequest } from 'next/server'

import { intakeInboundMessage, type InboundMessage } from '@/lib/messaging/intake'
import { sendMessage } from '@/lib/messaging/send'
import { renderTemplate } from '@/lib/messaging/templates'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Viber message types that carry a media URL instead of text. */
const MEDIA_TYPES = new Set(['picture', 'video', 'file', 'url'])

function validSignature(raw: string, header: string | null): boolean {
  const token = process.env.VIBER_AUTH_TOKEN
  if (!token || !header) return false
  const expected = createHmac('sha256', token).update(raw, 'utf8').digest('hex')
  const a = Buffer.from(expected)
  const b = Buffer.from(header)
  return a.length === b.length && timingSafeEqual(a, b)
}

/** Accept either an authenticated n8n forward or a raw Viber-signed request. */
function authorized(request: NextRequest, raw: string): boolean {
  const n8nSecret = process.env.N8N_WEBHOOK_SECRET
  if (n8nSecret && request.headers.get('x-n8n-secret') === n8nSecret) return true
  return validSignature(raw, request.headers.get('x-viber-content-signature'))
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

/** Normalise either the n8n-sanitised shape or Viber's raw event. */
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
        channel: 'viber',
        senderId: record.sender_id,
        text: text || '[media]',
        phoneNumber: typeof record.phone_number === 'string' ? record.phone_number : null,
        category: typeof record.category === 'string' ? record.category : null,
        attachments,
      },
    ]
  }

  // Shape 2 — Viber's raw event. Only "message" carries something a human
  // typed; delivered / seen / failed / subscribed / conversation_started do not
  // and must not open a ticket.
  if (record.event !== 'message') return []

  const sender =
    typeof record.sender === 'object' && record.sender !== null
      ? (record.sender as Record<string, unknown>)
      : null
  const message =
    typeof record.message === 'object' && record.message !== null
      ? (record.message as Record<string, unknown>)
      : null
  if (!sender || typeof sender.id !== 'string' || !message) return []

  const type = typeof message.type === 'string' ? message.type : ''
  const text = typeof message.text === 'string' ? message.text : ''
  const media =
    MEDIA_TYPES.has(type) && typeof message.media === 'string' && message.media.length > 0
      ? message.media
      : null
  if (!text && !media) return []

  return [
    {
      channel: 'viber',
      senderId: sender.id,
      text: text || `[${type}]`,
      attachments: media ? [media] : [],
    },
  ]
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

  // Same reason as the Messenger route: Viber re-delivers an event when the
  // response is slow, and the send-retry ladder can run 21s. Never let the
  // outbound send gate the 200.
  after(async () => {
    for (const message of messages) {
      try {
        const result = await intakeInboundMessage(message)
        await sendMessage(
          'viber',
          message.senderId,
          renderTemplate('ack', { name: result.customerName }),
          result.ticketId
        )
      } catch (error) {
        // Docs: never block the app when messaging is down. The coordinator can
        // still create the ticket by hand.
        console.error('[webhooks/viber] intake failed', error)
      }
    }
  })

  return NextResponse.json({ received: messages.length })
}
