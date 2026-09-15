import { z } from 'zod'

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export const loginSchema = z.object({
  email: z.email('Enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

export type LoginInput = z.infer<typeof loginSchema>

// ---------------------------------------------------------------------------
// DB enums (mirror docs/01-schema.md)
// ---------------------------------------------------------------------------

export const baguioZoneSchema = z.enum([
  'ZONE_1_CENTER',
  'ZONE_2_EAST',
  'ZONE_3_WEST',
  'ZONE_4_SOUTH',
  'ZONE_5_NORTH',
  'ZONE_6_PERIPHERAL',
])

export const paymentMethodSchema = z.enum(['CASH', 'GCASH', 'MAYA'])

// ---------------------------------------------------------------------------
// Customers
// ---------------------------------------------------------------------------

export const customerCreateSchema = z.object({
  full_name: z.string().trim().min(1, 'Name is required').max(200),
  phone_number: z.string().trim().min(1).max(30).nullish(),
  address: z.string().trim().min(1).max(500).nullish(),
  fb_messenger_id: z.string().trim().min(1).max(200).nullish(),
  viber_id: z.string().trim().min(1).max(200).nullish(),
})

export type CustomerCreateInput = z.infer<typeof customerCreateSchema>

export const customerUpdateSchema = customerCreateSchema.partial().extend({ id: z.uuid() })
export type CustomerUpdateInput = z.infer<typeof customerUpdateSchema>

export const customerIdSchema = z.object({ id: z.uuid() })
