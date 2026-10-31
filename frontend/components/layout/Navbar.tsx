'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/ThemeToggle'
import { apiClient, getApiErrorMessage } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'
import { shiftDate, tehranToday } from '@/lib/decision-center'
import { useAuth } from '@/contexts/AuthContext'

const navItems = [
  ['/decisions', 'میز تصمیم و نقدینگی'], ['/dashboard', 'نمای کلی'],
  ['/invoices', 'فاکتورها و مطالبات'], ['/checks', 'چک‌ها و تعهدات'],
  ['/customers', 'مشتریان'], ['/transactions', 'تراکنش‌ها'], ['/accounts', 'حساب‌ها'],
  ['/reports', 'گزارش‌ها'], ['/reconciliation', 'تطبیق بانکی'], ['/budgets', 'بودجه‌ها'],
  ['/goals', 'هدف‌ها'], ['/recurring', 'تراکنش تکرارشونده'], ['/payments', 'پرداخت‌ها'],
  ['/banking-messages', 'پیام‌های بانکی'], ['/investors', 'سرمایه‌گذاران'], ['/settings', 'تنظیمات'], ['/help', 'راهنما'],
] as const

type Notice = { id: string; title: string; detail: string; href: string }

export default function Navbar() {
  const { user, logout } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [notices, setNotices] = useState<Notice[]>([])
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  const [offline, setOffline] = useState(false)
  const shellRef = useRef<HTMLElement>(null)
  const menuRef = useRef<HTMLDetailsElement>(null)
  const noticeRef = useRef<HTMLDetailsElement>(null)
  const environment = ({ production: 'عملیاتی', staging: 'آزمایشی', development: 'توسعه', sandbox: 'تمرینی' } as Record<string, string>)[process.env.NEXT_PUBLIC_APP_ENV || ''] || 'محیط مشخص نشده'

  useEffect(() => {
    const shell = shellRef.current
    if (!shell) return
    const observer = new ResizeObserver(() => shell.style.setProperty('--app-header-height', `${shell.getBoundingClientRect().height}px`))
    observer.observe(shell)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    menuRef.current?.removeAttribute('open')
    noticeRef.current?.removeAttribute('open')
    setNotificationsOpen(false)
    setQuery('')
  }, [pathname, user?.id])

  useEffect(() => {
    const update = () => setOffline(!navigator.onLine)
    update()
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update) }
  }, [])

  useEffect(() => {
    let active = true
    setNotices([])
    setError('')
    if (!user || !notificationsOpen) return
    setLoading(true)
    const today = tehranToday()
    Promise.all([apiClient.getInvoices(), apiClient.getChecks(), apiClient.getAlerts()]).then(([invoices, checks, budgets]) => {
      if (!active) return
      setNotices([
        ...invoices.filter(i => ['issued', 'overdue'].includes(i.status) && i.due_date < today).map(i => ({ id: `invoice-${i.id}`, title: `فاکتور معوق #${i.id}`, detail: formatCurrency(Number(i.amount)), href: `/invoices#invoice-${i.id}` })),
        ...checks.filter(c => (c.status === 'pending' && c.due_date <= shiftDate(today, 7)) || (c.status === 'bounced' && c.direction === 'issued')).map(c => ({ id: `check-${c.id}`, title: c.status === 'bounced' ? 'چک صادره برگشتی' : c.direction === 'issued' ? 'تعهد پرداخت تا هفت روز آینده' : 'چک دریافتی نیازمند پیگیری', detail: `${c.counterparty_name} · ${formatCurrency(Number(c.amount))}`, href: `/checks#check-${c.id}` })),
        ...budgets.map(b => ({ id: `budget-${b.budget_id}`, title: `هشدار بودجه: ${b.budget_name}`, detail: `${formatCurrency(b.spent)} / ${formatCurrency(b.budget_amount)}`, href: '/budgets' })),
      ])
    }).catch(err => { if (active) setError(getApiErrorMessage(err)) }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [user?.id, notificationsOpen, retry, user])

  function closeOnEscape(event: React.KeyboardEvent<HTMLDetailsElement>) {
    if (event.key !== 'Escape') return
    event.currentTarget.removeAttribute('open')
    event.currentTarget.querySelector('summary')?.focus()
  }

  function navigation() {
    const items = navItems.filter(([, label]) => label.includes(query.trim()))
    return <>
      <label className="block px-2 text-sm">جست‌وجوی بخش‌ها<input type="search" value={query} onChange={event => setQuery(event.target.value)} className="my-2 w-full rounded-xl border border-border p-2" /></label>
      <nav aria-label="بخش‌های برنامه">{items.map(([href, label]) => <Link key={href} href={href} aria-current={pathname === href || pathname.startsWith(`${href}/`) ? 'page' : undefined} className="nav-link">{label}</Link>)}</nav>
      {!items.length && <p role="status" className="p-3 text-sm">بخشی با این نام پیدا نشد.</p>}
    </>
  }

  return (
    <header ref={shellRef} className="app-shell">
      <div className="app-topbar">
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/decisions" className="text-lg font-bold text-accent">پیش‌بین</Link>
          <span className="rounded-full border border-border px-2 py-1 text-xs">{environment}</span>
          <span className="text-xs text-muted-foreground">{user ? 'داده‌های همه کسب‌وکارهای شما' : 'حالت مهمان'}</span>
        </div>
        <div className="flex items-center gap-3">
          {user && <details ref={noticeRef} onKeyDown={closeOnEscape} onToggle={event => setNotificationsOpen(event.currentTarget.open)}>
            <summary className="cursor-pointer rounded-xl p-2">پیگیری‌ها</summary>
            <section aria-label="پیگیری‌های مالی" className="app-notifications glass-surface glass-elevated">
              <h2 className="font-semibold">اسناد نیازمند بررسی</h2>
              <p className="my-2 text-xs text-muted-foreground">بر اساس اسناد ثبت‌شده؛ نه پیام ارسال‌شده یا پیش‌بینی قطعی. نمایش هنگام بازکردن تازه می‌شود.</p>
              {loading ? <p role="status">در حال دریافت…</p> : error ? <div role="alert"><p>{error}</p><Button variant="outline" onClick={() => setRetry(v => v + 1)}>تلاش دوباره</Button></div> : <>
                {!notices.length && <p role="status">در اسناد دریافت‌شده موردی برای پیگیری نیست.</p>}
                <ul>{notices.slice(0, 20).map(notice => <li key={notice.id}><Link className="nav-link" href={notice.href}><span className="block font-medium">{notice.title}</span><span className="text-sm text-muted-foreground">{notice.detail}</span></Link></li>)}</ul>
                {notices.length > 20 && <p className="text-sm">۲۰ مورد نخست نمایش داده شده است؛ همه اسناد را در بخش مربوط بررسی کنید.</p>}
              </>}
              <Link className="nav-link text-accent" href="/decisions">بررسی نقدینگی و صف وصول</Link>
            </section>
          </details>}
          <ThemeToggle />
          {user ? <><Link className="text-sm" href="/settings">حساب کاربری</Link><Button variant="outline" size="sm" onClick={() => { logout(); setNotices([]); router.replace('/dashboard') }}>خروج</Button></> : <Link href="/login" className="nav-link">ورود</Link>}
        </div>
      </div>
      {offline && <p role="status" className="status-warning px-5 py-2 text-sm">اتصال اینترنت برقرار نیست؛ اطلاعات ممکن است قدیمی باشد. پیش از ثبت عملیات دوباره متصل شوید.</p>}
      <aside className="app-sidebar glass-surface glass-subtle" aria-label="ناوبری اصلی">{navigation()}</aside>
      <details ref={menuRef} className="app-mobile-menu" onKeyDown={closeOnEscape}><summary className="cursor-pointer p-2 font-medium">فهرست بخش‌ها</summary>{navigation()}</details>
    </header>
  )
}
