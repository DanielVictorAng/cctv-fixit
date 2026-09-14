import { format } from 'date-fns'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

import { PHOTO_BUCKET } from '@/lib/constants'
import { createAdminClient, createServerClient } from '@/lib/supabase-client'
import { StatusBadge } from '@/components/ui/status-badge'
import { DeepLinks } from '@/components/tech/deep-links'
import { JobActions } from '@/components/tech/job-actions'

export const dynamic = 'force-dynamic'

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createServerClient()
  const { data: ticket } = await supabase
    .from('tickets')
    .select('*, customers(*)')
    .eq('id', id)
    .single()
  if (!ticket) notFound()

  const photoPaths = ticket.photo_urls ?? []
  let signedUrls: { path: string; url: string }[] = []
  if (photoPaths.length > 0) {
    const admin = createAdminClient()
    const { data: signed } = await admin.storage
      .from(PHOTO_BUCKET)
      .createSignedUrls(photoPaths, 3600)
    signedUrls = (signed ?? []).flatMap((entry) =>
      entry.signedUrl ? [{ path: entry.path ?? '', url: entry.signedUrl }] : []
    )
  }

  const customer = ticket.customers
  const address = customer?.default_address ?? null

  return (
    <div className="mx-auto w-full max-w-2xl space-y-5 px-4 py-5">
      <Link href="/tech" className="inline-flex items-center gap-1 text-sm text-zinc-500">
        <ArrowLeft className="h-4 w-4" />
        Back to jobs
      </Link>

      <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold">{customer?.full_name ?? 'Unknown customer'}</h1>
            <p className="text-sm text-zinc-500">{ticket.service_category}</p>
          </div>
          <StatusBadge status={ticket.status} />
        </div>

        <dl className="mt-4 space-y-2 text-sm">
          <div>
            <dt className="text-zinc-500">Phone</dt>
            <dd>
              {customer?.phone_number ? (
                <a href={`tel:${customer.phone_number}`} className="font-medium">
                  {customer.phone_number}
                </a>
              ) : (
                '—'
              )}
            </dd>
          </div>
          <div>
            <dt className="text-zinc-500">Address</dt>
            <dd>{address ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Issue</dt>
            <dd className="whitespace-pre-wrap">{ticket.issue_description}</dd>
          </div>
          {ticket.scheduled_start ? (
            <div>
              <dt className="text-zinc-500">Scheduled</dt>
              <dd>{format(new Date(ticket.scheduled_start), 'PPpp')}</dd>
            </div>
          ) : null}
        </dl>

        <div className="mt-4">
          <DeepLinks address={address} />
        </div>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-3 text-sm font-semibold">Photos</h2>
        {signedUrls.length === 0 ? (
          <p className="text-sm text-zinc-500">No photos yet.</p>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {signedUrls.map((photo) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={photo.path}
                src={photo.url}
                alt="Job photo"
                className="aspect-square w-full rounded-md object-cover"
              />
            ))}
          </div>
        )}
      </div>

      <JobActions ticketId={ticket.id} status={ticket.status} photoUrls={photoPaths} />
    </div>
  )
}
