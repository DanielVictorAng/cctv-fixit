import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
  quoteTicketSchema,
  serviceCreateSchema,
  serviceIdSchema,
  serviceUpdateSchema,
} from './validators.ts'

const VALID = {
  category: 'Electrical',
  name: 'CCTV Camera Installation',
  base_labour_price: 800,
  est_duration_min: 120,
}

test('serviceCreateSchema accepts a well-formed service', () => {
  const parsed = serviceCreateSchema.parse(VALID)
  assert.deepEqual(parsed, VALID)
})

test('serviceCreateSchema coerces the strings a form sends', () => {
  const parsed = serviceCreateSchema.parse({
    category: 'Plumbing',
    name: '  Faucet Replacement  ',
    base_labour_price: '450.5',
    est_duration_min: '60',
  })
  assert.equal(parsed.name, 'Faucet Replacement')
  assert.equal(parsed.base_labour_price, 450.5)
  assert.equal(parsed.est_duration_min, 60)
})

test('serviceCreateSchema rejects an unknown category', () => {
  const result = serviceCreateSchema.safeParse({ ...VALID, category: 'Astrology' })
  assert.equal(result.success, false)
})

test('serviceCreateSchema rejects a blank name', () => {
  assert.equal(serviceCreateSchema.safeParse({ ...VALID, name: '   ' }).success, false)
})

test('serviceCreateSchema allows free work but never a negative price', () => {
  assert.equal(serviceCreateSchema.safeParse({ ...VALID, base_labour_price: 0 }).success, true)
  assert.equal(serviceCreateSchema.safeParse({ ...VALID, base_labour_price: -1 }).success, false)
  assert.equal(serviceCreateSchema.safeParse({ ...VALID, base_labour_price: 'abc' }).success, false)
})

test('serviceCreateSchema bounds the duration to whole minutes', () => {
  assert.equal(serviceCreateSchema.safeParse({ ...VALID, est_duration_min: 15 }).success, true)
  assert.equal(serviceCreateSchema.safeParse({ ...VALID, est_duration_min: 1440 }).success, true)
  assert.equal(serviceCreateSchema.safeParse({ ...VALID, est_duration_min: 14 }).success, false)
  assert.equal(serviceCreateSchema.safeParse({ ...VALID, est_duration_min: 90.5 }).success, false)
})

test('serviceUpdateSchema requires an id, serviceIdSchema wants only the id', () => {
  const id = '11111111-1111-4111-8111-111111111111'
  assert.equal(serviceUpdateSchema.safeParse({ ...VALID, id }).success, true)
  assert.equal(serviceUpdateSchema.safeParse(VALID).success, false)
  assert.equal(serviceUpdateSchema.safeParse({ ...VALID, id: 'nope' }).success, false)
  assert.deepEqual(serviceIdSchema.parse({ id }), { id })
  assert.equal(serviceIdSchema.safeParse({ id: 'nope' }).success, false)
})

const TICKET_ID = '22222222-2222-4222-8222-222222222222'
const MATERIAL_ID = '33333333-3333-4333-8333-333333333333'

test('quoteTicketSchema takes material ids and quantities, never prices', () => {
  const parsed = quoteTicketSchema.parse({
    ticket_id: TICKET_ID,
    base_labour: 400,
    materials: [{ material_id: MATERIAL_ID, quantity: 2, cost_price: 1 }],
  })
  assert.deepEqual(parsed.materials, [{ material_id: MATERIAL_ID, quantity: 2 }])
  assert.deepEqual(parsed.surcharges, [])
})

test('quoteTicketSchema allows a labour-only quote', () => {
  const parsed = quoteTicketSchema.parse({ ticket_id: TICKET_ID, base_labour: 400 })
  assert.deepEqual(parsed.materials, [])
})

test('quoteTicketSchema wants whole, positive quantities of real material ids', () => {
  const quote = (line: unknown) =>
    quoteTicketSchema.safeParse({ ticket_id: TICKET_ID, base_labour: 400, materials: [line] })
      .success
  assert.equal(quote({ material_id: MATERIAL_ID, quantity: 1 }), true)
  assert.equal(quote({ material_id: MATERIAL_ID, quantity: 0 }), false)
  assert.equal(quote({ material_id: MATERIAL_ID, quantity: 1.5 }), false)
  assert.equal(quote({ material_id: 'nope', quantity: 1 }), false)
})
