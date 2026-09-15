import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
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
