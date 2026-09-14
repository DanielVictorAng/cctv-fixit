'use server'

import { ALLOWED_PHOTO_TYPES, MAX_PHOTO_BYTES, PHOTO_BUCKET } from '@/lib/constants'
import { requireSession } from '@/lib/auth'
import { writeAuditLog } from '@/lib/audit'
import { createAdminClient } from '@/lib/supabase-client'
import type { ActionResult } from '@/lib/action-result'

export async function uploadTicketPhoto(
  formData: FormData
): Promise<ActionResult<{ path: string }>> {
  const ticketId = formData.get('ticketId')
  const file = formData.get('file')

  if (typeof ticketId !== 'string' || !(file instanceof File)) {
    return { success: false, error: 'Invalid upload.' }
  }

  const auth = await requireSession()
  if (!auth.ok) return { success: false, error: auth.error }
  const { supabase, userId, profile } = auth.session

  const { data: ticket } = await supabase
    .from('tickets')
    .select('id,assigned_tech_id,photo_urls')
    .eq('id', ticketId)
    .single()
  if (!ticket) return { success: false, error: 'Ticket not found.' }

  const allowed =
    profile.role === 'ADMIN' ||
    profile.role === 'COORDINATOR' ||
    ticket.assigned_tech_id === userId
  if (!allowed) return { success: false, error: 'You are not assigned to this ticket.' }

  if (!ALLOWED_PHOTO_TYPES.includes(file.type as (typeof ALLOWED_PHOTO_TYPES)[number])) {
    return { success: false, error: 'Only JPEG, PNG, or WebP images are allowed.' }
  }
  if (file.size > MAX_PHOTO_BYTES) {
    return { success: false, error: 'Image must be 1MB or smaller.' }
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
  const path = `${ticketId}/${Date.now()}-${safeName}`

  // Uploads use the service role; the bucket is private so reads go via signed URLs.
  const admin = createAdminClient()
  const { error: uploadError } = await admin.storage
    .from(PHOTO_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false })
  if (uploadError) return { success: false, error: 'Could not upload the photo.' }

  const nextUrls = [...(ticket.photo_urls ?? []), path]
  const { error: updateError } = await supabase
    .from('tickets')
    .update({ photo_urls: nextUrls })
    .eq('id', ticketId)
  if (updateError) return { success: false, error: 'Photo uploaded but the ticket was not updated.' }

  await writeAuditLog({
    tableName: 'tickets',
    recordId: ticketId,
    action: 'UPDATE',
    changedBy: userId,
    newValues: { photo_urls: nextUrls },
  })
  return { success: true, data: { path } }
}
