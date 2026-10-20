import { test } from 'node:test'
import assert from 'node:assert/strict'
import { cashAccounts, cashTimeline, collectionQueue, currencyBlocked, customerExposure, DecisionDataSchema, emptyScenario, readiness, shiftDate, type DecisionData } from '../decision-center'

const today = '2026-10-20'
function fixture(): DecisionData {
  return {
    accounts: [{ id: 1, name: 'بانک', account_type: 'checking', balance: 1000, currency: 'IRT', is_active: true }],
    customers: [{ id: 1, name: 'مشتری', phone: '09120000000' }],
    checks: [{ id: 1, account_id: 1, amount: 300, due_date: today, direction: 'issued', status: 'pending', counterparty_name: 'فروشنده' }],
    invoices: [{ id: 1, customer_id: 1, amount: 200, due_date: today, paid_date: null, status: 'issued' }],
  }
}

test('baseline deducts outgoing checks, not uncertain receivables', () => {
  const plan = cashTimeline(fixture(), today, 7)
  assert.equal(plan.length, 7)
  assert.equal(plan[0].balance, 700)
  assert.equal(plan[6].balance, 700)
})

test('overdue outgoing check is reserved once on day zero', () => {
  const data = fixture()
  data.checks[0].due_date = '2026-10-01'
  assert.deepEqual(cashTimeline(data, today, 2).map(d => d.outflow), [300, 0])
})

test('cleared and voided checks do not become new obligations', () => {
  const data = fixture()
  data.checks[0].status = 'cleared'
  assert.equal(cashTimeline(data, today, 1)[0].balance, 1000)
  data.checks[0].status = 'voided'
  assert.equal(cashTimeline(data, today, 1)[0].outflow, 0)
})

test('purchase happens once and daily costs recur', () => {
  const plan = cashTimeline(fixture(), today, 3, { ...emptyScenario, purchase: 500, purchaseDay: 1, dailyExpense: 10 })
  assert.deepEqual(plan.map(d => d.balance), [690, 180, 170])
})

test('receipt delay and percentage are user assumptions', () => {
  const plan = cashTimeline(fixture(), today, 3, { ...emptyScenario, receiptPercent: 50, receiptDelay: 1 })
  assert.deepEqual(plan.map(d => d.inflow), [0, 100, 0])
})

test('delayed receipt beyond horizon is excluded', () => {
  const plan = cashTimeline(fixture(), today, 7, { ...emptyScenario, receiptPercent: 100, receiptDelay: 30 })
  assert.equal(plan.reduce((sum, d) => sum + d.inflow, 0), 0)
})

test('overdue and paid invoices never enter hypothetical future receipts', () => {
  const data = fixture()
  data.invoices[0].due_date = '2026-10-19'
  assert.equal(cashTimeline(data, today, 2, { ...emptyScenario, receiptPercent: 100 })[0].inflow, 0)
  data.invoices[0].due_date = today
  data.invoices[0].status = 'paid'
  assert.equal(cashTimeline(data, today, 2, { ...emptyScenario, receiptPercent: 100 })[0].inflow, 0)
})

test('mixed currencies block calculation instead of being silently added', () => {
  const data = fixture()
  data.accounts[0].currency = 'IRR'
  assert.equal(currencyBlocked(data), true)
  assert.deepEqual(cashTimeline(data, today, 7), [])
})

test('pending check without a supported cash account blocks calculation', () => {
  const data = fixture()
  data.checks[0].account_id = 99
  assert.equal(currencyBlocked(data), true)
})

test('investment and inactive balances are not spendable cash', () => {
  const data = fixture()
  data.accounts.push({ ...data.accounts[0], id: 2, account_type: 'investment', balance: 999999 })
  data.accounts.push({ ...data.accounts[0], id: 3, is_active: false })
  assert.equal(cashAccounts(data).length, 1)
})

test('aging uses due date rather than stale status and prioritizes oldest', () => {
  const data = fixture()
  data.invoices.push({ ...data.invoices[0], id: 2, due_date: '2026-09-01' })
  data.invoices.push({ ...data.invoices[0], id: 3, due_date: '2026-10-19', amount: 999 })
  const queue = collectionQueue(data, today)
  assert.deepEqual(queue.map(i => i.id), [2, 3, 1])
  assert.deepEqual(queue.map(i => i.bucket), ['older', 'week', 'current'])
})

test('aging boundaries distinguish seven and thirty days', () => {
  const data = fixture()
  data.invoices = [7, 8, 30, 31].map((days, index) => ({ ...data.invoices[0], id: index, due_date: shiftDate(today, -days) }))
  assert.deepEqual(collectionQueue(data, today).map(i => i.bucket), ['older', 'month', 'month', 'week'])
})

test('no payment history is unknown, not a zero-risk score', () => {
  assert.equal(customerExposure(fixture(), today)[0].averageDelay, null)
})

test('paid invoices compute actual non-negative settlement delay', () => {
  const data = fixture()
  data.invoices[0] = { ...data.invoices[0], due_date: '2026-10-10', paid_date: '2026-10-13', status: 'paid' }
  const customer = customerExposure(data, today)[0]
  assert.equal(customer.averageDelay, 3)
  assert.equal(customer.openAmount, 0)
})

test('readiness flags missing contacts and overdue issued checks', () => {
  const data = fixture()
  data.customers[0].phone = null
  data.checks[0].due_date = '2026-10-19'
  assert.equal(readiness(data, today).find(r => r.id === 'contacts')?.ok, false)
  assert.equal(readiness(data, today).find(r => r.id === 'checks')?.ok, false)
})

test('empty data is handled without invented sample balances', () => {
  const data = { accounts: [], invoices: [], checks: [], customers: [] }
  assert.deepEqual(collectionQueue(data, today), [])
  assert.deepEqual(customerExposure(data, today), [])
  assert.equal(readiness(data, today)[0].ok, false)
})

test('invalid API amounts and unknown statuses are rejected', () => {
  const data = fixture()
  assert.equal(DecisionDataSchema.safeParse(data).success, true)
  data.invoices[0].amount = NaN
  assert.equal(DecisionDataSchema.safeParse(data).success, false)
  assert.equal(DecisionDataSchema.safeParse({ ...fixture(), invoices: [{ ...fixture().invoices[0], status: 'unknown' }] }).success, false)
})

test('impossible calendar dates are rejected before calculation', () => {
  const data = fixture()
  data.invoices[0].due_date = '2026-02-30'
  assert.equal(DecisionDataSchema.safeParse(data).success, false)
  data.invoices[0].due_date = '2026-13-01'
  assert.equal(DecisionDataSchema.safeParse(data).success, false)
})

test('calendar date arithmetic crosses year boundaries without local timezone shifts', () => {
  assert.equal(shiftDate('2026-12-31', 1), '2027-01-01')
})

test('simulation never mutates financial inputs', () => {
  const data = fixture()
  const before = structuredClone(data)
  cashTimeline(data, today, 30, { ...emptyScenario, purchase: 200 })
  assert.deepEqual(data, before)
})
