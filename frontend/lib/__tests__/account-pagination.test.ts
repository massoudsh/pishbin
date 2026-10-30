import { test } from 'node:test'
import assert from 'node:assert/strict'
import type { AxiosAdapter, AxiosInstance } from 'axios'
import { ApiClient } from '../api'

const account = (id: number) => ({ id, name: `Account ${id}`, account_type: 'checking', balance: '12.00', currency: 'IRT' })

function clientWith(adapter: AxiosAdapter) {
  const api = new ApiClient()
  ;(api as unknown as { client: AxiosInstance }).client.defaults.adapter = adapter
  return api
}

for (const count of [0, 99, 100, 101, 200, 250]) {
  test(`complete account loading includes ${count} accounts`, async () => {
    const calls: number[] = []
    const api = clientWith(async config => {
      assert.equal(config.url, '/accounts')
      assert.equal(config.params.limit, 100)
      const after = config.params.after_id ?? 0
      calls.push(after)
      const data = Array.from({ length: count }, (_, i) => account(i * 2 + 1)).filter(a => a.id > after).slice(0, 100)
      return { config, status: 200, statusText: 'OK', headers: {}, data }
    })
    const result = await api.getAllAccounts()
    assert.equal(result.length, count)
    assert.deepEqual(result.map(a => a.id), Array.from({ length: count }, (_, i) => i * 2 + 1))
    assert.ok(result.every(a => a.balance === 12))
    assert.equal(calls.length, Math.floor(count / 100) + 1)
  })
}

for (const mode of ['duplicate', 'unordered', 'invalid', 'failure'] as const) {
  test(`account loading fails closed on ${mode} later page`, async () => {
    let calls = 0
    const api = clientWith(async config => {
      calls++
      let data: unknown = Array.from({ length: 100 }, (_, i) => account(i + 1))
      if (calls > 1) {
        if (mode === 'failure') throw new Error('Page unavailable')
        data = mode === 'duplicate' ? [account(100)] : mode === 'unordered' ? [account(102), account(101)] : [account(101), { ...account(102), balance: null }]
      }
      return { config, status: 200, statusText: 'OK', headers: {}, data }
    })
    await assert.rejects(api.getAllAccounts())
    assert.equal(calls, 2)
  })
}
