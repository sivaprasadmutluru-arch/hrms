import test from 'node:test'
import assert from 'node:assert/strict'
import { leaveRequestActions } from '../src/features/leave/leaveRequestActions.js'

test('reviewers see approve, reject and details first for pending requests', () => {
  assert.deepEqual(leaveRequestActions({ status: 'REQUESTED', canReview: true }, false), ['approve', 'reject', 'details', 'edit', 'cancel'])
})
test('ordinary users do not gain approval access through the menu', () => {
  assert.deepEqual(leaveRequestActions({ status: 'REQUESTED', canReview: false }, false), ['details', 'edit', 'cancel'])
})
test('approved requests do not offer another approval or editing', () => {
  assert.deepEqual(leaveRequestActions({ status: 'APPROVED', canReview: true }, true), ['details', 'cancel'])
})
test('permanent deletion stays limited to authorised users and cancelled requests', () => {
  assert.deepEqual(leaveRequestActions({ status: 'CANCELLED' }, true), ['details', 'delete'])
  assert.deepEqual(leaveRequestActions({ status: 'CANCELLED' }, false), ['details'])
  assert.deepEqual(leaveRequestActions({ status: 'REJECTED', canReview: true }, true), ['details'])
})
