import { timingSafeEqual } from 'node:crypto'
import { NextResponse, type NextRequest } from 'next/server'

import { drainOutboundQueue } from '@/lib/messaging/outbound-queue'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
/** Vercel: the after() work must outlive the response. Hobby caps functions at 60s. */
export const maxDuration = 60

function secretsMatch(a: string, b: string): boolean {
  const left = Buffer.from(a)
  const right = Buffer.from(b)
  return left.length === right.length && timingSafeEqual(left, right)
}

/** Authorization: Bearer <secret> (Vercel Cron) or x-cron-secret (NAS scheduler). */
function authorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false

  const header = request.headers.get('x-cron-secret')
  const bearer = request.headers.get('authorization')
  const token = header ?? (bearer?.startsWith('Bearer ') ? bearer.slice(7) : null)

  return token !== null && secretsMatch(token, secret)
}

/**
 * Drains outbound_queue. docs/04-integrations.md §Failure Handling: queued
 * messages are retried on a 15-minute schedule.
 *
 * This is an API route rather than a Server Action because the caller is a
 * scheduler, not a user. Fails closed (401) when CRON_SECRET is unset.
 */
export async function GET(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  try {
    const summary = await drainOutboundQueue()
    return NextResponse.json(summary)
  } catch (error) {
    console.error('[cron/outbound] drain failed', error)
    return NextResponse.json({ error: 'drain failed' }, { status: 500 })
  }
}
