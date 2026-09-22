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
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Stat } from '@/components/ui/stat'
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
    <Card className="mb-6 flex flex-wrap items-center gap-3 p-4">
      <span className="text-sm font-medium text-muted-foreground">{fa.common.export}:</span>
      <Button size="sm" onClick={() => window.print()}>
        PDF
      </Button>
      <Button size="sm" variant="outline" onClick={handleExportCsv} disabled={exporting}>
        {exporting ? fa.common.loading : 'CSV'}
      </Button>
      <span className="self-center text-sm text-muted-foreground">{fa.dashboard.shareableLinkComing}</span>
    </Card>
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
      <div className="min-h-screen bg-background">
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
      <div className="min-h-screen bg-background">
        <Navbar />

        <main id="main-content" className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="mb-6 rounded-xl border border-yellow-200 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-900/20 px-4 py-3 text-yellow-900 dark:text-yellow-200">
              {fa.dashboard.youAreIn}<span className="font-semibold">{fa.dashboard.guestMode}</span>{fa.dashboard.youAreInSuffix} {fa.dashboard.guestModeDesc}
            </div>

            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <h2 className="text-2xl font-bold text-foreground">{fa.nav.overview}</h2>
                <p className="text-sm text-muted-foreground mt-1">{fa.dashboard.sampleDashboard}</p>
              </div>
              <Link href="/register">
                <Button>{fa.common.createAccount}</Button>
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <Stat
                label={fa.dashboard.totalBalance}
                value={formatCurrency(14879.57)}
                hint={`${guestAccounts.length} ${fa.dashboard.acrossAccounts}`}
              />
              <Stat
                label={fa.dashboard.incomeMonth}
                value={formatCurrency(4200)}
                hint={fa.dashboard.thisMonthToDate}
                valueClassName="text-emerald-700 dark:text-emerald-400"
              />
              <Stat
                label={fa.dashboard.expensesMonth}
                value={formatCurrency(2735)}
                hint={fa.dashboard.thisMonthToDate}
                valueClassName="text-red-700 dark:text-red-400"
              />
              <Stat
                label={fa.dashboard.netMonth}
                value="۳۵٪"
                hint={fa.dashboard.budgetsAndGoals}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
              <Card className="lg:col-span-2">
                <CardHeader className="flex-row items-center justify-between pb-0">
                  <CardTitle>{fa.dashboard.cashflowSnapshot}</CardTitle>
                  <span className="text-xs text-muted-foreground">{fa.dashboard.last30Days}</span>
                </CardHeader>
                <CardContent>
                  <IncomeExpenseBar
                    data={[
                      { name: '30d', income: 4200, expenses: 2735, net: 1465 },
                    ]}
                  />
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex-row items-center justify-between pb-0">
                  <CardTitle>{fa.dashboard.spendingByCategory}</CardTitle>
                  <span className="text-xs text-muted-foreground">نمونه</span>
                </CardHeader>
                <CardContent>
                  <ExpenseChart data={guestExpensesByCategory} />
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>{fa.nav.accounts}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {guestAccounts.map((a) => (
                    <div key={a.id} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-foreground">{a.name}</p>
                        <p className="text-xs text-muted-foreground">{a.account_type.replace('_', ' ')}</p>
                      </div>
                      <p className="text-sm font-semibold text-foreground">{formatCurrency(a.balance)}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>{fa.dashboard.recentActivity}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {fa.dashboard.signInToTrack}
                  </p>
                  <div className="mt-4 flex gap-3">
                    <Link href="/register">
                      <Button>{fa.common.createAccount}</Button>
                    </Link>
                    <Link href="/login">
                      <Button variant="outline">{fa.common.signIn}</Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    )
  }

  if (loadError || (!founderOverview && !isGuest)) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="min-h-[60vh] flex flex-col items-center justify-center px-4">
          <p className="text-lg font-medium text-destructive">
            {loadError === 'timeout' ? 'زمان اتصال به سرور تمام شد.' : fa.dashboard.failedToLoad}
          </p>
          <p className="mt-2 text-sm text-muted-foreground text-center max-w-md">
            {fa.dashboard.apiUnreachable}
          </p>
          <div className="mt-6 flex gap-3">
            <Button onClick={() => loadDashboard()} disabled={loading}>
              {loading ? fa.common.loading : fa.common.retry}
            </Button>
            <Link href="/onboarding">
              <Button variant="outline">راهنمای شروع</Button>
            </Link>
          </div>
        </main>
      </div>
    )
  }

  const cashBalance = founderOverview!.kpis.cash_balance?.value ?? 0

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main id="main-content" className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {paymentBanner && (
            <div
              className={`mb-4 flex items-center justify-between rounded-lg border px-4 py-3 ${
                paymentBanner.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                  : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'
              }`}
            >
              <span>{paymentBanner.message}</span>
              <button
                type="button"
                onClick={() => setPaymentBanner(null)}
                className="ms-2 text-current opacity-70 hover:opacity-100"
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
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
                {fa.dashboard.titleBeforeRealtime}<span className="text-accent">{fa.dashboard.realtime}</span>{fa.dashboard.titleAfterRealtime}
              </h1>
              <p className="text-sm text-muted-foreground">{fa.dashboard.founderOverview}</p>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <span className="text-sm font-medium text-muted-foreground">{fa.dashboard.investorMode}</span>
              <input
                type="checkbox"
                checked={investorMode}
                onChange={(e) => setInvestorMode(e.target.checked)}
                className="rounded border-border bg-surface text-accent focus:ring-emerald-500"
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
              <Link href="/transactions" className="rounded-xl border border-border bg-surface p-4 text-center transition hover:bg-muted/60">
                <span className="text-sm font-medium text-foreground">{fa.dashboard.addTransaction}</span>
              </Link>
              <Link href="/accounts" className="rounded-xl border border-border bg-surface p-4 text-center transition hover:bg-muted/60">
                <span className="text-sm font-medium text-foreground">{fa.dashboard.addAccount}</span>
              </Link>
              <Link href="/reports" className="rounded-xl border border-border bg-surface p-4 text-center transition hover:bg-muted/60">
                <span className="text-sm font-medium text-foreground">{fa.nav.reports}</span>
              </Link>
              <Link href="/investors" className="rounded-xl border border-border bg-surface p-4 text-center transition hover:bg-muted/60">
                <span className="text-sm font-medium text-foreground">ARR / MRR</span>
              </Link>
            </div>
          )}

          {investorMode && (
            <InvestorExportBar />
          )}

          {widgetIds.includes('charts') && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setChartsOpen((o) => !o)}
                className="mb-4"
              >
                {fa.dashboard.charts} {chartsOpen ? '^' : '∨'}
              </Button>
              {chartsOpen && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
                  <Card className="lg:col-span-2">
                    <CardHeader>
                      <CardTitle>{fa.dashboard.netBurnAndCash}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <NetBurnCashChartExact data={founderOverview!.sparkline_months} cashBalance={cashBalance} />
                    </CardContent>
                  </Card>
                  <div className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle>{fa.dashboard.spending} &gt;</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <SpendingBarsExact data={founderOverview!.sparkline_months} />
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader>
                        <CardTitle>{fa.dashboard.revenue} &gt;</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <RevenueBarsExact data={founderOverview!.sparkline_months} />
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}
            </>
          )}

          {widgetIds.includes('accounts') || widgetIds.includes('recent') ? (
          <>
          <div className="flex items-center justify-between gap-4 mb-4">
            <h2 className="text-lg font-semibold text-foreground">{fa.dashboard.accountsAndActivity}</h2>
            <div className="flex gap-2 print:hidden">
              <Button variant="outline" size="sm" onClick={() => window.print()}>
                {fa.common.print} / PDF
              </Button>
              <Link href="/transactions">
                <Button variant="outline" size="sm">{fa.dashboard.addTransaction}</Button>
              </Link>
              <Link href="/accounts">
                <Button size="sm">{fa.dashboard.addAccount}</Button>
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {widgetIds.includes('accounts') && (
            <Card>
              <CardHeader>
                <CardTitle>{fa.nav.accounts}</CardTitle>
              </CardHeader>
              <CardContent>
                {accounts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{fa.dashboard.noAccountsYet}</p>
                ) : (
                  <div className="space-y-3">
                    {accounts.slice(0, 6).map((a) => (
                      <div key={a.id} className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-foreground">{a.name}</p>
                          <p className="text-xs text-muted-foreground">{a.account_type.replace('_', ' ')}</p>
                        </div>
                        <p className="text-sm font-semibold text-foreground">{formatCurrency(a.balance, a.currency)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
            )}
            {widgetIds.includes('recent') && (
            <Card>
              <CardHeader className="flex-row items-center justify-between pb-0">
                <CardTitle>{fa.dashboard.recentTransactions}</CardTitle>
                <Link href="/transactions" className="text-sm text-accent hover:opacity-80">{fa.common.viewAll}</Link>
              </CardHeader>
              <CardContent className="pt-3">
                {(summary?.recent_transactions?.length ?? 0) === 0 ? (
                  <p className="text-sm text-muted-foreground">{fa.dashboard.noTransactionsYet}</p>
                ) : (
                  <div className="divide-y divide-border">
                    {(summary!.recent_transactions).map((t) => (
                      <div key={t.id} className="py-3 flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{t.description || 'Transaction'}</p>
                          <p className="text-xs text-muted-foreground">{format(new Date(t.date), 'PP')}</p>
                        </div>
                        <div className="text-right">
                          <p className={['text-sm font-semibold', t.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'].join(' ')}>
                            {t.type === 'income' ? '+' : '-'}
                            {formatCurrency(t.amount)}
                          </p>
                          <p className="text-xs text-muted-foreground capitalize">{t.type}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    }>
      <DashboardPageContent />
    </Suspense>
  )
}
