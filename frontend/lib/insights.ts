import { daysBetween, openInvoices, shiftDate, type DecisionData } from './decision-center'

/**
 * Five SME decision features derived only from recorded invoices, cheques and
 * customers. Everything here is an explicit, inspectable assumption; none of it
 * is a statistical prediction, a credit score, or financial advice.
 */

export function paymentReliability(data: DecisionData, today: string, customerId: number) {
  const invoices = data.invoices.filter(invoice => invoice.customer_id === customerId)
  const paid = invoices.filter(invoice => invoice.status === 'paid' && invoice.paid_date)
  const open = openInvoices(invoices)
  const onTime = paid.filter(invoice => (invoice.paid_date as string) <= invoice.due_date).length
  const delays = paid.map(invoice => daysBetween(invoice.due_date, invoice.paid_date as string))
  const receivedChecks = data.checks.filter(check => check.counterparty_name === data.customers.find(customer => customer.id === customerId)?.name)
  const settledChecks = receivedChecks.filter(check => check.status === 'cleared' || check.status === 'bounced')
  const bouncedChecks = settledChecks.filter(check => check.status === 'bounced').length
  // Conservative settlement term: observed average delay, floored at 0, and
  // never shorter than the invoice's own due date.
  const averageDelay = delays.length ? Math.round(delays.reduce((sum, delay) => sum + Math.max(0, delay), 0) / delays.length) : null
  const overdueAmount = open.filter(invoice => invoice.due_date < today).reduce((sum, invoice) => sum + invoice.amount, 0)
  return {
    customerId,
    sampleSize: paid.length,
    onTimeRate: paid.length ? onTime / paid.length : null,
    averageDelay,
    overdueAmount,
    settledChecks: settledChecks.length,
    bouncedChecks,
    hasHistory: paid.length > 0 || settledChecks.length > 0,
  }
}

export type CollectionPriority = { invoiceId: number; customerId: number; score: number; reasons: string[] }

/**
 * Ranks open invoices by a transparent score. Each reason is shown to the user,
 * so the ranking is never an unexplained "AI score".
 */
export function collectionPriorities(data: DecisionData, today: string): CollectionPriority[] {
  return openInvoices(data.invoices).map(invoice => {
    const daysLate = Math.max(0, daysBetween(invoice.due_date, today))
    const history = paymentReliability(data, today, invoice.customer_id)
    const customer = data.customers.find(c => c.id === invoice.customer_id)
    const reasons: string[] = []
    let score = 0
    if (daysLate > 0) { score += 20 + Math.min(daysLate, 90) * 2; reasons.push(`${daysLate} روز تأخیر`) }
    if (invoice.amount > 0) { score += Math.min(20, invoice.amount / 1_000_000); reasons.push('مبلغ قابل توجه') }
    if (history.averageDelay !== null && history.averageDelay >= 14) { score += 15; reasons.push(`سابقه میانگین تأخیر ${history.averageDelay} روز`) }
    if (history.bouncedChecks > 0) { score += 15; reasons.push(`${history.bouncedChecks} چک برگشتی`) }
    if (customer?.phone?.trim()) { score += 5; reasons.push('راه تماس ثبت‌شده') } else { reasons.push('بدون شماره تماس') }
    return { invoiceId: invoice.id, customerId: invoice.customer_id, score, reasons }
  }).sort((a, b) => b.score - a.score || a.invoiceId - b.invoiceId)
}

export type WeeklyRow = { weekStart: string; inflow: number; outflow: number; net: number; closing: number }

/**
 * The 13-week rolling view used by most forecasting tools. Weeks before any
 * recorded due date just show the opening position, so the number is never a
 * guess: it is the cash position if nothing else happens.
 */
export function thirteenWeekView(data: DecisionData, today: string, horizonWeeks = 13): WeeklyRow[] {
  // Mixed-currency or non-cash data cannot be summed honestly, so return nothing
  // rather than an incomplete total.
  if (data.accounts.some(a => ['checking', 'savings', 'other'].includes(a.account_type.toLowerCase()) && a.currency !== 'IRT')) return []
  let balance = data.accounts.filter(a => a.is_active !== false && ['checking', 'savings', 'other'].includes(a.account_type.toLowerCase()) && a.currency === 'IRT').reduce((sum, a) => sum + a.balance, 0)
  return Array.from({ length: horizonWeeks }, (_, week) => {
    const start = shiftDate(today, week * 7)
    const end = shiftDate(today, week * 7 + 6)
    const inWeek = (date: string) => date >= start && date <= end
    // An unpaid issued cheque already past its due date is reserved once, in the
    // first week (clamped to today), matching the decision desk.
    const outflow = data.checks.filter(c => c.direction === 'issued' && c.status !== 'voided' && c.status !== 'cleared'
      && inWeek(c.due_date < today ? today : c.due_date)).reduce((sum, c) => sum + c.amount, 0)
    const inflow = data.checks.filter(c => c.direction === 'received' && c.status === 'pending' && inWeek(c.due_date)).reduce((sum, c) => sum + c.amount, 0)
      + data.invoices.filter(i => ['issued', 'overdue'].includes(i.status) && i.due_date >= start && inWeek(i.due_date)).reduce((sum, i) => sum + i.amount, 0)
    balance += inflow - outflow
    return { weekStart: start, inflow, outflow, net: inflow - outflow, closing: balance }
  })
}

export type Capacity = { available: number; ratio: number | null; band: 'unknown' | 'strained' | 'balanced' | 'ample'; used: number }

/**
 * how much of available cash is already promised. This is arithmetic over
 * recorded obligations, not a creditworthiness rating.
 */
export function obligationCapacity(data: DecisionData, today: string): Capacity {
  if (data.accounts.some(a => ['checking', 'savings', 'other'].includes(a.account_type.toLowerCase()) && a.currency !== 'IRT')) return { available: 0, ratio: null, band: 'unknown', used: 0 }
  const available = data.accounts.filter(a => a.is_active !== false && ['checking', 'savings', 'other'].includes(a.account_type.toLowerCase()) && a.currency === 'IRT').reduce((sum, a) => sum + a.balance, 0)
  const used = data.checks.filter(c => c.direction === 'issued' && (c.status === 'pending' || c.status === 'bounced')).reduce((sum, c) => sum + c.amount, 0)
  if (available <= 0) return { available, ratio: null, band: 'unknown', used }
  const ratio = used / available
  return { available, used, ratio, band: ratio <= 0.5 ? 'ample' : ratio <= 0.9 ? 'balanced' : 'strained' }
}

export type BucketRow = { key: string; label: string; amount: number; count: number }

export function receivablesAging(data: DecisionData, today: string): BucketRow[] {
  const buckets: BucketRow[] = [
    { key: 'current', label: 'هنوز معوق نشده', amount: 0, count: 0 },
    { key: 'week', label: '۱ تا ۷ روز', amount: 0, count: 0 },
    { key: 'month', label: '۸ تا ۳۰ روز', amount: 0, count: 0 },
    { key: 'quarter', label: '۳۱ تا ۹۰ روز', amount: 0, count: 0 },
    { key: 'older', label: 'بیش از ۹۰ روز', amount: 0, count: 0 },
  ]
  for (const invoice of openInvoices(data.invoices)) {
    const late = daysBetween(invoice.due_date, today)
    const bucket = late <= 0 ? buckets[0] : late <= 7 ? buckets[1] : late <= 30 ? buckets[2] : late <= 90 ? buckets[3] : buckets[4]
    bucket.amount += invoice.amount
    bucket.count += 1
  }
  return buckets
}

export function followUpMessage(data: DecisionData, invoiceId: number, today: string) {
  const invoice = data.invoices.find(i => i.id === invoiceId)
  if (!invoice) return ''
  const customer = data.customers.find(c => c.id === invoice.customer_id)
  const history = paymentReliability(data, today, invoice.customer_id)
  const late = Math.max(0, daysBetween(invoice.due_date, today))
  const tone = history.averageDelay !== null && history.averageDelay >= 14 ? 'با توجه به همکاری‌های پیشین،' : ''
  return `سلام ${customer?.name ?? 'مشتری گرامی'}، ${tone} لطفاً وضعیت فاکتور شماره ${invoice.id} با سررسید ${invoice.due_date}${late > 0 ? ` (${late} روز گذشته)` : ''} را اعلام کنید. ممنون از همکاری شما.`
}
