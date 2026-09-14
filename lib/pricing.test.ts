import { test } from 'node:test'
import assert from 'node:assert/strict'

import { calculateQuote, calculateWarrantyQuote, MARKUP, SURCHARGES } from './pricing.ts'

test('Ex1 — simple', () => {
  const result = calculateQuote({ baseLabour: 400, materialCosts: [250], surcharges: [] })
  assert.deepEqual(result, {
    quoted_labour: 400,
    quoted_materials: 300,
    final_total: 700,
    downpayment_amount: null,
  })
})

test('Ex2 — emergency weekend peripheral', () => {
  const result = calculateQuote({
    baseLabour: 800,
    materialCosts: [180, 380],
    surcharges: ['EMERGENCY', 'WEEKEND', 'ZONE_6'],
  })
  assert.deepEqual(result, {
    quoted_labour: 800,
    quoted_materials: 672,
    final_total: 2472,
    downpayment_amount: null,
  })
})

test('Ex3 — over 5000 triggers 50% downpayment', () => {
  const result = calculateQuote({ baseLabour: 2500, materialCosts: [3500], surcharges: [] })
  assert.deepEqual(result, {
    quoted_labour: 2500,
    quoted_materials: 4200,
    final_total: 6700,
    downpayment_amount: 3350,
  })
})

test('constants match the spec', () => {
  assert.equal(MARKUP, 1.2)
  assert.deepEqual(SURCHARGES, {
    EMERGENCY: 500,
    WEEKEND: 200,
    AFTER_HOURS: 300,
    ZONE_6: 300,
  })
})

test('downpayment is null at exactly 5000 (strict >)', () => {
  const result = calculateQuote({ baseLabour: 5000, materialCosts: [] })
  assert.equal(result.final_total, 5000)
  assert.equal(result.downpayment_amount, null)
})

test('warranty quote — no labour, materials at cost', () => {
  const result = calculateWarrantyQuote({ materialCosts: [120, 80] })
  assert.deepEqual(result, {
    quoted_labour: 0,
    quoted_materials: 200,
    final_total: 200,
    downpayment_amount: null,
  })
})
