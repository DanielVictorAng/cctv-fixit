import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
  TEMPLATES,
  greetingName,
  missingTemplateVars,
  renderTemplate,
  templateVars,
  type TemplateKey,
} from './templates.ts'

const ALL = Object.keys(TEMPLATES) as TemplateKey[]

/** One value for every placeholder the templates use. */
const SAMPLE: Record<string, string> = {
  name: 'Juan',
  service: 'Faucet Replacement',
  amount: '1500',
  tech_name: 'Pedro',
  time_window: '2-4 PM',
  number: '09171234567',
  time: '9:00 AM',
}

test('every template renders cleanly with a complete set of values', () => {
  for (const key of ALL) {
    assert.deepEqual(missingTemplateVars(key, SAMPLE), [], key + ' should need nothing extra')

    const body = renderTemplate(key, SAMPLE)
    assert.doesNotMatch(body, /{\w+}/, key + ' still contains a placeholder')
    assert.doesNotMatch(body, /\s{2,}/, key + ' contains a double space')
  }
})

test('templateVars reads the placeholders off the template text', () => {
  assert.deepEqual(templateVars('ack'), ['name'])
  assert.deepEqual(templateVars('quote'), ['name', 'service', 'amount'])
  assert.deepEqual(templateVars('dispatch'), ['name', 'tech_name', 'time_window'])
})

test('missingTemplateVars flags absent and blank values', () => {
  assert.deepEqual(missingTemplateVars('quote', { name: 'Juan', service: 'CCTV', amount: '500' }), [])
  assert.deepEqual(missingTemplateVars('quote', { name: 'Juan', amount: '500' }), ['service'])
  assert.deepEqual(missingTemplateVars('quote', { name: 'Juan', service: '   ', amount: '500' }), [
    'service',
  ])
  assert.deepEqual(missingTemplateVars('complete', {}), ['name', 'amount', 'number'])
})

test('renderTemplate blanks unknown placeholders — why callers must check first', () => {
  assert.equal(
    renderTemplate('quote', { name: 'Juan', amount: '500' }),
    'Hi Juan! Quote for : ₱500. Valid 7 days. Reply YES to schedule. 🙏'
  )
})

test('greetingName greets a real person by first name', () => {
  assert.equal(greetingName('Juan Dela Cruz'), 'Juan')
  assert.equal(greetingName('  Maria  '), 'Maria')
})

test('greetingName falls back to po when the platform gave us no name', () => {
  assert.equal(greetingName('messenger 1234567'), 'po')
  assert.equal(greetingName('viber VIBER_777'), 'po')
  assert.equal(greetingName('09171234567'), 'po')
  assert.equal(greetingName(''), 'po')
  assert.equal(greetingName(null), 'po')
})

test('the ack auto-reply reads naturally for an unnamed Messenger customer', () => {
  assert.equal(
    renderTemplate('ack', { name: greetingName('messenger 1234567') }),
    'Salamat po! Natanggap na po namin ang message niyo. We will get back to you shortly. 🙏'
  )
})
