import { createServerClient } from '@/lib/supabase-client'
import { CustomersView } from '@/components/customers/customers-view'
import type { EditableCustomer } from '@/components/customers/customer-form'

export const dynamic = 'force-dynamic'

export default async function CustomersPage() {
  const supabase = await createServerClient()
  const { data } = await supabase
    .from('customers')
    .select('id,full_name,phone_number,fb_messenger_id,viber_id,default_address,zone')
    .order('full_name')

  const customers: EditableCustomer[] = (data ?? []).map((customer) => ({
    id: customer.id,
    full_name: customer.full_name,
    phone_number: customer.phone_number,
    fb_messenger_id: customer.fb_messenger_id,
    viber_id: customer.viber_id,
    default_address: customer.default_address,
    zone: customer.zone,
  }))

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6">
      <CustomersView customers={customers} />
    </div>
  )
}
