import { createHmac, timingSafeEqual } from 'node:crypto'
import { NextResponse, type NextRequest } from 'next/server'

import { intakeInboundMessage } from '@/lib/messaging/intake'
import { sendMessage } from '@/lib/messaging/send'
import { renderTemplate } from '@/lib/messaging/templates'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function validSignature(raw: string, header: string | null): boolean {
  const token = process.env.VIBER_AUTH_TOKEN
  if (!token || !header) return false
  const expected = createHmac('sha256', token).update(raw, 'utf8').digest('hex')
  const a = Buffer.from(expected)
  const b = Buffer.from(header)
  return a.length === b.length && timingSafeEqual(a, b)
}

function authorized(request: NextRequest, raw: string): boolean {
  const n8nSecret = process.env.N8N_WEBHOOK_SECRET
  if (n8nSecret && request.headers.get('x-n8n-secret') === n8nSecret) return true
  return validSignature(raw, request.headers.get('x-viber-content-signature'))
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

  const record =
    typeof payload === 'object' && payload !== null ? (payload as Record<string, unknown>) : null
  const sender =
    record && typeof record.sender === 'object' && record.sender !== null
      ? (record.sender as Record<string, unknown>)
      : null
  const message =
    record && typeof record.message === 'object' && record.message !== null
      ? (record.message as Record<string, unknown>)
      : null

  // Ignore non-message events (delivered / seen / conversation_started).
  if (!sender || typeof sender.id !== 'string' || !message || typeof message.text !== 'string') {
    return NextResponse.json({ received: 0 })
  }

  const result = await intakeInboundMessage({
    channel: 'viber',
    senderId: sender.id,
    text: message.text,
  })
  await sendMessage(
    'viber',
    sender.id,
    renderTemplate('ack', { name: result.customerName }),
    result.ticketId
  )

  return NextResponse.json({ received: 1 })
}
