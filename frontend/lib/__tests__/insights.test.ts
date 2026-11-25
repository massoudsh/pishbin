import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  collectionPriorities, followUpMessage, obligationCapacity, paymentReliability,
  receivablesAging, thirteenWeekView,
} from '../insights'
import { DecisionDataSchema } from '../decision-center'

const today = '2026-11-25'

function data(overrides: Partial<Record<string, unknown[]>> = {}) {
  return DecisionDataSchema.parse({
    accounts: [{ id: 1, name: 'جاری', account_type: 'checking', balance: 10_000_000, currency: 'IRT', is_active: true }],
    checks: [],
    invoices: [],
    customers: [{ id: 1, name: 'شرکت الف', phone: '09120000000' }],
    ...overrides,
  })
}

test('payment reliability reports unknown instead of a zero-risk score', () => {
  const result = paymentReliability(data(), today, 1)
  assert.equal(result.onTimeRate, null)
  assert.equal(result.averageDelay, null)
  assert.equal(result.hasHistory, false)
})

test('payment reliability computes on-time rate and average delay from paid invoices', () => {
  const result = paymentReliability(data({
    invoices: [
      { id: 1, customer_id: 1, amount: 1000, due_date: '2026-11-20', paid_date: '2026-11-18', status: 'paid' },
      { id: 2, customer_id: 1, amount: 1000, due_date: '2026-11-10', paid_date: '2026-11-20', status: 'paid' },
    ],
  }), today, 1)
  assert.equal(result.onTimeRate, 0.5)
  assert.equal(result.averageDelay, 5) // (0 clamped + 10) / 2
  assert.equal(result.hasHistory, true)
})

test('bounced cheques count only when settled and tied to the customer name', () => {
  const result = paymentReliability(data({
    checks: [
      { id: 1, account_id: 1, amount: 500, due_date: '2026-11-01', direction: 'received', status: 'bounced', counterparty_name: 'شرکت الف' },
      { id: 2, account_id: 1, amount: 500, due_date: '2026-11-01', direction: 'received', status: 'pending', counterparty_name: 'شرکت الف' },
      { id: 3, account_id: 1, amount: 500, due_date: '2026-11-01', direction: 'received', status: 'bounced', counterparty_name: 'شخص دیگر' },
    ],
  }), today, 1)
  assert.equal(result.settledChecks, 1)
  assert.equal(result.bouncedChecks, 1)
})

test('collection priorities are ordered and every rank carries a reason', () => {
  const priorities = collectionPriorities(data({
    invoices: [
      { id: 1, customer_id: 1, amount: 100, due_date: '2026-11-24', paid_date: null, status: 'overdue' },
      { id: 2, customer_id: 1, amount: 100, due_date: '2026-12-30', paid_date: null, status: 'issued' },
    ],
  }), today)
  assert.deepEqual(priorities.map(p => p.invoiceId), [1, 2])
  for (const priority of priorities) assert.ok(priority.reasons.length > 0)
})

test('thirteen week view returns exactly 13 weeks and never guesses inflow', () => {
  const weeks = thirteenWeekView(data(), today)
  assert.equal(weeks.length, 13)
  assert.deepEqual(weeks.map(w => w.inflow), Array(13).fill(0))
  assert.equal(weeks[0].closing, 10_000_000)
})

test('thirteen week view reserves overdue issued cheques in week one', () => {
  const weeks = thirteenWeekView(data({
    checks: [{ id: 1, account_id: 1, amount: 2_000_000, due_date: '2026-10-01', direction: 'issued', status: 'pending', counterparty_name: 'تأمین‌کننده' }],
  }), today)
  assert.equal(weeks[0].outflow, 2_000_000)
  assert.equal(weeks[0].closing, 8_000_000)
  assert.equal(weeks.slice(1).reduce((sum, w) => sum + w.outflow, 0), 0)
})

test('thirteen week view fails closed on foreign-currency cash', () => {
  assert.deepEqual(thirteenWeekView(data({
    accounts: [{ id: 1, name: 'دلاری', account_type: 'checking', balance: 100, currency: 'USD' }],
  }), today), [])
})

test('obligation capacity bands are arithmetic, with unknown when cash is zero', () => {
  assert.equal(obligationCapacity(data(), today).band, 'ample')
  const strained = obligationCapacity(data({
    checks: [{ id: 1, account_id: 1, amount: 9_500_000, due_date: '2026-12-01', direction: 'issued', status: 'pending', counterparty_name: 'x' }],
  }), today)
  assert.equal(strained.band, 'strained')
  assert.equal(obligationCapacity(data({ accounts: [{ id: 1, name: 'x', account_type: 'checking', balance: 0, currency: 'IRT' }] }), today).band, 'unknown')
})

test('receivables aging uses due dates and sums back to open invoices', () => {
  const rows = receivablesAging(data({
    invoices: [
      { id: 1, customer_id: 1, amount: 100, due_date: '2026-12-01', paid_date: null, status: 'issued' },
      { id: 2, customer_id: 1, amount: 200, due_date: '2026-11-22', paid_date: null, status: 'overdue' },
      { id: 3, customer_id: 1, amount: 400, due_date: '2026-09-01', paid_date: null, status: 'overdue' },
      { id: 4, customer_id: 1, amount: 999, due_date: '2026-10-01', paid_date: '2026-10-02', status: 'paid' },
    ],
  }), today)
  assert.deepEqual(rows.map(r => r.amount), [100, 200, 0, 400, 0])
  assert.equal(rows.reduce((sum, r) => sum + r.amount, 0), 700)
})

test('follow-up message uses real invoice data and stays empty for unknown ids', () => {
  const d = data({ invoices: [{ id: 7, customer_id: 1, amount: 5000, due_date: '2026-11-20', paid_date: null, status: 'overdue' }] })
  const message = followUpMessage(d, 7, today)
  assert.match(message, /شرکت الف/)
  assert.match(message, /7/)
  assert.match(message, /5 روز/)
  assert.equal(followUpMessage(d, 999, today), '')
})
