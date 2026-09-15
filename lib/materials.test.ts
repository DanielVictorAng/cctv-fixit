import { test } from 'node:test'
import assert from 'node:assert/strict'

import { lineCosts, mergeMaterialLines } from './materials.ts'

const A = '11111111-1111-4111-8111-111111111111'
const B = '22222222-2222-4222-8222-222222222222'

test('mergeMaterialLines adds up a material picked twice', () => {
  assert.deepEqual(
    mergeMaterialLines([
      { material_id: A, quantity: 2 },
      { material_id: B, quantity: 1 },
      { material_id: A, quantity: 3 },
    ]),
    [
      { material_id: A, quantity: 5 },
      { material_id: B, quantity: 1 },
    ]
  )
  assert.deepEqual(mergeMaterialLines([]), [])
})

test('lineCosts multiplies the catalog unit cost by the quantity', () => {
  assert.deepEqual(
    lineCosts([
      { material_id: A, quantity: 2, unit_cost: 125 },
      { material_id: B, quantity: 1, unit_cost: 380 },
    ]),
    [250, 380]
  )
})
