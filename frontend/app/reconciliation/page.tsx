'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Navbar from '@/components/layout/Navbar'
import { apiClient, getApiErrorMessage } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'
import { fa } from '@/lib/fa'
import { MOCK_ACCOUNTS } from '@/lib/mock-data'

interface ReconciliationMatch {
  row_index: number
  statement_date: string
  statement_amount: string
  statement_description: string | null
  transaction_id: number
  transaction_date: string
}

interface ReconciliationUnmatched {
  row_index: number
  statement_date: string
  statement_amount: string
  statement_type: string
  statement_description: string | null
  reason: string
}

interface ReconciliationResult {
  account_id: number
  total_rows: number
  matched_count: number
  unmatched_count: number
  matches: ReconciliationMatch[]
  unmatched: ReconciliationUnmatched[]
  row_errors: string[]
}

export default function ReconciliationPage() {
  const [accounts, setAccounts] = useState<Array<{ id: number; name: string; currency: string }>>([])
  const [isMock, setIsMock] = useState(false)
  const [accountId, setAccountId] = useState('')
  const [windowDays, setWindowDays] = useState(3)
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<ReconciliationResult | null>(null)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    try {
      const acc = await apiClient.getAccounts()
      setAccounts(Array.isArray(acc) ? acc.map((a: { id: number; name: string; currency: string }) => ({ id: a.id, name: a.name, currency: a.currency })) : [])
    } catch {
      setAccounts(MOCK_ACCOUNTS.map((a) => ({ id: a.id, name: a.name, currency: a.currency })))
      setIsMock(true)
    }
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const id = parseInt(accountId, 10)
    if (!id || !file) {
      setError(fa.reconciliation.selectFileFirst)
      return
    }
    setUploading(true)
    setResult(null)
    try {
      const data = await apiClient.reconcileBankStatement(file, id, windowDays)
      setResult(data)
    } catch (err) {
      setError(getApiErrorMessage(err))
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100/80 dark:bg-gray-950">
      <Navbar />
      <main className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{fa.reconciliation.title}</h1>
          {isMock && <span className="text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 px-2 py-1 rounded-full">نمایش نمونه</span>}
        </div>

        <div className="card p-6 mb-8">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{fa.reconciliation.description}</p>
          <form onSubmit={handleUpload} className="space-y-4">
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-md text-sm">
                {error}
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{fa.reconciliation.account}</label>
                <select
                  required
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">{fa.reconciliation.select}</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{fa.reconciliation.windowDays}</label>
                <input
                  type="number"
                  min={0}
                  max={30}
                  value={windowDays}
                  onChange={(e) => setWindowDays(parseInt(e.target.value, 10) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{fa.reconciliation.file}</label>
              <input
                type="file"
                accept=".csv"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="w-full text-sm text-gray-600 dark:text-gray-400 file:mr-2 file:py-1 file:px-3 file:rounded file:border file:border-gray-300"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{fa.reconciliation.csvHint}</p>
            </div>
            <button
              type="submit"
              disabled={uploading}
              className="px-4 py-2.5 bg-primary-500 text-white rounded-xl hover:bg-primary-600 disabled:opacity-50 text-sm font-medium"
            >
              {uploading ? fa.reconciliation.uploading : fa.reconciliation.upload}
            </button>
          </form>
        </div>

        {result && (
          <>
            <div className="card p-6 mb-8">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{fa.reconciliation.totalRows}</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">{result.total_rows}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{fa.reconciliation.matchedCount}</p>
                  <p className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">{result.matched_count}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{fa.reconciliation.unmatchedCount}</p>
                  <p className="text-lg font-semibold text-amber-600 dark:text-amber-400">{result.unmatched_count}</p>
                </div>
              </div>
              {result.row_errors.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-medium text-red-700 dark:text-red-300 mb-1">{fa.reconciliation.rowErrorsTitle}</p>
                  <ul className="text-sm text-red-600 dark:text-red-400 list-disc list-inside">
                    {result.row_errors.map((msg, i) => (
                      <li key={i}>{msg}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="card overflow-hidden mb-8">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white p-4 border-b border-gray-200 dark:border-gray-700">
                {fa.reconciliation.matchesTitle}
              </h2>
              {result.matches.length === 0 ? (
                <div className="p-6 text-gray-500 dark:text-gray-400">{fa.reconciliation.noMatches}</div>
              ) : (
                <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                  {result.matches.map((m) => (
                    <li key={m.row_index} className="p-4 flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {formatCurrency(Number(m.statement_amount))} · {m.statement_description ?? ''}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {fa.reconciliation.statementDate}: {m.statement_date.slice(0, 10)} · {fa.reconciliation.matchedTransaction} #{m.transaction_id}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="card overflow-hidden">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white p-4 border-b border-gray-200 dark:border-gray-700">
                {fa.reconciliation.unmatchedTitle}
              </h2>
              {result.unmatched.length === 0 ? (
                <div className="p-6 text-gray-500 dark:text-gray-400">{fa.reconciliation.noUnmatched}</div>
              ) : (
                <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                  {result.unmatched.map((u) => (
                    <li key={u.row_index} className="p-4 flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {formatCurrency(Number(u.statement_amount))} · {u.statement_description ?? ''}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {fa.reconciliation.statementDate}: {u.statement_date.slice(0, 10)} · {fa.reconciliation.reason}: {u.reason}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}

        {!result && (
          <p className="text-sm text-gray-500 dark:text-gray-400">{fa.reconciliation.noResultsYet}</p>
        )}

        <p className="mt-6 text-sm text-gray-500 dark:text-gray-400">
          <Link href="/dashboard" className="text-primary-600 dark:text-primary-400 hover:underline">
            {fa.reconciliation.backToDashboard}
          </Link>
        </p>
      </main>
    </div>
  )
}
