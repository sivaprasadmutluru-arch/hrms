import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'

// Load the real slice with a deterministic API boundary; no browser or real
// employee credentials are needed to exercise the request lifecycle.
const require = createRequire(import.meta.url)
let source = await readFile(new URL('../src/features/leave/leaveSlice.js', import.meta.url), 'utf8')
source = source.replace("'@reduxjs/toolkit'", JSON.stringify(pathToFileURL(require.resolve('@reduxjs/toolkit')).href))
source = source.replace("import api from '../../services/api'", 'const api = globalThis.leaveTestApi')
globalThis.leaveTestApi = { get: async () => ({ data: [] }) }
const { default: reducer, fetchLeaveTypes } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`)

test('loading clears the previous company types', () => {
  const state = reducer({ ...reducer(undefined, { type: 'init' }), leaveTypes: [{ id: 19 }] }, fetchLeaveTypes.pending('new', 55))
  assert.deepEqual(state.leaveTypes, [])
  assert.equal(state.leaveTypesLoading, true)
})

test('late previous-company response cannot overwrite current types', () => {
  let state = reducer(undefined, fetchLeaveTypes.pending('old', 6))
  state = reducer(state, fetchLeaveTypes.pending('new', 55))
  state = reducer(state, fetchLeaveTypes.fulfilled([{ id: 30 }], 'new', 55))
  state = reducer(state, fetchLeaveTypes.fulfilled([{ id: 19 }], 'old', 6))
  assert.deepEqual(state.leaveTypes, [{ id: 30 }])
  assert.equal(state.leaveTypesLoading, false)
})

test('type errors remain visible independently of other leave requests', () => {
  let state = reducer(undefined, fetchLeaveTypes.pending('current', 6))
  state = reducer(state, fetchLeaveTypes.rejected(new Error('failure'), 'current', 6, 'NO_ACTIVE_COMPANY_ASSIGNMENT'))
  assert.equal(state.leaveTypesError, 'NO_ACTIVE_COMPANY_ASSIGNMENT')
  assert.deepEqual(state.leaveTypes, [])
})

test('request sends the explicit active company and returns its types', async () => {
  globalThis.leaveTestApi.get = async (url, config) => {
    assert.equal(url, '/leave/types')
    assert.equal(config.headers['X-Company-Id'], '55')
    return { data: [{ id: 30, name: 'Annual Leave' }] }
  }
  const action = await fetchLeaveTypes(55)(() => {}, () => ({}), undefined)
  assert.equal(action.type, fetchLeaveTypes.fulfilled.type)
  assert.equal(action.payload[0].name, 'Annual Leave')
})

test('invalid API payload produces an error, not an empty dropdown', async () => {
  globalThis.leaveTestApi.get = async () => ({ data: { message: 'unexpected' } })
  const action = await fetchLeaveTypes(6)(() => {}, () => ({}), undefined)
  assert.equal(action.type, fetchLeaveTypes.rejected.type)
  assert.equal(action.payload, 'Invalid leave-type response')
})
