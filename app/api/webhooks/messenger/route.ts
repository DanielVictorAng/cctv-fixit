import { createHmac, timingSafeEqual } from 'node:crypto'
import { NextResponse, type NextRequest } from 'next/server'

import { intakeInboundMessage, type InboundMessage } from '@/lib/messaging/intake'
import { sendMessage } from '@/lib/messaging/send'
import { renderTemplate } from '@/lib/messaging/templates'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

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

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

/** Normalise either the n8n-sanitised shape or Meta's raw webhook shape. */
function normalize(payload: unknown): InboundMessage[] {
  if (typeof payload !== 'object' || payload === null) return []
  const record = payload as Record<string, unknown>

  if (typeof record.sender_id === 'string' && typeof record.text === 'string') {
    return [
      {
        channel: 'messenger',
        senderId: record.sender_id,
        text: record.text,
        phoneNumber: typeof record.phone_number === 'string' ? record.phone_number : null,
        category: typeof record.category === 'string' ? record.category : null,
        attachments: strings(record.attachments),
      },
    ]
  }

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
      if (sender && typeof sender.id === 'string' && message && typeof message.text === 'string') {
        messages.push({ channel: 'messenger', senderId: sender.id, text: message.text })
      }
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
  for (const message of messages) {
    const result = await intakeInboundMessage(message)
    await sendMessage(
      'messenger',
      message.senderId,
      renderTemplate('ack', { name: result.customerName }),
      result.ticketId
    )
  }

  return NextResponse.json({ received: messages.length })
}
