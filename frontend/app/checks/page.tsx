'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Navbar from '@/components/layout/Navbar'
import { apiClient, getApiErrorMessage } from '@/lib/api'
import { formatCurrency, formatDate } from '@/lib/utils'
import { DataTable } from '@/components/ui/data-table'
import { fa } from '@/lib/fa'
import SettlementForm from '@/components/forms/SettlementForm'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface CheckRow {
  id: number
  account_id: number
  direction: 'issued' | 'received'
  counterparty_name: string
  amount: number
  bank_name: string | null
  check_number: string | null
  sayad_id: string | null
  due_date: string
  settlement_transaction_id: number | null
  status: 'pending' | 'cleared' | 'bounced' | 'voided'
  description: string | null
}

interface ForecastData {
  events: Array<{ check_id: number; due_date: string; direction: string; amount: number; counterparty_name: string }>
  total_inflow: number
  total_outflow: number
  net: number
}

const STATUS_LABEL: Record<CheckRow['status'], string> = {
  pending: fa.checks.statusPending,
  cleared: fa.checks.statusCleared,
  bounced: fa.checks.statusBounced,
  voided: fa.checks.statusVoided,
}

export default function ChecksPage() {
  const [list, setList] = useState<CheckRow[]>([])
  const [accounts, setAccounts] = useState<Array<{ id: number; name: string; currency: string }>>([])
  const [forecast, setForecast] = useState<ForecastData | null>(null)
  const [loading, setLoading] = useState(true)
  const [settlingId, setSettlingId] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    account_id: '',
    direction: 'received' as 'issued' | 'received',
    counterparty_name: '',
    amount: '',
    bank_name: '',
    check_number: '',
    sayad_id: '',
    due_date: new Date().toISOString().slice(0, 10),
    description: '',
  })

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    setError('')
    try {
      const [checks, acc, fc] = await Promise.all([
        apiClient.getChecks(),
        apiClient.getAllAccounts(),
        apiClient.getCheckCashFlowForecast(30),
      ])
      setList(Array.isArray(checks) ? (checks as CheckRow[]) : [])
      setAccounts(Array.isArray(acc) ? acc.map((a: { id: number; name: string; currency: string }) => ({ id: a.id, name: a.name, currency: a.currency })) : [])
      setForecast(fc)
    } catch (err) {
      setList([])
      setAccounts([])
      setForecast(null)
      setError(getApiErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const accountId = parseInt(form.account_id, 10)
    const amount = parseFloat(form.amount)
    if (!accountId || !amount || amount <= 0 || !form.counterparty_name.trim()) {
      setError('حساب را انتخاب کنید؛ نام طرف حساب و مبلغ مثبت را وارد کنید.')
      return
    }
    setSaving(true)
    try {
      await apiClient.createCheck({
        account_id: accountId,
        direction: form.direction,
        counterparty_name: form.counterparty_name.trim(),
        amount,
        bank_name: form.bank_name.trim() || undefined,
        check_number: form.check_number.trim() || undefined,
        sayad_id: form.sayad_id.trim() || undefined,
        due_date: form.due_date,
        description: form.description.trim() || undefined,
      })
      setForm({ ...form, counterparty_name: '', amount: '', bank_name: '', check_number: '', sayad_id: '', description: '' })
      load()
    } catch (err) {
      setError(getApiErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  async function handleStatusChange(id: number, status: CheckRow['status']) {
    try {
      await apiClient.updateCheck(id, { status })
      load()
    } catch (err) {
      setError(getApiErrorMessage(err))
    }
  }

  async function handleDelete(id: number) {
    if (!confirm(fa.checks.removeConfirm)) return
    try {
      await apiClient.deleteCheck(id)
      load()
    } catch (err) {
      setError(getApiErrorMessage(err))
    }
  }

  const accountName = (id: number) => accounts.find((a) => a.id === id)?.name ?? `${fa.checks.account} ${id}`

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main id="main-content" className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold text-foreground">{fa.checks.title}</h1>
        </div>

        {error && <div role="alert" className="mb-4 text-destructive">{error} <Button variant="outline" onClick={load} disabled={loading}>دریافت دوباره</Button></div>}
        {forecast && (
          <Card className="mb-8">
            <CardHeader><CardTitle>{fa.checks.upcomingForecastTitle}</CardTitle></CardHeader>
            <CardContent>
              {forecast.events.length === 0 ? (
                <p className="text-sm text-muted-foreground">{fa.checks.noUpcoming}</p>
              ) : (
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-xs text-muted-foreground">{fa.checks.inflow}</p>
                    <p className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(forecast.total_inflow)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{fa.checks.outflow}</p>
                    <p className="text-lg font-semibold text-red-600 dark:text-red-400">{formatCurrency(forecast.total_outflow)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{fa.checks.net}</p>
                    <p className="text-lg font-semibold text-foreground">{formatCurrency(forecast.net)}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card className="mb-8">
          <CardHeader><CardTitle>{fa.checks.addCheck}</CardTitle></CardHeader>
          <CardContent>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{fa.checks.addCheck}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{fa.checks.account}</label>
                <select
                  required
                  value={form.account_id}
                  onChange={(e) => setForm((f) => ({ ...f, account_id: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">{fa.checks.select}</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{fa.checks.direction}</label>
                <select
                  value={form.direction}
                  onChange={(e) => setForm((f) => ({ ...f, direction: e.target.value as 'issued' | 'received' }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="received">{fa.checks.received}</option>
                  <option value="issued">{fa.checks.issued}</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{fa.checks.counterpartyName}</label>
                <input
                  type="text"
                  required
                  value={form.counterparty_name}
                  onChange={(e) => setForm((f) => ({ ...f, counterparty_name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{fa.checks.amount}</label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  required
                  value={form.amount}
                  onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{fa.checks.bankName}</label>
                <input
                  type="text"
                  value={form.bank_name}
                  onChange={(e) => setForm((f) => ({ ...f, bank_name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{fa.checks.checkNumber}</label>
                <input
                  type="text"
                  value={form.check_number}
                  onChange={(e) => setForm((f) => ({ ...f, check_number: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{fa.checks.sayadId}</label>
                <input
                  type="text"
                  maxLength={16}
                  value={form.sayad_id}
                  onChange={(e) => setForm((f) => ({ ...f, sayad_id: e.target.value.replace(/\D/g, '') }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{fa.checks.dueDate}</label>
                <input
                  type="date"
                  required
                  value={form.due_date}
                  onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{fa.checks.descriptionOptional}</label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <Button type="submit" disabled={saving}>
              {saving ? fa.checks.addingCheck : fa.checks.addCheck}
            </Button>
          </form>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="border-b border-border"><CardTitle>{fa.checks.listTitle}</CardTitle></CardHeader>
          <CardContent className="p-0">
          {loading ? (
            <div className="p-6 text-muted-foreground">{fa.common.loading}</div>
          ) : list.length === 0 ? (
            <div className="p-6 text-muted-foreground">{fa.checks.noChecksYet} {fa.checks.addOneAbove}</div>
          ) : (
            <DataTable rows={list} caption="چک‌ها" rowId={c => `check-${c.id}`} searchText={c => `${c.id} ${c.counterparty_name} ${accountName(c.account_id)} ${STATUS_LABEL[c.status]} ${c.due_date} ${c.direction === 'received' ? fa.checks.received : fa.checks.issued}`} columns={[
              { key: 'party', label: 'طرف حساب', value: c => c.counterparty_name, render: c => <><bdi>{c.counterparty_name}</bdi><span className="block">#{c.id} · {accountName(c.account_id)}</span></> },
              { key: 'amount', label: 'مبلغ', value: c => Number(c.amount), render: c => formatCurrency(c.amount) },
              { key: 'direction', label: 'نوع', value: c => c.direction, render: c => c.direction === 'received' ? fa.checks.received : fa.checks.issued },
              { key: 'due', label: 'سررسید', value: c => c.due_date, render: c => formatDate(`${c.due_date}T12:00:00Z`) },
              { key: 'status', label: 'وضعیت', value: c => STATUS_LABEL[c.status], render: c => <><Badge variant={c.status === 'cleared' ? 'success' : c.status === 'bounced' ? 'warning' : 'neutral'}>{STATUS_LABEL[c.status]}</Badge>{c.bank_name && <p><bdi>{c.bank_name}</bdi></p>}{c.settlement_transaction_id && <Link className="block text-accent" href="/transactions">تراکنش تسویه #{c.settlement_transaction_id}</Link>}{c.status === 'cleared' && !c.settlement_transaction_id && <p>تسویه قدیمی بدون پیوند دفتر؛ نیازمند تطبیق</p>}</> },
              { key: 'actions', label: 'عملیات', render: c => <div className="flex flex-wrap gap-2">{['pending', 'bounced'].includes(c.status) && <Button size="sm" variant="outline" onClick={() => setSettlingId(c.id)}>{fa.checks.markCleared}</Button>}{c.status === 'pending' && <><Button size="sm" variant="ghost" onClick={() => { if (confirm('این چک برگشتی ثبت شود؟')) void handleStatusChange(c.id, 'bounced') }}>{fa.checks.markBounced}</Button><Button size="sm" variant="ghost" onClick={() => { if (confirm('این چک باطل شود؟ این کار تسویه نیست.')) void handleStatusChange(c.id, 'voided') }}>{fa.checks.markVoided}</Button><Button size="sm" variant="destructive" onClick={() => handleDelete(c.id)}>{fa.checks.remove}</Button></>}</div> },
            ]} detail={c => settlingId === c.id ? <SettlementForm key={c.id} amount={c.amount} direction={c.direction === 'received' ? 'income' : 'expense'} accountName={accountName(c.account_id)} onCancel={() => setSettlingId(null)} onSubmit={async data => {
              await apiClient.settleCheck(c.id, { settlement_date: data.settlement_date, transaction_id: data.transaction_id })
              setSettlingId(null)
              await load()
            }} /> : null} />
          )}
          </CardContent>
        </Card>

        <p className="mt-6 text-sm text-muted-foreground">
          <Link href="/dashboard" className="text-accent hover:underline">
            {fa.checks.backToDashboard}
          </Link>
        </p>
      </main>
    </div>
  )
}
