import { test } from 'node:test'
import assert from 'node:assert/strict'
import axios, { AxiosError, type AxiosAdapter, type AxiosInstance } from 'axios'
import { ApiClient } from '../api'
import { AccountSchema, AccountCreateSchema, AccountUpdateSchema } from '../schemas/account'

const payload = { name: 'بانک', account_type: 'checking', balance: 0, currency: 'IRT' }

test('account creation requires a positive integer business ID, while edits do not', () => {
  for (const business_id of [undefined, 0, -1, 1.5]) {
    assert.equal(AccountCreateSchema.safeParse({ ...payload, business_id }).success, false)
  }
  assert.equal(AccountCreateSchema.parse({ ...payload, business_id: 12 }).business_id, 12)
  assert.equal(AccountUpdateSchema.safeParse(payload).success, true)
})

test('account responses accept backend decimal strings but reject invalid balances', () => {
  assert.equal(AccountSchema.parse({ ...payload, id: 1, balance: '123.45' }).balance, 123.45)
  for (const balance of [null, '', 'not-money', Infinity]) {
    assert.equal(AccountSchema.safeParse({ ...payload, id: 1, balance }).success, false)
  }
})

test('authentication retries, concurrency and failure handling with an in-memory HTTP adapter', async t => {
  const storage = new Map<string, string>()
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window')
  const originalStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  Object.defineProperty(globalThis, 'window', { configurable: true, value: {} })
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
  } })
  try {
    async function run(mode: 'success' | 'rejected' | 'network' | 'retry-rejected' | 'login' | 'refresh-only' | 'logout-during-refresh') {
      storage.clear()
      if (mode !== 'refresh-only') storage.set('access_token', 'test-expired')
      storage.set('refresh_token', 'test-refresh')
      const api = new ApiClient()
      let refreshes = 0
      let requests = 0
      const adapter: AxiosAdapter = async config => {
        const response = { config, data: {}, status: 401, statusText: 'Unauthorized', headers: {} }
        if (config.url === '/auth/refresh') {
          refreshes++
          await Promise.resolve()
          if (mode === 'logout-during-refresh') api.logout()
          if (mode === 'network') throw new AxiosError('Temporary outage', 'ERR_NETWORK', config)
          if (mode === 'rejected') throw new AxiosError('Unauthorized', 'ERR_BAD_REQUEST', config, undefined, response)
          return { ...response, status: 200, data: { access_token: 'test-renewed', refresh_token: 'test-rotated', token_type: 'bearer' } }
        }
        requests++
        if (config.headers.Authorization === 'Bearer test-renewed' && mode !== 'retry-rejected') {
          return { ...response, status: 200, data: { id: 1 } }
        }
        throw new AxiosError('Unauthorized', 'ERR_BAD_REQUEST', config, undefined, response)
      }
      ;(api as unknown as { client: AxiosInstance }).client.defaults.adapter = adapter
      if (mode === 'success') {
        await Promise.all([api.getCurrentUser(), api.getCurrentUser(), api.getCurrentUser()])
        assert.equal(refreshes, 1)
        assert.equal(requests, 6)
        assert.equal(storage.get('refresh_token'), 'test-rotated')
      } else if (mode === 'refresh-only') {
        await api.getCurrentUser()
        assert.equal(refreshes, 1)
      } else if (mode === 'login') {
        await assert.rejects(api.login('test-user', 'test-password'))
        assert.equal(refreshes, 0)
        assert.equal(storage.get('refresh_token'), 'test-refresh')
      } else {
        await assert.rejects(api.getCurrentUser())
        assert.equal(refreshes, 1)
        assert.equal(storage.has('refresh_token'), mode === 'network')
        if (mode === 'retry-rejected') assert.equal(requests, 2)
      }
    }
    for (const mode of ['success', 'rejected', 'network', 'retry-rejected', 'login', 'refresh-only', 'logout-during-refresh'] as const) {
      await t.test(mode, () => run(mode))
    }
  } finally {
    if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow)
    else Reflect.deleteProperty(globalThis, 'window')
    if (originalStorage) Object.defineProperty(globalThis, 'localStorage', originalStorage)
    else Reflect.deleteProperty(globalThis, 'localStorage')
  }
})
