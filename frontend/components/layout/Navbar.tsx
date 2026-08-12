'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useMemo, useState, useRef } from 'react'
import Button from '@/components/ui/Button'
import { ThemeToggle } from '@/components/ThemeToggle'
import { apiClient } from '@/lib/api'
import { formatCurrency, formatNumber } from '@/lib/utils'
import { fa } from '@/lib/fa'

interface AlertItem {
  budget_id: number
  budget_name: string
  spent: number
  budget_amount: number
  percentage: number
  alert_type: string
}

export default function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const [isAuthed, setIsAuthed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [alerts, setAlerts] = useState<AlertItem[]>([])
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const notificationsRef = useRef<HTMLDivElement>(null)

  const navItems = useMemo(
    () => [
      { href: '/dashboard', label: fa.nav.overview },
      { href: '/reports', label: fa.nav.runway },
      { href: '/reports', label: fa.nav.revenue },
      { href: '/transactions', label: fa.nav.expenses },
      { href: '/reports', label: fa.nav.reports },
      { href: '/investors', label: fa.nav.investors },
      { href: '/recurring', label: fa.nav.automations },
      { href: '/checks', label: fa.nav.checks },
      { href: '/invoices', label: fa.nav.invoices },
      { href: '/customers', label: fa.nav.customers },
      { href: '/reconciliation', label: fa.nav.reconciliation },
      { href: '/accounts', label: fa.nav.accounts },
      { href: '/payments', label: fa.nav.payments },
      { href: '/help', label: fa.settings.help },
    ],
    []
  )

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    setIsAuthed(Boolean(token))
  }, [pathname])

  useEffect(() => {
    setMobileMenuOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!isAuthed) return
    apiClient.getAlerts().then(setAlerts).catch(() => setAlerts([]))
  }, [isAuthed, pathname])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false)
      }
    }
    if (notificationsOpen) document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [notificationsOpen])

  const handleLogout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    setIsAuthed(false)
    setMobileMenuOpen(false)
    router.replace('/dashboard')
  }

  return (
    <nav className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border-b border-gray-200/80 dark:border-gray-700/80 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-primary-500 text-white flex items-center justify-center font-bold text-sm shadow-sm">
                PB
              </div>
              <div className="font-semibold text-gray-900 dark:text-white">پیش‌بین</div>
              {!isAuthed && (
                <span className="mr-1 text-xs font-medium bg-yellow-50 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 border border-yellow-200 dark:border-yellow-700 px-2 py-0.5 rounded-full hidden sm:inline">
                  {fa.common.guest}
                </span>
              )}
            </Link>

            <div className="hidden sm:flex items-center gap-1">
              {navItems.map((item, i) => {
                const active = pathname === item.href
                return (
                  <Link
                    key={`nav-${i}-${item.label}`}
                    href={item.href}
                    className={[
                      'px-3 py-2 rounded-xl text-sm font-medium transition-colors',
                      active
                        ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                        : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100/80 dark:hover:bg-gray-800/80',
                    ].join(' ')}
                  >
                    {item.label}
                  </Link>
                )
              })}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isAuthed && (
              <div className="relative" ref={notificationsRef}>
                <button
                  type="button"
                  onClick={() => setNotificationsOpen((o) => !o)}
                  className="relative p-2 rounded-md text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  aria-label={alerts.length > 0 ? `${alerts.length} ${fa.nav.notifications}` : fa.nav.notifications}
                  aria-expanded={notificationsOpen}
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  {alerts.length > 0 && (
                    <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-medium text-white">
                      {alerts.length > 9 ? '9+' : alerts.length}
                    </span>
                  )}
                </button>
                {notificationsOpen && (
                  <div className="absolute right-0 mt-2 w-72 rounded-2xl border border-gray-200/90 dark:border-gray-700/90 bg-white dark:bg-gray-800 shadow-soft-lg py-2 z-50">
                    <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700">
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">{fa.nav.notifications}</span>
                    </div>
                    {alerts.length === 0 ? (
                      <p className="px-3 py-4 text-sm text-gray-500 dark:text-gray-400">{fa.nav.noNewAlerts}</p>
                    ) : (
                      <ul className="max-h-64 overflow-y-auto">
                        {alerts.map((a) => (
                          <li key={a.budget_id}>
                            <Link
                              href="/budgets"
                              onClick={() => setNotificationsOpen(false)}
                              className="block px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700/50"
                            >
                              <span className="font-medium text-gray-900 dark:text-white">{a.budget_name}</span>
                              <span className={a.alert_type === 'critical' ? ' text-red-600 dark:text-red-400' : ' text-gray-600 dark:text-gray-400'}>
                                {' '}{formatCurrency(a.spent)} / {formatCurrency(a.budget_amount)} ({formatNumber(Math.round(a.percentage))}٪)
                              </span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                    {alerts.length > 0 && (
                      <Link
                        href="/budgets"
                        onClick={() => setNotificationsOpen(false)}
                        className="block px-3 py-2 text-sm font-medium text-primary-600 dark:text-primary-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 border-t border-gray-100 dark:border-gray-700"
                      >
                        {fa.nav.viewAllBudgets} ←
                      </Link>
                    )}
                  </div>
                )}
              </div>
            )}
            <ThemeToggle />
            <button
              type="button"
              className="sm:hidden p-2 rounded-md text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
              aria-expanded={mobileMenuOpen}
              aria-label="Toggle menu"
              onClick={() => setMobileMenuOpen((o) => !o)}
            >
              <span className="sr-only">Toggle menu</span>
              {mobileMenuOpen ? (
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>

            <div className="hidden sm:flex items-center gap-2">
              {isAuthed ? (
                <>
                  <Link href="/settings" className="text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
                    {fa.common.settings}
                  </Link>
                  <Button variant="secondary" onClick={handleLogout}>
                    {fa.common.signOut}
                  </Button>
                </>
              ) : (
                <>
                  <Link href="/login" className="text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
                    {fa.common.signIn}
                  </Link>
                  <Link href="/register">
                    <Button>{fa.common.createAccount}</Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="sm:hidden border-t border-gray-200 dark:border-gray-700 py-4">
            <div className="flex flex-col gap-1">
              {navItems.map((item, i) => {
                const active = pathname === item.href
                return (
                  <Link
                    key={`mobile-nav-${i}-${item.label}`}
                    href={item.href}
                    className={[
                      'px-3 py-2 rounded-xl text-sm font-medium transition-colors',
                      active
                        ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                        : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100/80 dark:hover:bg-gray-800/80',
                    ].join(' ')}
                  >
                    {item.label}
                  </Link>
                )
              })}
              <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700 flex flex-col gap-1">
                {isAuthed ? (
                  <>
                    <Link href="/settings" className="px-3 py-2 rounded-md text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
                      {fa.common.settings}
                    </Link>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="px-3 py-2 rounded-md text-sm font-medium text-right text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      {fa.common.signOut}
                    </button>
                  </>
                ) : (
                  <>
                    <Link href="/login" className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800">
                      {fa.common.signIn}
                    </Link>
                    <Link href="/register" className="px-3 py-2 rounded-md text-sm font-medium bg-primary-600 text-white hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600 text-center">
                      {fa.common.createAccount}
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}

