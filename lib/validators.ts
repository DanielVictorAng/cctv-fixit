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

export const paymentMethodSchema = z.enum(['GCASH', 'CASH', 'BANK_TRANSFER', 'MAYA'])

export const surchargeSchema = z.enum(['EMERGENCY', 'WEEKEND', 'AFTER_HOURS', 'ZONE_6'])

// ---------------------------------------------------------------------------
// Customers
// ---------------------------------------------------------------------------

export const customerCreateSchema = z.object({
  full_name: z.string().trim().min(1, 'Name is required').max(200),
  phone_number: z.string().trim().min(1).max(30).nullish(),
  fb_messenger_id: z.string().trim().min(1).max(200).nullish(),
  viber_id: z.string().trim().min(1).max(200).nullish(),
  default_address: z.string().trim().min(1).max(500).nullish(),
  zone: baguioZoneSchema.nullish(),
})

export type CustomerCreateInput = z.infer<typeof customerCreateSchema>

export const customerUpdateSchema = customerCreateSchema.partial().extend({ id: z.uuid() })
export type CustomerUpdateInput = z.infer<typeof customerUpdateSchema>

export const customerIdSchema = z.object({ id: z.uuid() })

// ---------------------------------------------------------------------------
// Tickets
// ---------------------------------------------------------------------------

export const ticketCreateSchema = z.object({
  customer_id: z.uuid(),
  service_category: z.string().trim().min(1).max(100),
  issue_description: z.string().trim().min(1).max(2000),
  zone: baguioZoneSchema,
  photo_urls: z.array(z.string()).max(20).optional(),
})

export type TicketCreateInput = z.infer<typeof ticketCreateSchema>

export const ticketUpdateSchema = z.object({
  id: z.uuid(),
  service_category: z.string().trim().min(1).max(100).optional(),
  issue_description: z.string().trim().min(1).max(2000).optional(),
  zone: baguioZoneSchema.optional(),
  photo_urls: z.array(z.string()).max(20).optional(),
})

export type TicketUpdateInput = z.infer<typeof ticketUpdateSchema>

export const ticketIdSchema = z.object({ id: z.uuid() })

export const ticketRefSchema = z.object({ ticket_id: z.uuid() })

// ---------------------------------------------------------------------------
// State-machine transition inputs
// ---------------------------------------------------------------------------

export const quoteTicketSchema = z.object({
  ticket_id: z.uuid(),
  base_labour: z.number().nonnegative(),
  material_costs: z.array(z.number().nonnegative()).default([]),
  surcharges: z.array(surchargeSchema).default([]),
})
export type QuoteTicketInput = z.infer<typeof quoteTicketSchema>

export const scheduleTicketSchema = z.object({
  ticket_id: z.uuid(),
  scheduled_start: z.iso.datetime(),
  scheduled_end: z.iso.datetime().nullish(),
})
export type ScheduleTicketInput = z.infer<typeof scheduleTicketSchema>

export const dispatchTicketSchema = z.object({
  ticket_id: z.uuid(),
  assigned_tech_id: z.uuid(),
})
export type DispatchTicketInput = z.infer<typeof dispatchTicketSchema>

export const completeTicketSchema = z.object({
  ticket_id: z.uuid(),
  photo_urls: z.array(z.string()).min(1, 'At least one photo is required'),
})
export type CompleteTicketInput = z.infer<typeof completeTicketSchema>

export const confirmPaymentSchema = z.object({
  ticket_id: z.uuid(),
  payment_method: paymentMethodSchema,
})
export type ConfirmPaymentInput = z.infer<typeof confirmPaymentSchema>

export const cancelTicketSchema = z.object({
  ticket_id: z.uuid(),
  reason: z.string().trim().min(1).max(500),
})
export type CancelTicketInput = z.infer<typeof cancelTicketSchema>
