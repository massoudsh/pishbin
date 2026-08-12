'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { apiClient } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'
import Link from 'next/link'
import { format } from 'date-fns'
import Navbar from '@/components/layout/Navbar'
import IncomeExpenseBar from '@/components/charts/IncomeExpenseBar'
import ExpenseChart from '@/components/charts/ExpenseChart'
import NetBurnCashChartExact from '@/components/charts/NetBurnCashChartExact'
import { SpendingBarsExact, RevenueBarsExact } from '@/components/charts/SpendingRevenueBarsExact'
import { BudgetAlerts } from '@/components/dashboard/BudgetAlerts'
import { CashFlowAlert } from '@/components/dashboard/CashFlowAlert'
import { KpiStripExact } from '@/components/dashboard/KpiStripExact'
import { BurnIntelligence } from '@/components/dashboard/BurnIntelligence'
import { DashboardSkeleton } from '@/components/ui/Skeleton'
import type { FounderOverview } from '@/lib/schemas/founder'
import { fa } from '@/lib/fa'

function InvestorExportBar() {
  const [exporting, setExporting] = useState(false)
  const handleExportCsv = async () => {
    setExporting(true)
    try {
      const blob = await apiClient.exportTransactions()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'pishbin-transactions.csv'
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setExporting(false)
    }
  }
  return (
    <div className="flex flex-wrap gap-3 mb-6 p-4 rounded-xl border border-gray-700 bg-gray-800/80">
      <span className="text-sm font-medium text-gray-300">{fa.common.export}:</span>
      <button type="button" onClick={() => window.print()} className="px-4 py-2 rounded-md bg-emerald-600 text-white hover:bg-emerald-500 text-sm font-medium">
        PDF
      </button>
      <button type="button" onClick={handleExportCsv} disabled={exporting} className="px-4 py-2 rounded-md border border-gray-600 bg-gray-700 text-gray-300 hover:bg-gray-600 text-sm font-medium disabled:opacity-50">
        {exporting ? fa.common.loading : 'CSV'}
      </button>
      <span className="text-sm text-gray-500 self-center">{fa.dashboard.shareableLinkComing}</span>
    </div>
  )
}
import type { DashboardSummary } from '@/lib/schemas/dashboard'
import type { Accounts } from '@/lib/schemas/account'

function DashboardPageContent() {
  const searchParams = useSearchParams()
  const [founderOverview, setFounderOverview] = useState<FounderOverview | null>(null)
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [accounts, setAccounts] = useState<Accounts>([])
  const [loading, setLoading] = useState(true)
  const [isGuest, setIsGuest] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [investorMode, setInvestorMode] = useState(false)
  const [chartsOpen, setChartsOpen] = useState(true)
  const [paymentBanner, setPaymentBanner] = useState<{ type: 'success' | 'failed'; message?: string; refId?: string } | null>(null)
  const [dashboardUser, setDashboardUser] = useState<{ dashboard_preferences?: { widget_ids?: string[] } | null } | null>(null)

  const DEFAULT_WIDGET_IDS = ['kpi', 'burn', 'charts', 'quick_links', 'accounts', 'recent']
  const widgetIds = (dashboardUser?.dashboard_preferences?.widget_ids?.length ? dashboardUser.dashboard_preferences.widget_ids : DEFAULT_WIDGET_IDS) as string[]

  useEffect(() => {
    loadDashboard()
  }, [])

  useEffect(() => {
    const payment = searchParams.get('payment')
    if (payment === 'success') {
      setPaymentBanner({
        type: 'success',
        refId: searchParams.get('ref_id') || undefined,
        message: searchParams.get('amount_rials') ? `پرداخت ${new Intl.NumberFormat('fa-IR').format(Number(searchParams.get('amount_rials')))} ریال انجام شد.` : 'پرداخت انجام شد.',
      })
    } else if (payment === 'failed') {
      setPaymentBanner({
        type: 'failed',
        message: searchParams.get('message') || 'Payment failed or was cancelled.',
      })
    }
  }, [searchParams])

  const DASHBOARD_TIMEOUT_MS = 15000

  const loadDashboard = async () => {
    setLoading(true)
    setLoadError(null)
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('TIMEOUT')), DASHBOARD_TIMEOUT_MS)
    )
    const [coreResult, userResult] = await Promise.allSettled([
      Promise.race([
        Promise.all([
          apiClient.getFounderOverview(),
          apiClient.getDashboardSummary(),
          apiClient.getAccounts(),
        ]),
        timeoutPromise,
      ]),
      apiClient.getCurrentUser().catch(() => null),
    ])
    if (coreResult.status === 'fulfilled') {
      const [overview, summaryData, accountsData] = coreResult.value
      setFounderOverview(overview)
      setSummary(summaryData)
      setAccounts(accountsData)
    } else {
      const err = coreResult.reason as { message?: string; response?: { status?: number } }
      console.error('Failed to load dashboard:', err)
      if (err?.response?.status === 401) setIsGuest(true)
      else if (err?.message === 'TIMEOUT') setLoadError('timeout')
      else setLoadError('error')
    }
    setDashboardUser(userResult.status === 'fulfilled' && userResult.value ? userResult.value : null)
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950">
        <Navbar />
        <main id="main-content" className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
          <DashboardSkeleton />
        </main>
      </div>
    )
  }

  if (isGuest) {
    const guestSummary: DashboardSummary = {
      total_balance: 0,
      month_income: 0,
      month_expenses: 0,
      month_net: 0,
      active_budgets: 0,
      active_goals: 0,
      recent_transactions: [],
    }

    const guestAccounts = [
      { id: 1, name: 'Checking', account_type: 'CHECKING', balance: 2450.12, currency: 'IRT' },
      { id: 2, name: 'Savings', account_type: 'SAVINGS', balance: 12850.0, currency: 'IRT' },
      { id: 3, name: 'Credit Card', account_type: 'CREDIT_CARD', balance: -420.55, currency: 'IRT' },
    ]

    const guestExpensesByCategory = [
      { name: 'Groceries', value: 520 },
      { name: 'Rent', value: 1800 },
      { name: 'Transport', value: 210 },
      { name: 'Dining', value: 140 },
      { name: 'Subscriptions', value: 65 },
    ]

    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 dark:bg-gray-900">
        <Navbar />

        <main id="main-content" className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="mb-6 rounded-xl border border-yellow-200 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-900/20 px-4 py-3 text-yellow-900 dark:text-yellow-200">
              {fa.dashboard.youAreIn}<span className="font-semibold">{fa.dashboard.guestMode}</span>{fa.dashboard.youAreInSuffix} {fa.dashboard.guestModeDesc}
            </div>

            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{fa.nav.overview}</h2>
                <p className="text-sm text-gray-600 mt-1">{fa.dashboard.sampleDashboard}</p>
              </div>
              <Link
                href="/register"
                className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 text-sm font-medium"
              >
                {fa.common.createAccount}
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
                <p className="text-sm text-gray-500">{fa.dashboard.totalBalance}</p>
                <p className="mt-2 text-2xl font-semibold text-gray-900">{formatCurrency(14879.57)}</p>
                <p className="mt-1 text-xs text-gray-500">{guestAccounts.length} {fa.dashboard.acrossAccounts}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
                <p className="text-sm text-gray-500">{fa.dashboard.incomeMonth}</p>
                <p className="mt-2 text-2xl font-semibold text-green-700">{formatCurrency(4200)}</p>
                <p className="mt-1 text-xs text-gray-500">{fa.dashboard.thisMonthToDate}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
                <p className="text-sm text-gray-500">{fa.dashboard.expensesMonth}</p>
                <p className="mt-2 text-2xl font-semibold text-red-700">{formatCurrency(2735)}</p>
                <p className="mt-1 text-xs text-gray-500">{fa.dashboard.thisMonthToDate}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
                <p className="text-sm text-gray-500">{fa.dashboard.netMonth}</p>
                <p className="mt-2 text-2xl font-semibold text-gray-900">۳۵٪</p>
                <p className="mt-1 text-xs text-gray-500">{fa.dashboard.budgetsAndGoals}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5 lg:col-span-2">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-base font-semibold text-gray-900">{fa.dashboard.cashflowSnapshot}</h3>
                  <span className="text-xs text-gray-500">{fa.dashboard.last30Days}</span>
                </div>
                <IncomeExpenseBar
                  data={[
                    { name: '30d', income: 4200, expenses: 2735, net: 1465 },
                  ]}
                />
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-base font-semibold text-gray-900">{fa.dashboard.spendingByCategory}</h3>
                  <span className="text-xs text-gray-500">نمونه</span>
                </div>
                <ExpenseChart data={guestExpensesByCategory} />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
                <h3 className="text-base font-semibold text-gray-900 mb-2">{fa.nav.accounts}</h3>
                <div className="space-y-3">
                  {guestAccounts.map((a) => (
                    <div key={a.id} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{a.name}</p>
                        <p className="text-xs text-gray-500">{a.account_type.replace('_', ' ')}</p>
                      </div>
                      <p className="text-sm font-semibold text-gray-900">{formatCurrency(a.balance)}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
                <h3 className="text-base font-semibold text-gray-900 mb-2">{fa.dashboard.recentActivity}</h3>
                <p className="text-sm text-gray-600">
                  {fa.dashboard.signInToTrack}
                </p>
                <div className="mt-4 flex gap-3">
                  <Link href="/register" className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 text-sm font-medium">
                    {fa.common.createAccount}
                  </Link>
                  <Link href="/login" className="px-4 py-2 rounded-md border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50">
                    {fa.common.signIn}
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    )
  }

  if (loadError || (!founderOverview && !isGuest)) {
    return (
      <div className="min-h-screen bg-gray-950">
        <Navbar />
        <main className="min-h-[60vh] flex flex-col items-center justify-center px-4">
          <p className="text-lg font-medium text-red-400">
            {loadError === 'timeout' ? 'زمان اتصال به سرور تمام شد.' : fa.dashboard.failedToLoad}
          </p>
          <p className="mt-2 text-sm text-gray-400 text-center max-w-md">
            {fa.dashboard.apiUnreachable}
          </p>
          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={() => loadDashboard()}
              disabled={loading}
              className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-500 disabled:opacity-50 text-sm font-medium"
            >
              {loading ? fa.common.loading : fa.common.retry}
            </button>
            <Link
              href="/onboarding"
              className="px-4 py-2 rounded-md border border-gray-600 text-gray-300 hover:bg-gray-800 text-sm font-medium"
            >
              راهنمای شروع
            </Link>
          </div>
        </main>
      </div>
    )
  }

  const cashBalance = founderOverview!.kpis.cash_balance?.value ?? 0

  return (
    <div className="min-h-screen bg-gray-950">
      <Navbar />

      <main id="main-content" className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {paymentBanner && (
  <div
              className={`mb-4 rounded-lg border px-4 py-3 flex items-center justify-between ${
                paymentBanner.type === 'success'
                  ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200'
                  : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'
              }`}
            >
              <span>{paymentBanner.message}</span>
              <button
                type="button"
                onClick={() => setPaymentBanner(null)}
                className="ml-2 text-current opacity-70 hover:opacity-100"
                aria-label="Dismiss"
              >
                ×
              </button>
            </div>
          )}
          <CashFlowAlert />
          <BudgetAlerts />

          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
                {fa.dashboard.titleBeforeRealtime}<span className="text-emerald-400">{fa.dashboard.realtime}</span>{fa.dashboard.titleAfterRealtime}
              </h1>
              <p className="text-sm text-gray-400">{fa.dashboard.founderOverview}</p>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <span className="text-sm font-medium text-gray-300">{fa.dashboard.investorMode}</span>
              <input
                type="checkbox"
                checked={investorMode}
                onChange={(e) => setInvestorMode(e.target.checked)}
                className="rounded border-gray-600 bg-gray-700 text-emerald-500 focus:ring-emerald-500"
              />
            </label>
          </div>

          {widgetIds.includes('kpi') && <KpiStripExact kpis={founderOverview!.kpis} />}

          {widgetIds.includes('burn') && (
            <div className="mb-6">
              <BurnIntelligence burn={founderOverview!.burn} />
            </div>
          )}

          {widgetIds.includes('quick_links') && !investorMode && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6 print:hidden">
              <Link href="/transactions" className="rounded-xl border border-gray-700 bg-gray-800 p-4 text-center hover:bg-gray-700/50 transition">
<span className="text-sm font-medium text-white">{fa.dashboard.addTransaction}</span>
            </Link>
            <Link href="/accounts" className="rounded-xl border border-gray-700 bg-gray-800 p-4 text-center hover:bg-gray-700/50 transition">
                <span className="text-sm font-medium text-white">{fa.dashboard.addAccount}</span>
              </Link>
              <Link href="/reports" className="rounded-xl border border-gray-700 bg-gray-800 p-4 text-center hover:bg-gray-700/50 transition">
                <span className="text-sm font-medium text-white">{fa.nav.reports}</span>
              </Link>
              <Link href="/investors" className="rounded-xl border border-gray-700 bg-gray-800 p-4 text-center hover:bg-gray-700/50 transition">
                <span className="text-sm font-medium text-white">ARR / MRR</span>
              </Link>
            </div>
          )}

          {investorMode && (
            <InvestorExportBar />
          )}

          {widgetIds.includes('charts') && (
            <>
              <button
                type="button"
                onClick={() => setChartsOpen((o) => !o)}
                className="flex items-center gap-2 mb-4 text-sm font-medium text-gray-400 hover:text-white transition"
              >
                {fa.dashboard.charts} {chartsOpen ? '^' : '∨'}
              </button>
              {chartsOpen && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
              <div className="bg-gray-800/80 rounded-xl border border-gray-700 p-5 lg:col-span-2">
                <h3 className="text-base font-semibold text-white mb-2">{fa.dashboard.netBurnAndCash}</h3>
                <NetBurnCashChartExact data={founderOverview!.sparkline_months} cashBalance={cashBalance} />
              </div>
              <div className="space-y-4">
                <div className="bg-gray-800/80 rounded-xl border border-gray-700 p-5">
                  <h3 className="text-base font-semibold text-white mb-2">{fa.dashboard.spending} &gt;</h3>
                  <SpendingBarsExact data={founderOverview!.sparkline_months} />
                </div>
                <div className="bg-gray-800/80 rounded-xl border border-gray-700 p-5">
                  <h3 className="text-base font-semibold text-white mb-2">{fa.dashboard.revenue} &gt;</h3>
                  <RevenueBarsExact data={founderOverview!.sparkline_months} />
                </div>
              </div>
            </div>
              )}
            </>
          )}

          {widgetIds.includes('accounts') || widgetIds.includes('recent') ? (
          <>
          <div className="flex items-center justify-between gap-4 mb-4">
            <h2 className="text-lg font-semibold text-white">{fa.dashboard.accountsAndActivity}</h2>
            <div className="flex gap-2 print:hidden">
              <button type="button" onClick={() => window.print()} className="px-4 py-2 rounded-md border border-gray-600 bg-gray-800 text-sm font-medium text-gray-300 hover:bg-gray-700">
                {fa.common.print} / PDF
              </button>
              <Link href="/transactions" className="px-4 py-2 rounded-md border border-gray-600 bg-gray-800 text-sm font-medium text-gray-300 hover:bg-gray-700">
                {fa.dashboard.addTransaction}
              </Link>
              <Link href="/accounts" className="bg-emerald-600 text-white px-4 py-2 rounded-md hover:bg-emerald-500 text-sm font-medium">
                {fa.dashboard.addAccount}
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {widgetIds.includes('accounts') && (
            <div className="bg-gray-800/80 rounded-xl border border-gray-700 p-5">
              <h3 className="text-base font-semibold text-white mb-4">{fa.nav.accounts}</h3>
              {accounts.length === 0 ? (
                <p className="text-sm text-gray-400">{fa.dashboard.noAccountsYet}</p>
              ) : (
                <div className="space-y-3">
                  {accounts.slice(0, 6).map((a) => (
                    <div key={a.id} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-white">{a.name}</p>
                        <p className="text-xs text-gray-400">{a.account_type.replace('_', ' ')}</p>
                      </div>
                      <p className="text-sm font-semibold text-white">{formatCurrency(a.balance, a.currency)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
            )}
            {widgetIds.includes('recent') && (
            <div className="bg-gray-800/80 rounded-xl border border-gray-700 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold text-white">{fa.dashboard.recentTransactions}</h3>
                <Link href="/transactions" className="text-sm text-emerald-400 hover:text-emerald-300">{fa.common.viewAll}</Link>
              </div>
              {(summary?.recent_transactions?.length ?? 0) === 0 ? (
                <p className="text-sm text-gray-400">{fa.dashboard.noTransactionsYet}</p>
              ) : (
                <div className="divide-y divide-gray-700">
                  {(summary!.recent_transactions).map((t) => (
                    <div key={t.id} className="py-3 flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white truncate">{t.description || 'Transaction'}</p>
                        <p className="text-xs text-gray-400">{format(new Date(t.date), 'PP')}</p>
                      </div>
                      <div className="text-right">
                        <p className={['text-sm font-semibold', t.type === 'income' ? 'text-emerald-400' : 'text-red-400'].join(' ')}>
                          {t.type === 'income' ? '+' : '-'}
                          {formatCurrency(t.amount)}
                        </p>
                        <p className="text-xs text-gray-400 capitalize">{t.type}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            )}
          </div>
          </>
          ) : null}
        </div>
      </main>
    </div>
  )
}


export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    }>
      <DashboardPageContent />
    </Suspense>
  )
}
