'use server'

import { z } from 'zod'

import { hasRole, requireSession, type UserRole } from '@/lib/auth'
import { sendMessage } from '@/lib/messaging/send'
import { renderTemplate } from '@/lib/messaging/templates'
import type { ActionResult } from '@/lib/action-result'

const STAFF_ROLES: UserRole[] = ['ADMIN', 'COORDINATOR']

const sendTemplateSchema = z.object({
  channel: z.enum(['messenger', 'viber']),
  recipient_id: z.string().min(1),
  template: z.enum(['quote', 'dispatch', 'complete', 'warranty', 'reminder', 'ack']),
  vars: z.record(z.string(), z.union([z.string(), z.number()])).default({}),
  ticket_id: z.uuid().nullish(),
})

export type SendTemplateInput = z.infer<typeof sendTemplateSchema>

/** Send one of the approved templates to a customer over Messenger or Viber. */
export async function sendTemplateMessage(input: SendTemplateInput): Promise<ActionResult> {
  const parsed = sendTemplateSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'Please check the message.' }

  const auth = await requireSession()
  if (!auth.ok) return { success: false, error: auth.error }
  if (!hasRole(auth.session.profile, STAFF_ROLES)) {
    return { success: false, error: 'You do not have permission to send messages.' }
  }

  const body = renderTemplate(parsed.data.template, parsed.data.vars)
  const sent = await sendMessage(
    parsed.data.channel,
    parsed.data.recipient_id,
    body,
    parsed.data.ticket_id ?? null
  )

  if (!sent) {
    return {
      success: false,
      error: 'The messaging API is unavailable — your message was queued for retry.',
    }
  }
  return { success: true }
}
