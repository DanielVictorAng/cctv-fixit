'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, Pencil, Plus, ShieldCheck, Trash2 } from 'lucide-react'

import { deleteCustomer, resolveDuplicateCustomer } from '@/lib/actions/customers'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { toast } from '@/components/ui/toaster'
import { CustomerFormDialog, type EditableCustomer } from '@/components/customers/customer-form'

export function CustomersView({ customers }: { customers: EditableCustomer[] }) {
  const router = useRouter()
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<EditableCustomer | null>(null)
  const [deleting, setDeleting] = useState<EditableCustomer | null>(null)
  const [resolving, setResolving] = useState<string | null>(null)

  const needsReview = customers.filter((customer) => customer.possible_duplicate).length

  function openNew() {
    setEditing(null)
    setFormOpen(true)
  }

  function openEdit(customer: EditableCustomer) {
    setEditing(customer)
    setFormOpen(true)
  }

  async function handleDelete() {
    if (!deleting) return
    const result = await deleteCustomer({ id: deleting.id })
    if (!result.success) {
      toast({ title: 'Could not delete', description: result.error, variant: 'destructive' })
      return
    }
    toast({ title: 'Customer deleted' })
    router.refresh()
  }

  async function handleResolve(customer: EditableCustomer) {
    setResolving(customer.id)
    try {
      const result = await resolveDuplicateCustomer({ id: customer.id })
      if (!result.success) {
        toast({ title: 'Could not update', description: result.error, variant: 'destructive' })
        return
      }
      toast({ title: 'Marked as reviewed' })
      router.refresh()
    } finally {
      setResolving(null)
    }
  }

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Customers</h1>
        <Button onClick={openNew}>
          <Plus className="h-4 w-4" />
          New customer
        </Button>
      </div>

      {needsReview > 0 ? (
        <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            {needsReview} {needsReview === 1 ? 'customer came' : 'customers came'} in from
            Messenger/Viber without a phone number, so we could not match{' '}
            {needsReview === 1 ? 'them' : 'them'} to an existing record automatically. Compare the
            details, edit or delete a duplicate, then mark{' '}
            {needsReview === 1 ? 'it' : 'each'} reviewed.
          </p>
        </div>
      ) : null}

      {customers.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-zinc-300 bg-white py-16 text-center dark:border-zinc-700 dark:bg-zinc-950">
          <h2 className="text-lg font-semibold">No customers yet</h2>
          <p className="max-w-sm text-sm text-zinc-500">
            Add your first customer to start creating tickets for them.
          </p>
          <Button onClick={openNew}>
            <Plus className="h-4 w-4" />
            New customer
          </Button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50 text-left dark:border-zinc-800 dark:bg-zinc-900">
                <th className="p-3 font-medium">Name</th>
                <th className="p-3 font-medium">Phone</th>
                <th className="p-3 font-medium">Zone</th>
                <th className="p-3 font-medium">Address</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => (
                <tr
                  key={customer.id}
                  className={
                    customer.possible_duplicate
                      ? 'border-b border-zinc-200 bg-amber-50/50 last:border-0 dark:border-zinc-800 dark:bg-amber-950/20'
                      : 'border-b border-zinc-200 last:border-0 dark:border-zinc-800'
                  }
                >
                  <td className="p-3 font-medium">
                    <div className="flex flex-wrap items-center gap-2">
                      <span>{customer.full_name}</span>
                      {customer.possible_duplicate ? (
                        <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                          Needs review
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className="p-3">{customer.phone_number ?? '—'}</td>
                  <td className="p-3">{customer.zone ? customer.zone.replace(/_/g, ' ') : '—'}</td>
                  <td className="p-3 text-zinc-500">{customer.default_address ?? '—'}</td>
                  <td className="p-3">
                    <div className="flex justify-end gap-1">
                      {customer.possible_duplicate ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleResolve(customer)}
                          disabled={resolving === customer.id}
                        >
                          <ShieldCheck className="h-4 w-4" />
                          Mark reviewed
                        </Button>
                      ) : null}
                      <Button variant="ghost" size="icon" onClick={() => openEdit(customer)} aria-label="Edit">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleting(customer)}
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

      <CustomerFormDialog open={formOpen} onClose={() => setFormOpen(false)} customer={editing} />

      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        title="Delete customer"
        message={`Delete ${deleting?.full_name ?? 'this customer'}? This cannot be undone.`}
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
      />
    </>
  )
}
