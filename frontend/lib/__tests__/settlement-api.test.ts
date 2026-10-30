import { test } from 'node:test'
import assert from 'node:assert/strict'
import type { AxiosAdapter, AxiosInstance } from 'axios'
import { ApiClient } from '../api'

for (const kind of ['invoice', 'check'] as const) {
  for (const transaction_id of [undefined, 42]) {
    test(`${kind} settlement ${transaction_id ? 'links an existing transaction' : 'requests a new ledger entry'}`, async () => {
      const api = new ApiClient()
      const requests: Array<{ url: string | undefined; method: string | undefined; body: unknown }> = []
      const adapter: AxiosAdapter = async config => {
        requests.push({ url: config.url, method: config.method, body: JSON.parse(config.data) })
        return { config, status: 200, statusText: 'OK', headers: {}, data: { settlement_transaction_id: 42 } }
      }
      ;(api as unknown as { client: AxiosInstance }).client.defaults.adapter = adapter
      const data = { settlement_date: '2026-10-30', transaction_id }
      const result = kind === 'invoice' ? await api.settleInvoice(7, { ...data, account_id: 3 }) : await api.settleCheck(7, data)
      const body: Record<string, unknown> = { settlement_date: data.settlement_date }
      if (transaction_id !== undefined) body.transaction_id = transaction_id
      if (kind === 'invoice') body.account_id = 3
      assert.deepEqual(requests, [{ url: `/${kind === 'invoice' ? 'invoices' : 'checks'}/7/settle`, method: 'post', body }])
      assert.equal(result.settlement_transaction_id, 42)
    })
  }
}
