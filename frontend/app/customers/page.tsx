'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Navbar from '@/components/layout/Navbar'
import { apiClient, getApiErrorMessage } from '@/lib/api'
import { fa } from '@/lib/fa'
import { MOCK_CUSTOMERS } from '@/lib/mock-data'

interface CustomerRow {
  id: number
  name: string
  phone: string | null
  email: string | null
  national_id: string | null
  notes: string | null
}

interface ScoreData {
  total_invoices: number
  paid_invoices: number
  avg_days_late: number
  total_checks: number
  bounced_checks: number
  bounced_check_rate: number
}

export default function CustomersPage() {
  const [list, setList] = useState<CustomerRow[]>([])
  const [loading, setLoading] = useState(true)
  const [isMock, setIsMock] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [scores, setScores] = useState<Record<number, ScoreData>>({})
  const [scoreLoadingId, setScoreLoadingId] = useState<number | null>(null)
  const [form, setForm] = useState({ name: '', phone: '', email: '', national_id: '', notes: '' })

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    setIsMock(false)
    try {
      const customers = await apiClient.getCustomers()
      setList(Array.isArray(customers) ? (customers as CustomerRow[]) : [])
    } catch {
      setList(MOCK_CUSTOMERS as CustomerRow[])
      setIsMock(true)
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!form.name.trim()) {
      setError('Enter a customer name.')
      return
    }
    setSaving(true)
    try {
      await apiClient.createCustomer({
        name: form.name.trim(),
        phone: form.phone.trim() || undefined,
        email: form.email.trim() || undefined,
        national_id: form.national_id.trim() || undefined,
        notes: form.notes.trim() || undefined,
      })
      setForm({ name: '', phone: '', email: '', national_id: '', notes: '' })
      load()
    } catch (err) {
      setError(getApiErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: number) {
    if (!confirm(fa.customers.removeConfirm)) return
    try {
      await apiClient.deleteCustomer(id)
      load()
    } catch (err) {
      setError(getApiErrorMessage(err))
    }
  }

  async function handleViewScore(id: number) {
    if (scores[id]) {
      setScores((s) => {
        const next = { ...s }
        delete next[id]
        return next
      })
      return
    }
    setScoreLoadingId(id)
    try {
      const score = await apiClient.getCustomerScore(id)
      setScores((s) => ({ ...s, [id]: score }))
    } catch (err) {
      setError(getApiErrorMessage(err))
    } finally {
      setScoreLoadingId(null)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100/80 dark:bg-gray-950">
      <Navbar />
      <main className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{fa.customers.title}</h1>
          {isMock && <span className="text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 px-2 py-1 rounded-full">نمایش نمونه</span>}
        </div>

        <div className="card p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{fa.customers.addCustomer}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-md text-sm">
                {error}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{fa.customers.name}</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{fa.customers.phone}</label>
                <input
                  type="text"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{fa.customers.email}</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{fa.customers.nationalId}</label>
                <input
                  type="text"
                  value={form.national_id}
                  onChange={(e) => setForm((f) => ({ ...f, national_id: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{fa.customers.notesOptional}</label>
                <input
                  type="text"
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2.5 bg-primary-500 text-white rounded-xl hover:bg-primary-600 disabled:opacity-50 text-sm font-medium"
            >
              {saving ? fa.customers.addingCustomer : fa.customers.addCustomer}
            </button>
          </form>
        </div>

        <div className="card overflow-hidden">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white p-4 border-b border-gray-200 dark:border-gray-700">
            {fa.customers.listTitle}
          </h2>
          {loading ? (
            <div className="p-6 text-gray-500 dark:text-gray-400">{fa.common.loading}</div>
          ) : list.length === 0 ? (
            <div className="p-6 text-gray-500 dark:text-gray-400">{fa.customers.noCustomersYet} {fa.customers.addOneAbove}</div>
          ) : (
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
              {list.map((c) => (
                <li key={c.id} className="p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{c.name}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {[c.phone, c.email, c.national_id].filter(Boolean).join(' · ') || '—'}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button type="button" onClick={() => handleViewScore(c.id)} className="text-sm text-primary-600 dark:text-primary-400 hover:underline">
                        {scoreLoadingId === c.id ? fa.common.loading : fa.customers.viewScore}
                      </button>
                      <button type="button" onClick={() => handleDelete(c.id)} className="text-sm text-red-600 dark:text-red-400 hover:underline">
                        {fa.customers.remove}
                      </button>
                    </div>
                  </div>
                  {scores[c.id] && (
                    <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3">
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{fa.customers.avgDaysLate}</p>
                        <p className="font-semibold text-gray-900 dark:text-white">{scores[c.id].avg_days_late} {fa.customers.days}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{fa.customers.bouncedCheckRate}</p>
                        <p className="font-semibold text-gray-900 dark:text-white">{Math.round(scores[c.id].bounced_check_rate * 100)}٪</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{fa.customers.totalInvoices}</p>
                        <p className="font-semibold text-gray-900 dark:text-white">{scores[c.id].total_invoices}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{fa.customers.totalChecks}</p>
                        <p className="font-semibold text-gray-900 dark:text-white">{scores[c.id].total_checks}</p>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <p className="mt-6 text-sm text-gray-500 dark:text-gray-400">
          <Link href="/dashboard" className="text-primary-600 dark:text-primary-400 hover:underline">
            {fa.customers.backToDashboard}
          </Link>
        </p>
      </main>
    </div>
  )
}
