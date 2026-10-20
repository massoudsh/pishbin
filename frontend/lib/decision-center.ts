import { z } from 'zod'

const amount = z.coerce.number().finite().nonnegative()
const dateKey = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
  const date = new Date(`${value}T12:00:00Z`)
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
}, 'Invalid calendar date')
export const DecisionDataSchema = z.object({
  accounts: z.array(z.object({
    id: z.number(), name: z.string(), account_type: z.string(),
    balance: z.coerce.number().finite(), currency: z.string(), is_active: z.boolean().optional(),
  })),
  checks: z.array(z.object({
    id: z.number(), account_id: z.number(), amount, due_date: dateKey,
    direction: z.enum(['issued', 'received']),
    status: z.enum(['pending', 'cleared', 'bounced', 'voided']), counterparty_name: z.string(),
  })),
  invoices: z.array(z.object({
    id: z.number(), customer_id: z.number(), amount, due_date: dateKey,
    paid_date: dateKey.nullable(), status: z.enum(['issued', 'paid', 'overdue', 'cancelled']),
  })),
  customers: z.array(z.object({ id: z.number(), name: z.string(), phone: z.string().nullable() })),
})
export type DecisionData = z.infer<typeof DecisionDataSchema>
export type Invoice = DecisionData['invoices'][number]

export function tehranToday() {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tehran', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date())
  const part = (type: string) => parts.find(p => p.type === type)!.value
  return `${part('year')}-${part('month')}-${part('day')}`
}

export function shiftDate(day: string, offset: number) {
  const date = new Date(`${day}T12:00:00Z`)
  date.setUTCDate(date.getUTCDate() + offset)
  return date.toISOString().slice(0, 10)
}

export function daysBetween(start: string, end: string) {
  return Math.round((Date.parse(`${end}T12:00:00Z`) - Date.parse(`${start}T12:00:00Z`)) / 86400000)
}

export function openInvoices(invoices: Invoice[]) {
  return invoices.filter(i => i.status === 'issued' || i.status === 'overdue')
}

export function collectionQueue(data: DecisionData, today: string) {
  return openInvoices(data.invoices).map(invoice => ({
    ...invoice,
    customer: data.customers.find(c => c.id === invoice.customer_id),
    daysLate: Math.max(0, daysBetween(invoice.due_date, today)),
    bucket: invoice.due_date >= today ? 'current' : daysBetween(invoice.due_date, today) <= 7 ? 'week' : daysBetween(invoice.due_date, today) <= 30 ? 'month' : 'older',
  })).sort((a, b) => b.daysLate - a.daysLate || b.amount - a.amount || a.id - b.id)
}

export function customerExposure(data: DecisionData, today: string) {
  return data.customers.map(customer => {
    const invoices = data.invoices.filter(i => i.customer_id === customer.id)
    const open = openInvoices(invoices)
    const late = open.filter(i => i.due_date < today)
    const paid = invoices.filter(i => i.status === 'paid' && i.paid_date)
    const overdue = late.reduce((sum, i) => sum + i.amount, 0)
    return {
      ...customer, openAmount: open.reduce((sum, i) => sum + i.amount, 0), overdue,
      oldestDays: Math.max(0, ...late.map(i => daysBetween(i.due_date, today))),
      paidCount: paid.length,
      averageDelay: paid.length ? paid.reduce((sum, i) => sum + Math.max(0, daysBetween(i.due_date, i.paid_date!)), 0) / paid.length : null,
    }
  }).sort((a, b) => b.overdue - a.overdue || b.openAmount - a.openAmount || a.id - b.id)
}

export function cashAccounts(data: DecisionData) {
  return data.accounts.filter(a => a.is_active !== false && ['checking', 'savings', 'other'].includes(a.account_type.toLowerCase()))
}

export function currencyBlocked(data: DecisionData) {
  return cashAccounts(data).some(a => a.currency !== 'IRT') || data.checks.some(c => c.status === 'pending' && !cashAccounts(data).some(a => a.id === c.account_id && a.currency === 'IRT'))
}

export type Scenario = { purchase: number; purchaseDay: number; dailyExpense: number; receiptPercent: number; receiptDelay: number }
export const emptyScenario: Scenario = { purchase: 0, purchaseDay: 0, dailyExpense: 0, receiptPercent: 0, receiptDelay: 0 }

export function cashTimeline(data: DecisionData, today: string, days: number, scenario: Scenario = emptyScenario) {
  if (currencyBlocked(data)) return []
  let balance = cashAccounts(data).reduce((sum, a) => sum + a.balance, 0)
  return Array.from({ length: days }, (_, index) => {
    const date = shiftDate(today, index)
    const issued = data.checks.filter(c => c.status === 'pending' && c.direction === 'issued' && (c.due_date === date || (index === 0 && c.due_date < today)))
    const received = data.checks.filter(c => c.status === 'pending' && c.direction === 'received' && c.due_date >= today && shiftDate(c.due_date, scenario.receiptDelay) === date)
    const invoices = openInvoices(data.invoices).filter(i => i.due_date >= today && shiftDate(i.due_date, scenario.receiptDelay) === date)
    const inflow = (received.reduce((sum, c) => sum + c.amount, 0) + invoices.reduce((sum, i) => sum + i.amount, 0)) * scenario.receiptPercent / 100
    const outflow = issued.reduce((sum, c) => sum + c.amount, 0) + scenario.dailyExpense + (index === scenario.purchaseDay ? scenario.purchase : 0)
    balance += inflow - outflow
    return { date, balance, inflow, outflow, checkIds: issued.map(c => c.id) }
  })
}

export function readiness(data: DecisionData, today: string) {
  const accounts = cashAccounts(data)
  return [
    { id: 'accounts', title: 'مانده حساب‌های نقدی', detail: 'حساب جاری، پس‌انداز و سایر؛ مانده را با بانک کنترل کنید.', ok: accounts.length > 0, href: '/accounts' },
    { id: 'currency', title: 'واحد پول قابل مقایسه', detail: 'محاسبه این نسخه فقط با حساب و چک تومانی انجام می‌شود.', ok: !currencyBlocked(data), href: '/accounts' },
    { id: 'checks', title: 'چک‌های صادره سررسیدگذشته', detail: 'وضعیت چک‌های پرداخت‌نشده قدیمی را مشخص کنید.', ok: !data.checks.some(c => c.status === 'pending' && c.direction === 'issued' && c.due_date < today), href: '/checks' },
    { id: 'contacts', title: 'راه تماس مشتریان بدهکار', detail: 'برای پیگیری، شماره تماس مشتری دارای فاکتور باز لازم است.', ok: openInvoices(data.invoices).every(i => data.customers.some(c => c.id === i.customer_id && Boolean(c.phone?.trim()))), href: '/customers' },
    { id: 'receivables', title: 'مطالبات سررسیدگذشته', detail: 'مطالبات معوق در موجودی آینده قطعی محسوب نمی‌شوند.', ok: !openInvoices(data.invoices).some(i => i.due_date < today), href: '/invoices' },
  ]
}
