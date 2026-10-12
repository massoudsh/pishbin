'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Navbar from '@/components/layout/Navbar'
import { apiClient, getApiErrorMessage } from '@/lib/api'
import { fa } from '@/lib/fa'
import { MOCK_ACCOUNTS, MOCK_PAYMENTS } from '@/lib/mock-data'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface PaymentRow {
  id: number
  amount_rials: number
  description: string | null
  authority: string | null
  status: string
  ref_id: string | null
  gateway: string
  created_at: string | null
}

interface AccountRow {
  id: number
  name: string
  account_type: string
  balance: number
  currency: string
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<PaymentRow[]>([])
  const [accounts, setAccounts] = useState<AccountRow[]>([])
  const [loading, setLoading] = useState(true)
  const [isMock, setIsMock] = useState(false)
  const [requesting, setRequesting] = useState(false)
  const [error, setError] = useState('')
  const [amountRials, setAmountRials] = useState('')
  const [description, setDescription] = useState('')
  const [recordingId, setRecordingId] = useState<number | null>(null)
  const [recordAccountId, setRecordAccountId] = useState<string>('')
  const [recordError, setRecordError] = useState('')

  useEffect(() => {
    loadPayments()
    loadAccounts()
  }, [])

  async function loadAccounts() {
    try {
      const data = await apiClient.getAccounts()
      setAccounts(Array.isArray(data) ? data : [])
    } catch {
      setAccounts(MOCK_ACCOUNTS.map((a) => ({ id: a.id, name: a.name, account_type: a.account_type, balance: a.balance, currency: a.currency })))
    }
  }

  async function loadPayments() {
    setLoading(true)
    setIsMock(false)
    try {
      const data = await apiClient.getPayments()
      setPayments(Array.isArray(data) ? data : [])
    } catch {
      setPayments(MOCK_PAYMENTS)
      setIsMock(true)
    } finally {
      setLoading(false)
    }
  }

  async function handleRequestPayment(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const amount = parseInt(amountRials, 10)
    if (!amount || amount < 1000) {
      setError('Amount must be at least 1,000 Rials.')
      return
    }
    setRequesting(true)
    try {
      const res = await apiClient.requestZarinPalPayment({
        amount_rials: amount,
        description: description.trim() || undefined,
      })
      if (res.payment_url) {
        window.location.href = res.payment_url
        return
      }
      setError('No payment URL returned.')
    } catch (err) {
      setError(getApiErrorMessage(err))
    } finally {
      setRequesting(false)
    }
  }

  async function handleRecordIncome(paymentId: number) {
    const accountId = parseInt(recordAccountId, 10)
    if (!accountId) {
      setRecordError('Select an account')
      return
    }
    setRecordError('')
    setRecordingId(paymentId)
    try {
      await apiClient.recordPaymentAsIncome(paymentId, accountId)
      setRecordingId(null)
      setRecordAccountId('')
      loadPayments()
    } catch (err) {
      setRecordError(getApiErrorMessage(err))
    } finally {
      setRecordingId(null)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center gap-2 flex-wrap">
          <h1 className="text-2xl font-bold text-foreground">{fa.payments.zarinpalTitle}</h1>
          {isMock && <Badge variant="warning">نمایش نمونه</Badge>}
          <p className="mt-1 w-full text-sm text-gray-600 dark:text-gray-400">
            Request a payment and complete it on ZarinPal. You will be redirected back here after payment.
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">New payment</h2>
          <form onSubmit={handleRequestPayment} className="space-y-4">
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-md text-sm">
                {error}
              </div>
            )}
            <div>
              <label htmlFor="amount_rials" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Amount (Rials)
              </label>
              <input
                id="amount_rials"
                type="number"
                min={1000}
                step={1000}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="e.g. 100000"
                value={amountRials}
                onChange={(e) => setAmountRials(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description (optional)
              </label>
              <input
                id="description"
                type="text"
                maxLength={255}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="e.g. Top-up"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={requesting}>
              {requesting ? 'Redirecting...' : 'Pay with ZarinPal'}
            </Button>
          </form>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white p-4 border-b border-gray-200 dark:border-gray-700">
            Payment history
          </h2>
          {loading ? (
            <div className="p-6 text-gray-500 dark:text-gray-400">{fa.common.loading}</div>
          ) : payments.length === 0 ? (
            <div className="p-6 text-gray-500 dark:text-gray-400">No payments yet.</div>
          ) : (
            <>
              <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                {payments.map((p) => (
                  <li key={p.id} className="p-4 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {new Intl.NumberFormat('fa-IR').format(Number(p.amount_rials))} ریال
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {p.description || '—'} · {p.created_at ? new Date(p.created_at).toLocaleDateString('fa-IR', { year: 'numeric', month: 'short', day: 'numeric' }) : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-sm font-medium px-2 py-1 rounded ${
                          p.status === 'completed'
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                            : p.status === 'failed'
                              ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {p.status}
                      </span>
                      {p.status === 'completed' && (
                        <div className="flex items-center gap-1">
                          {recordingId === p.id ? (
                            <span className="text-xs text-gray-500">Recording...</span>
                          ) : (
                            <>
                              <select
                                value={recordAccountId}
                                onChange={(e) => setRecordAccountId(e.target.value)}
                                className="text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white py-1 px-2"
                                aria-label="Account to record income"
                              >
                                <option value="">Account</option>
                                {accounts.map((a) => (
                                  <option key={a.id} value={a.id}>{a.name}</option>
                                ))}
                              </select>
                              <button
                                type="button"
                                onClick={() => handleRecordIncome(p.id)}
                                disabled={!recordAccountId || recordingId !== null}
                                className="text-xs px-2 py-1 bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-50"
                              >
                                Record as income
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
              {recordError && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-sm">
                  {recordError}
                </div>
              )}
            </>
          )}
        </div>

        <p className="mt-6 text-sm text-gray-500 dark:text-gray-400">
          <Link href="/dashboard" className="text-primary-600 dark:text-primary-400 hover:underline">
            {fa.payments.backToDashboard}
          </Link>
        </p>
      </main>
    </div>
  )
}
