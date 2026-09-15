import { test } from 'node:test'
import assert from 'node:assert/strict'

import { renderValue, summariseChanges } from './audit-log.ts'

test('renderValue flattens the shapes a jsonb column can hold', () => {
  assert.equal(renderValue(null), '—')
  assert.equal(renderValue(undefined), '—')
  assert.equal(renderValue('  hello   world '), 'hello world')
  assert.equal(renderValue(''), '(empty)')
  assert.equal(renderValue(0), '0')
  assert.equal(renderValue(false), 'false')
  assert.equal(renderValue([]), '[]')
  assert.equal(renderValue({}), '{}')
  assert.equal(renderValue(['a', 'b']), 'a, b')
  assert.equal(renderValue({ material_id: 'm1', quantity: 2 }), 'material_id: m1, quantity: 2')
})

test('renderValue caps how much a long value can say', () => {
  const rendered = renderValue('x'.repeat(200))
  assert.equal(rendered.length, 60)
  assert.ok(rendered.endsWith('…'))
})

test('INSERT lists the new values only', () => {
  assert.deepEqual(summariseChanges('INSERT', null, { name: 'Ana', zone: 'ZONE_1_CENTER' }), [
    { field: 'name', from: '—', to: 'Ana' },
    { field: 'zone', from: '—', to: 'ZONE_1_CENTER' },
  ])
})

test('DELETE lists the old values only', () => {
  assert.deepEqual(summariseChanges('DELETE', { name: 'Ana' }, null), [
    { field: 'name', from: 'Ana', to: '—' },
  ])
})

test('UPDATE shows only the fields that actually changed', () => {
  const changes = summariseChanges(
    'UPDATE',
    { status: 'NEW', final_total: 500, issue_description: 'Flickering' },
    { status: 'QUOTED', final_total: 500, issue_description: 'Flickering' }
  )
  assert.deepEqual(changes, [{ field: 'status', from: 'NEW', to: 'QUOTED' }])
})

test('UPDATE reports a field added or removed on one side', () => {
  assert.deepEqual(summariseChanges('UPDATE', { a: 1 }, { a: 1, b: 2 }), [
    { field: 'b', from: '—', to: '2' },
  ])
  assert.deepEqual(summariseChanges('UPDATE', { a: 1, b: 2 }, { a: 1 }), [
    { field: 'b', from: '2', to: '—' },
  ])
})

test('a malformed audit blob degrades to no changes instead of throwing', () => {
  assert.deepEqual(summariseChanges('UPDATE', 'not-an-object', 42), [])
  assert.deepEqual(summariseChanges('INSERT', null, null), [])
})
