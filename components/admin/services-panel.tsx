'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { Pencil, Plus, Trash2 } from 'lucide-react'

import { createService, deleteService, updateService } from '@/lib/actions/services'
import { serviceCategorySchema } from '@/lib/validators'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Dialog } from '@/components/ui/dialog'
import { EmptyState } from '@/components/ui/empty-state'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { toast } from '@/components/ui/toaster'

export type ServiceRow = {
  id: string
  category: string
  name: string
  base_labour_price: number
  est_duration_min: number
}

const CATEGORIES = serviceCategorySchema.options

// The form works in strings; the Server Action coerces and re-validates.
const formSchema = z.object({
  category: serviceCategorySchema,
  name: z.string().trim().min(1, 'Name is required'),
  base_labour_price: z.string().min(1, 'Price is required'),
  est_duration_min: z.string().min(1, 'Duration is required'),
})

type FormValues = z.infer<typeof formSchema>

const EMPTY: FormValues = {
  category: 'General',
  name: '',
  base_labour_price: '',
  est_duration_min: '60',
}

function peso(amount: number): string {
  return '₱' + Number(amount).toLocaleString()
}

export function ServicesPanel({ services }: { services: ServiceRow[] }) {
  const router = useRouter()
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<ServiceRow | null>(null)
  const [deleting, setDeleting] = useState<ServiceRow | null>(null)
  const [pending, setPending] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(formSchema), defaultValues: EMPTY })

  useEffect(() => {
    if (!formOpen) return
    reset(
      editing
        ? {
            category: CATEGORIES.includes(editing.category as never)
              ? (editing.category as FormValues['category'])
              : 'General',
            name: editing.name,
            base_labour_price: String(editing.base_labour_price),
            est_duration_min: String(editing.est_duration_min),
          }
        : EMPTY
    )
  }, [formOpen, editing, reset])

  function openNew() {
    setEditing(null)
    setFormOpen(true)
  }

  function openEdit(service: ServiceRow) {
    setEditing(service)
    setFormOpen(true)
  }

  async function submit(values: FormValues) {
    const payload = {
      category: values.category,
      name: values.name,
      base_labour_price: Number(values.base_labour_price),
      est_duration_min: Number(values.est_duration_min),
    }

    setPending(true)
    try {
      const result = editing
        ? await updateService({ id: editing.id, ...payload })
        : await createService(payload)
      if (!result.success) {
        toast({ title: 'Could not save', description: result.error, variant: 'destructive' })
        return
      }
      toast({ title: editing ? 'Service updated' : 'Service added' })
      setFormOpen(false)
      router.refresh()
    } finally {
      setPending(false)
    }
  }

  async function handleDelete() {
    if (!deleting) return
    const result = await deleteService({ id: deleting.id })
    if (!result.success) {
      toast({ title: 'Could not delete', description: result.error, variant: 'destructive' })
      return
    }
    toast({ title: 'Service deleted' })
    setDeleting(null)
    router.refresh()
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">Services</h2>
        <Button onClick={openNew} size="sm">
          <Plus className="h-4 w-4" />
          New service
        </Button>
      </div>

      {services.length === 0 ? (
        <EmptyState
          title="No services yet"
          message="The service catalog is what the coordinator quotes from. Add the first one to get started."
          action={
            <Button onClick={openNew}>
              <Plus className="h-4 w-4" />
              New service
            </Button>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50 text-left dark:border-zinc-800 dark:bg-zinc-900">
                <th className="p-3 font-medium">Category</th>
                <th className="p-3 font-medium">Service</th>
                <th className="p-3 font-medium">Labour</th>
                <th className="p-3 font-medium">Duration</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {services.map((service) => (
                <tr
                  key={service.id}
                  className="border-b border-zinc-200 last:border-0 dark:border-zinc-800"
                >
                  <td className="p-3">{service.category}</td>
                  <td className="p-3 font-medium">{service.name}</td>
                  <td className="p-3">{peso(service.base_labour_price)}</td>
                  <td className="p-3">{service.est_duration_min} min</td>
                  <td className="p-3">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(service)}
                        aria-label="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleting(service)}
                        aria-label="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? 'Edit service' : 'New service'}
        className="max-w-lg"
      >
        <form onSubmit={handleSubmit(submit)} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="service-name">Service name</Label>
            <Input id="service-name" {...register('name')} />
            {errors.name ? <p className="text-sm text-red-600">{errors.name.message}</p> : null}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="service-category">Category</Label>
              <Select id="service-category" {...register('category')}>
                {CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="service-price">Labour (₱)</Label>
              <Input id="service-price" inputMode="decimal" {...register('base_labour_price')} />
              {errors.base_labour_price ? (
                <p className="text-sm text-red-600">{errors.base_labour_price.message}</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="service-duration">Duration (min)</Label>
              <Input id="service-duration" inputMode="numeric" {...register('est_duration_min')} />
              {errors.est_duration_min ? (
                <p className="text-sm text-red-600">{errors.est_duration_min.message}</p>
              ) : null}
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? 'Saving…' : editing ? 'Save changes' : 'Add service'}
          </Button>
        </form>
      </Dialog>

      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        title="Delete service"
        message={
          'Delete ' + (deleting?.name ?? 'this service') + '? Quotes already sent keep their price.'
        }
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
      />
    </section>
  )
}
