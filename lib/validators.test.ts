import { test } from 'node:test'
import assert from 'node:assert/strict'

import { customerCreateSchema, customerUpdateSchema, paymentMethodSchema } from './validators.ts'

test('customerCreateSchema trims the name and allows missing contact details', () => {
  const parsed = customerCreateSchema.parse({ full_name: '  Juan dela Cruz  ' })
  assert.equal(parsed.full_name, 'Juan dela Cruz')
  assert.equal(parsed.phone_number, undefined)
  assert.equal(parsed.address, undefined)
})

test('customerCreateSchema rejects a blank name', () => {
  assert.equal(customerCreateSchema.safeParse({ full_name: '   ' }).success, false)
})

test('customerUpdateSchema requires a customer id', () => {
  const id = '11111111-1111-4111-8111-111111111111'
  assert.equal(customerUpdateSchema.safeParse({ id, address: 'Session Road' }).success, true)
  assert.equal(customerUpdateSchema.safeParse({ address: 'Session Road' }).success, false)
})

test('paymentMethodSchema takes the store payment methods only', () => {
  for (const method of ['CASH', 'GCASH', 'MAYA']) {
    assert.equal(paymentMethodSchema.safeParse(method).success, true)
  }
  assert.equal(paymentMethodSchema.safeParse('BANK_TRANSFER').success, false)
})
