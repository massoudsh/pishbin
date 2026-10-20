'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Navbar from '@/components/layout/Navbar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Stat } from '@/components/ui/stat'
import { apiClient } from '@/lib/api'
import { formatCurrency, formatDate, formatNumber } from '@/lib/utils'
import { cashAccounts, cashTimeline, collectionQueue, currencyBlocked, customerExposure, DecisionDataSchema, emptyScenario, readiness, shiftDate, tehranToday, type DecisionData, type Scenario } from '@/lib/decision-center'

const sections = [
  { id: 'calendar', label: 'تقویم نقدینگی', description: 'چه روزی به پول نیاز دارم؟' },
  { id: 'scenario', label: 'آزمایش تصمیم', description: 'این خرید چه اثری دارد؟' },
  { id: 'collections', label: 'صف وصول', description: 'امروز از چه کسی پیگیری کنم؟' },
  { id: 'customers', label: 'رفتار مشتریان', description: 'کدام رابطه نیاز به توجه دارد؟' },
  { id: 'readiness', label: 'کیفیت داده', description: 'چقدر می‌توانم به اعداد تکیه کنم؟' },
] as const
const fieldClass = 'mt-2 w-full rounded-xl border border-border bg-background p-3 text-foreground'
const linkClass = 'inline-flex items-center justify-center rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted'

export default function DecisionsPage() {
  const [data, setData] = useState<DecisionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [unauthorized, setUnauthorized] = useState(false)
  const [active, setActive] = useState<(typeof sections)[number]['id']>('calendar')
  const [today, setToday] = useState(tehranToday)
  const [updatedAt, setUpdatedAt] = useState('')
  const [days, setDays] = useState(30)
  const [scenario, setScenario] = useState<Scenario>(emptyScenario)
  const [bucket, setBucket] = useState('all')
  const [query, setQuery] = useState('')
  const [notice, setNotice] = useState('')
  const [reminder, setReminder] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    setData(null)
    setUnauthorized(false)
    try {
      const [accounts, checks, invoices, customers] = await Promise.all([
        apiClient.getAccounts(), apiClient.getChecks(), apiClient.getInvoices(), apiClient.getCustomers(),
      ])
      if (accounts.length >= 100) {
        setError('فهرست حساب‌ها به سقف دریافت این نسخه رسیده است؛ برای جلوگیری از محاسبه با مانده ناقص، میز تصمیم نمایش داده نمی‌شود.')
        return
      }
      setData(DecisionDataSchema.parse({ accounts, checks, invoices, customers }))
      setToday(tehranToday())
      setUpdatedAt(new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }))
    } catch (err) {
      const status = (err as { response?: { status?: number } }).response?.status
      setUnauthorized(status === 401)
      setError(status === 401 ? 'برای مشاهده اطلاعات واقعی کسب‌وکارتان وارد شوید.' : 'دریافت یا اعتبارسنجی اطلاعات کامل نشد. برای جلوگیری از تصمیم اشتباه، اعداد ناقص یا نمونه نمایش نمی‌دهیم.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const baseline = useMemo(() => data ? cashTimeline(data, today, days) : [], [data, today, days])
  const simulated = useMemo(() => data ? cashTimeline(data, today, days, scenario) : [], [data, today, days, scenario])
  const queue = useMemo(() => data ? collectionQueue(data, today) : [], [data, today])
  const exposures = useMemo(() => data ? customerExposure(data, today) : [], [data, today])
  const checks = data ? readiness(data, today) : []
  const blocked = data ? currencyBlocked(data) || cashAccounts(data).length === 0 : true
  const firstShortage = baseline.find(day => day.balance < 0)
  const scenarioShortage = simulated.find(day => day.balance < 0)
  const currentBalance = data ? cashAccounts(data).reduce((sum, a) => sum + a.balance, 0) : 0
  const overdueTotal = queue.filter(i => i.daysLate > 0).reduce((sum, i) => sum + i.amount, 0)
  const selected = sections.find(s => s.id === active)!

  function updateScenario(key: keyof Scenario, value: string, max: number) {
    const number = Number(value)
    if (Number.isFinite(number)) setScenario(previous => ({ ...previous, [key]: Math.min(max, Math.max(0, Math.floor(number))) }))
  }

  function exportCalendar() {
    const rows = ['date,inflow_toman,outflow_toman,balance_toman', ...baseline.map(row => `${row.date},${row.inflow},${row.outflow},${row.balance}`)]
    const url = URL.createObjectURL(new Blob(['\uFEFF' + rows.join('\n')], { type: 'text/csv;charset=utf-8' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `pishbin-cash-plan-${today}.csv`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  async function copyReminder(text: string) {
    setReminder(text)
    try {
      await navigator.clipboard.writeText(text)
      setNotice('متن پیگیری کپی شد؛ هیچ پیامکی ارسال نشده است.')
    } catch {
      setNotice('کپی خودکار در دسترس نیست؛ متن زیر را انتخاب و کپی کنید.')
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main id="main-content" className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
        <header className="relative overflow-hidden rounded-3xl border border-border bg-surface p-6 sm:p-9">
          <div className="absolute inset-y-0 end-0 w-1 bg-accent" aria-hidden="true" />
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div className="max-w-2xl space-y-3">
              <Badge variant="accent">پیش‌بین / میز تصمیم کسب‌وکار</Badge>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">قبل از تصمیم، فردا را ببین.</h1>
              <p className="leading-8 text-muted-foreground">از میان فاکتورها، چک‌ها و مانده حساب‌ها، به یک سؤال روشن برسید: امروز چه کاری برای نقدینگی‌ام انجام دهم؟</p>
            </div>
            <div className="space-y-3 text-sm">
              <p>{formatDate(`${today}T12:00:00Z`)}</p>
              <Button variant="outline" onClick={load} disabled={loading}>{loading ? 'در حال دریافت…' : 'به‌روزرسانی داده‌ها'}</Button>
              {updatedAt && !loading && !error && <p className="text-xs text-muted-foreground">آخرین دریافت: {updatedAt}</p>}
            </div>
          </div>
        </header>

        {loading ? <div role="status" className="rounded-2xl border border-border p-10 text-center">در حال دریافت حساب‌ها، چک‌ها، فاکتورها و مشتریان…</div> : error ? (
          <Card><CardContent className="space-y-4 pt-5"><p role="alert">{error}</p>{unauthorized ? <Link className={linkClass} href="/login">ورود به حساب</Link> : <Button onClick={load}>تلاش دوباره</Button>}</CardContent></Card>
        ) : data && (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Stat label="مانده حساب‌های نقدی" value={blocked ? 'نیاز به بررسی' : formatCurrency(currentBalance)} hint="بدون وام، کارت اعتباری و سرمایه‌گذاری" />
              <Stat label="اولین کسری در برنامه پایه" value={blocked ? 'نامشخص' : firstShortage ? formatDate(`${firstShortage.date}T12:00:00Z`) : 'در این بازه دیده نشد'} hint="فقط تعهدات چک؛ نه تضمین کفایت نقدینگی" />
              <Stat label="مطالبات معوق" value={formatCurrency(overdueTotal)} hint="از فاکتورهای باز؛ به معنی پول در دسترس نیست" />
              <Stat label="موارد نیازمند بررسی" value={formatNumber(checks.filter(c => !c.ok).length)} hint="شاخص کیفیت داده، نه امتیاز اعتباری" />
            </div>

            <div className="grid items-start gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
              <nav aria-label="ابزارهای تصمیم‌گیری" className="grid gap-2 sm:grid-cols-2 lg:sticky lg:top-20 lg:grid-cols-1">
                {sections.map((section, index) => (
                  <button key={section.id} type="button" aria-pressed={active === section.id} onClick={() => setActive(section.id)} className={`rounded-2xl border p-4 text-start transition-colors ${active === section.id ? 'border-accent bg-accent/10' : 'border-border bg-surface hover:bg-muted'}`}>
                    <span className="mb-2 block text-xs text-muted-foreground">{formatNumber(index + 1, { minimumIntegerDigits: 2 })}</span>
                    <span className="block font-semibold">{section.label}</span>
                    <span className="mt-2 block text-xs leading-6 text-muted-foreground">{section.description}</span>
                  </button>
                ))}
              </nav>
              <section aria-label={selected.label} className="min-w-0 space-y-5">
                <div><h2 className="text-2xl font-bold">{selected.label}</h2><p className="mt-2 text-muted-foreground">{selected.description}</p></div>

                {(active === 'calendar' || active === 'scenario') && (
                  <>
                    <div className="flex flex-wrap items-center gap-3">
                      <label htmlFor="horizon">بازه بررسی</label>
                      <select id="horizon" className="rounded-xl border border-border bg-surface p-2" value={days} onChange={e => { const next = Number(e.target.value); setDays(next); setScenario(s => ({ ...s, purchaseDay: Math.min(s.purchaseDay, next - 1) })) }}>
                        {[7, 30, 90].map(n => <option key={n} value={n}>{formatNumber(n)} روز</option>)}
                      </select>
                      <Badge variant="outline">تمام مبالغ: تومان</Badge>
                    </div>
                    <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm leading-7 text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
                      {blocked ? 'محاسبه متوقف است: یک حساب نقدی تومانی لازم است و حساب ارزی یا چک متصل به حساب نامعتبر باید بررسی شود.' : 'این برنامه بر اساس تعهدات ثبت‌شده است، نه پیش‌بینی هوش مصنوعی. درآمد احتمالی، هزینه روزمره، اقساط و تراکنش تکرارشونده در پایه لحاظ نشده‌اند. چک صادره معوق امروز پرداخت‌پذیر فرض می‌شود.'}
                    </div>
                  </>
                )}

                {active === 'calendar' && !blocked && (
                  <Card>
                    <CardHeader className="gap-3"><CardTitle>برنامه روزانه پرداخت</CardTitle><CardDescription>موجودی پایان روز پس از کسر چک‌های صادره؛ فاکتور و چک دریافتی فقط در سناریوی انتخابی وارد می‌شوند.</CardDescription><div><Button variant="outline" size="sm" onClick={exportCalendar}>دریافت برنامه CSV</Button></div></CardHeader>
                    <CardContent><div className="max-h-[460px] overflow-auto rounded-xl border border-border">
                      <table className="w-full min-w-[460px] text-start text-sm"><caption className="sr-only">برنامه روزانه تعهدات نقدی به تومان</caption><thead className="bg-muted"><tr>{['روز', 'تعهد پرداخت', 'مانده پایان روز', 'سند'].map(label => <th key={label} scope="col" className="p-3 text-start">{label}</th>)}</tr></thead><tbody>
                        {baseline.map(day => <tr key={day.date} className={`border-t border-border ${day.balance < 0 ? 'bg-red-50 dark:bg-red-950/20' : ''}`}>
                          <td className="p-3 whitespace-nowrap">{formatDate(`${day.date}T12:00:00Z`)}</td><td className="p-3">{formatCurrency(day.outflow)}</td><td className="p-3 font-semibold">{formatCurrency(day.balance)}{day.balance < 0 && <span className="block text-xs text-destructive">کسری</span>}</td><td className="p-3">{day.checkIds.map(id => <Link className="me-2 text-accent underline" key={id} href={`/checks#check-${id}`}>چک {formatNumber(id)}</Link>)}</td>
                        </tr>)}
                      </tbody></table>
                    </div></CardContent>
                  </Card>
                )}

                {active === 'scenario' && !blocked && (
                  <Card><CardHeader><CardTitle>اگر این تصمیم را بگیرم…</CardTitle><CardDescription>تغییرات فقط همین‌جا محاسبه می‌شوند؛ هیچ پرداخت یا سندی ثبت نمی‌شود.</CardDescription></CardHeader><CardContent className="space-y-6">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label htmlFor="purchase">مبلغ خرید یا پرداخت جدید (تومان)<input id="purchase" className={fieldClass} type="number" min="0" max="1000000000000" step="1" value={scenario.purchase} onChange={e => updateScenario('purchase', e.target.value, 1e12)} /></label>
                      <label htmlFor="purchase-day">چند روز بعد پرداخت شود؟<input id="purchase-day" className={fieldClass} type="number" min="0" max={days - 1} value={scenario.purchaseDay} onChange={e => updateScenario('purchaseDay', e.target.value, days - 1)} /><span className="mt-1 block text-xs text-muted-foreground">{formatDate(`${shiftDate(today, scenario.purchaseDay)}T12:00:00Z`)}</span></label>
                      <label htmlFor="daily-expense">هزینه روزمره تخمینی در هر روز (تومان)<input id="daily-expense" className={fieldClass} type="number" min="0" max="1000000000000" step="1" value={scenario.dailyExpense} onChange={e => updateScenario('dailyExpense', e.target.value, 1e12)} /></label>
                      <label htmlFor="receipt-delay">تأخیر فرضی وصول (روز)<input id="receipt-delay" className={fieldClass} type="number" min="0" max="90" value={scenario.receiptDelay} onChange={e => updateScenario('receiptDelay', e.target.value, 90)} /></label>
                    </div>
                    <label htmlFor="receipt-percent" className="block">سهم فرضی وصول مطالبات آینده: {formatNumber(scenario.receiptPercent)}٪<input id="receipt-percent" className="mt-3 w-full accent-emerald-600" type="range" min="0" max="100" step="10" value={scenario.receiptPercent} onChange={e => updateScenario('receiptPercent', e.target.value, 100)} /></label>
                    <p className="text-sm leading-7 text-muted-foreground">درصد وصول، فرض شماست نه احتمال آماری. فاکتور و چک دریافتی مرتبط ممکن است یک طلب باشند؛ تا رفع هم‌پوشانی درصد را صفر نگه دارید. مطالبات معوق هرگز خودکار وارد سناریو نمی‌شوند. فاکتورهای فعلی بر مبنای تومان در نظر گرفته می‌شوند.</p>
                    <div aria-live="polite" className="grid gap-3 sm:grid-cols-2">
                      <Stat label="مانده پایان بازه / پایه" value={formatCurrency(baseline[baseline.length - 1].balance)} />
                      <Stat label="مانده پایان بازه / سناریو" value={formatCurrency(simulated[simulated.length - 1].balance)} />
                      <Stat label="کمترین مانده سناریو" value={formatCurrency(Math.min(currentBalance, ...simulated.map(d => d.balance)))} />
                      <Stat label="اولین کسری سناریو" value={scenarioShortage ? formatDate(`${scenarioShortage.date}T12:00:00Z`) : 'دیده نشد'} hint="فقط در محدوده فرض‌های واردشده" />
                    </div>
                    <Button variant="outline" onClick={() => setScenario(emptyScenario)}>بازگشت به برنامه پایه</Button>
                  </CardContent></Card>
                )}

                {active === 'collections' && (
                  <>
                    <div className="flex flex-wrap gap-3">
                      <label htmlFor="aging" className="sr-only">فیلتر سررسید</label><select id="aging" value={bucket} onChange={e => setBucket(e.target.value)} className="rounded-xl border border-border bg-surface p-3">
                        {[['all', 'همه مطالبات باز'], ['current', 'هنوز معوق نشده'], ['week', '۱ تا ۷ روز تأخیر'], ['month', '۸ تا ۳۰ روز تأخیر'], ['older', 'بیش از ۳۰ روز تأخیر']].map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                      </select>
                      <label htmlFor="customer-search" className="sr-only">جستجوی مشتری</label><input id="customer-search" type="search" placeholder="نام مشتری…" className="rounded-xl border border-border bg-surface p-3" value={query} onChange={e => setQuery(e.target.value)} />
                    </div>
                    <p className="text-sm text-muted-foreground">اولویت: تأخیر بیشتر، سپس مبلغ بیشتر. این رتبه‌بندی امتیاز اعتباری نیست.</p>
                    <div className="space-y-3">
                      {queue.filter(i => (bucket === 'all' || i.bucket === bucket) && (i.customer?.name ?? '').includes(query.trim())).map(invoice => (
                        <Card key={invoice.id}><CardContent className="flex flex-wrap items-center justify-between gap-4 pt-5">
                          <div className="space-y-2"><h3 className="font-semibold">{invoice.customer?.name || `مشتری ${formatNumber(invoice.customer_id)}`}</h3><p>{formatCurrency(invoice.amount)}</p><p className="text-xs text-muted-foreground">فاکتور {formatNumber(invoice.id)} · {formatDate(`${invoice.due_date}T12:00:00Z`)}</p><Badge variant={invoice.daysLate ? 'warning' : 'neutral'}>{invoice.daysLate ? `${formatNumber(invoice.daysLate)} روز تأخیر` : 'سررسید امروز یا آینده'}</Badge></div>
                          <div className="flex flex-wrap gap-2"><Link className={linkClass} href={`/invoices#invoice-${invoice.id}`}>بررسی فاکتور</Link><Button variant="outline" size="sm" onClick={() => copyReminder(`سلام ${invoice.customer?.name || ''}، بابت فاکتور شماره ${formatNumber(invoice.id)} به مبلغ ${formatCurrency(invoice.amount)} با سررسید ${formatDate(`${invoice.due_date}T12:00:00Z`)}، لطفاً زمان پرداخت را اعلام کنید. سپاسگزاریم.`)}>کپی متن پیگیری</Button></div>
                        </CardContent></Card>
                      ))}
                      {!queue.some(i => (bucket === 'all' || i.bucket === bucket) && (i.customer?.name ?? '').includes(query.trim())) && <p className="rounded-2xl border border-dashed border-border p-8">مطالبه‌ای با این فیلتر پیدا نشد. <Link href="/invoices" className="text-accent underline">مدیریت فاکتورها</Link></p>}
                    </div>
                    {reminder && <div className="space-y-2"><p role="status" className="text-sm">{notice}</p><label htmlFor="reminder" className="text-sm">متن آماده برای بازبینی و ارسال دستی</label><textarea id="reminder" readOnly value={reminder} rows={4} className={fieldClass} /></div>}
                  </>
                )}

                {active === 'customers' && (
                  <div className="space-y-4">
                    <p className="text-sm leading-7 text-muted-foreground">بر پایه فاکتورهای خودتان؛ نه استعلام صیاد و نه اعتبارسنجی رسمی. نبود سابقه به معنی کم‌ریسک بودن نیست.</p>
                    {exposures.length === 0 && <Link className={linkClass} href="/customers">ثبت اولین مشتری</Link>}
                    {exposures.map(customer => <Card key={customer.id}><CardHeader><div className="flex flex-wrap items-center justify-between gap-2"><CardTitle>{customer.name}</CardTitle><Badge variant={customer.overdue > 0 ? 'warning' : 'neutral'}>{customer.overdue > 0 ? 'مطالبه معوق دارد' : customer.paidCount === 0 ? 'سابقه پرداخت ناکافی' : 'معوق ثبت‌شده ندارد'}</Badge></div></CardHeader><CardContent>
                      <dl className="grid gap-4 text-sm sm:grid-cols-3"><div><dt className="text-muted-foreground">مانده مطالبات</dt><dd className="mt-2 font-semibold">{formatCurrency(customer.openAmount)}</dd></div><div><dt className="text-muted-foreground">از این مبلغ، معوق</dt><dd className="mt-2 font-semibold">{formatCurrency(customer.overdue)}</dd></div><div><dt className="text-muted-foreground">میانگین تأخیر تسویه</dt><dd className="mt-2 font-semibold">{customer.averageDelay === null ? 'داده کافی نیست' : `${formatNumber(customer.averageDelay)} روز / ${formatNumber(customer.paidCount)} فاکتور`}</dd></div></dl>
                      <Link href={`/customers#customer-${customer.id}`} className="mt-4 inline-block text-sm text-accent underline">بررسی پرونده و اطلاعات تماس</Link>
                    </CardContent></Card>)}
                  </div>
                )}

                {active === 'readiness' && (
                  <Card><CardHeader><CardTitle>قبل از اعتماد به عددها</CardTitle><CardDescription>وجود داده را بررسی می‌کنیم، نه صحت مانده بانک یا کامل بودن دفتر مالی.</CardDescription></CardHeader><CardContent className="space-y-5">
                    {checks.map(check => <div key={check.id} className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-5"><div className="max-w-md"><Badge variant={check.ok ? 'success' : 'warning'}>{check.ok ? 'مانع ثبت‌شده ندارد' : 'نیازمند بررسی'}</Badge><h3 className="mt-2 font-semibold">{check.title}</h3><p className="mt-2 text-sm leading-7 text-muted-foreground">{check.detail}</p></div><Link className={linkClass} href={check.href}>بررسی و اصلاح</Link></div>)}
                    <div className="rounded-xl bg-muted p-4 text-sm leading-7">قدم بعد: صورت‌حساب بانک را با دفتر تطبیق دهید؛ بدون انجام این مرحله نمی‌توان صحت مانده را تأیید کرد.<div className="mt-3"><Link href="/reconciliation" className={linkClass}>شروع تطبیق بانکی</Link></div></div>
                  </CardContent></Card>
                )}
              </section>
            </div>
            <footer className="border-t border-border pt-5 text-xs leading-7 text-muted-foreground">دامنه این نسخه: همه داده‌های متعلق به کاربر؛ تفکیک شعبه هنوز اعمال نمی‌شود. هیچ وجهی جابه‌جا نمی‌شود و هیچ پیامکی خودکار ارسال نمی‌شود. برای سند جدید، از فرم اصلی استفاده کنید.</footer>
          </>
        )}
      </main>
    </div>
  )
}
