import { test } from 'node:test'
import assert from 'node:assert/strict'

import { isJobPhotoPath } from './job-photos.ts'

const TICKET = '11111111-1111-4111-8111-111111111111'
const OTHER = '22222222-2222-4222-8222-222222222222'

test('isJobPhotoPath counts an upload stored under the ticket', () => {
  assert.equal(isJobPhotoPath(TICKET, `${TICKET}/1757900000000-panel.jpg`), true)
})

test('isJobPhotoPath ignores customer images and other jobs', () => {
  assert.equal(isJobPhotoPath(TICKET, 'https://scontent.xx.fbcdn.net/v/t1/photo.jpg'), false)
  assert.equal(isJobPhotoPath(TICKET, `${OTHER}/1757900000000-panel.jpg`), false)
  assert.equal(isJobPhotoPath(TICKET, TICKET), false)
})
