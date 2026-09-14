'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, Plus, Trash2 } from 'lucide-react'

import { deleteCustomer } from '@/lib/actions/customers'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { toast } from '@/components/ui/toaster'
import { CustomerFormDialog, type EditableCustomer } from '@/components/customers/customer-form'

export function CustomersView({ customers }: { customers: EditableCustomer[] }) {
  const router = useRouter()
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<EditableCustomer | null>(null)
  const [deleting, setDeleting] = useState<EditableCustomer | null>(null)

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

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Customers</h1>
        <Button onClick={openNew}>
          <Plus className="h-4 w-4" />
          New customer
        </Button>
      </div>

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
                <tr key={customer.id} className="border-b border-zinc-200 last:border-0 dark:border-zinc-800">
                  <td className="p-3 font-medium">{customer.full_name}</td>
                  <td className="p-3">{customer.phone_number ?? '—'}</td>
                  <td className="p-3">{customer.zone ? customer.zone.replace(/_/g, ' ') : '—'}</td>
                  <td className="p-3 text-zinc-500">{customer.default_address ?? '—'}</td>
                  <td className="p-3">
                    <div className="flex justify-end gap-1">
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
