'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Navbar from '@/components/layout/Navbar'
import { apiClient, getApiErrorMessage } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'
import { fa } from '@/lib/fa'
import { MOCK_ACCOUNTS, MOCK_CHECKS } from '@/lib/mock-data'

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
  const [isMock, setIsMock] = useState(false)
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
    setIsMock(false)
    try {
      const [checks, acc, fc] = await Promise.all([
        apiClient.getChecks(),
        apiClient.getAccounts(),
        apiClient.getCheckCashFlowForecast(30),
      ])
      setList(Array.isArray(checks) ? (checks as CheckRow[]) : [])
      setAccounts(Array.isArray(acc) ? acc.map((a: { id: number; name: string; currency: string }) => ({ id: a.id, name: a.name, currency: a.currency })) : [])
      setForecast(fc)
    } catch {
      setList(MOCK_CHECKS as CheckRow[])
      setAccounts(MOCK_ACCOUNTS.map((a) => ({ id: a.id, name: a.name, currency: a.currency })))
      setForecast(null)
      setIsMock(true)
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
      setError('Select an account, enter the counterparty name and a positive amount.')
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
    <div className="min-h-screen bg-gray-100/80 dark:bg-gray-950">
      <Navbar />
      <main className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{fa.checks.title}</h1>
          {isMock && <span className="text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 px-2 py-1 rounded-full">نمایش نمونه</span>}
        </div>

        {forecast && (
          <div className="card p-6 mb-8">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{fa.checks.upcomingForecastTitle}</h2>
            {forecast.events.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">{fa.checks.noUpcoming}</p>
            ) : (
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{fa.checks.inflow}</p>
                  <p className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(forecast.total_inflow)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{fa.checks.outflow}</p>
                  <p className="text-lg font-semibold text-red-600 dark:text-red-400">{formatCurrency(forecast.total_outflow)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{fa.checks.net}</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">{formatCurrency(forecast.net)}</p>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="card p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{fa.checks.addCheck}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-md text-sm">
                {error}
              </div>
            )}
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
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2.5 bg-primary-500 text-white rounded-xl hover:bg-primary-600 disabled:opacity-50 text-sm font-medium"
            >
              {saving ? fa.checks.addingCheck : fa.checks.addCheck}
            </button>
          </form>
        </div>

        <div className="card overflow-hidden">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white p-4 border-b border-gray-200 dark:border-gray-700">
            {fa.checks.listTitle}
          </h2>
          {loading ? (
            <div className="p-6 text-gray-500 dark:text-gray-400">{fa.common.loading}</div>
          ) : list.length === 0 ? (
            <div className="p-6 text-gray-500 dark:text-gray-400">{fa.checks.noChecksYet} {fa.checks.addOneAbove}</div>
          ) : (
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
              {list.map((c) => (
                <li key={c.id} className="p-4 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {c.counterparty_name} · {formatCurrency(c.amount)} ({c.direction === 'received' ? fa.checks.received : fa.checks.issued})
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {accountName(c.account_id)} · {fa.checks.dueDate}: {c.due_date} · {STATUS_LABEL[c.status]}
                      {c.bank_name ? ` · ${c.bank_name}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {c.status === 'pending' && (
                      <>
                        <button type="button" onClick={() => handleStatusChange(c.id, 'cleared')} className="text-sm text-emerald-600 dark:text-emerald-400 hover:underline">
                          {fa.checks.markCleared}
                        </button>
                        <button type="button" onClick={() => handleStatusChange(c.id, 'bounced')} className="text-sm text-amber-600 dark:text-amber-400 hover:underline">
                          {fa.checks.markBounced}
                        </button>
                        <button type="button" onClick={() => handleStatusChange(c.id, 'voided')} className="text-sm text-gray-500 dark:text-gray-400 hover:underline">
                          {fa.checks.markVoided}
                        </button>
                        <button type="button" onClick={() => handleDelete(c.id)} className="text-sm text-red-600 dark:text-red-400 hover:underline">
                          {fa.checks.remove}
                        </button>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <p className="mt-6 text-sm text-gray-500 dark:text-gray-400">
          <Link href="/dashboard" className="text-primary-600 dark:text-primary-400 hover:underline">
            {fa.checks.backToDashboard}
          </Link>
        </p>
      </main>
    </div>
  )
}
