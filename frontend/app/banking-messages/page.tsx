'use client'

import { useState, useCallback, useEffect } from 'react'
import { apiClient } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'
import Navbar from '@/components/layout/Navbar'
import type { Account } from '@/lib/schemas/account'
import type { CategoryOption } from '@/components/forms/TransactionForm'
import { getApiErrorMessage } from '@/lib/api'
import { Button } from '@/components/ui/button'

interface ParseResult {
  amount: number | null
  date: string | null
  description: string | null
  transaction_type: string
  suggested_category_id: number | null
  suggested_category_name: string | null
}

export default function BankingMessagesPage() {
  const [rawText, setRawText] = useState('')
  const [parsed, setParsed] = useState<ParseResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [categories, setCategories] = useState<CategoryOption[]>([])
  const [messages, setMessages] = useState<Array<{
    id: number
    raw_text: string
    parsed_amount: number | null
    parsed_description: string | null
    suggested_category_id: number | null
    transaction_id: number | null
    created_at: string
  }>>([])
  const [createAccountId, setCreateAccountId] = useState<number | ''>('')
  const [createCategoryId, setCreateCategoryId] = useState<number | ''>('')
  const [creatingFromId, setCreatingFromId] = useState<number | null>(null)

  const loadAccountsAndCategories = useCallback(async () => {
    try {
      const [acc, cat] = await Promise.all([apiClient.getAccounts(), apiClient.getCategories()])
      setAccounts(Array.isArray(acc) ? acc : [])
      setCategories(Array.isArray(cat) ? cat : [])
    } catch {
      setAccounts([])
      setCategories([])
    }
  }, [])

  const loadMessages = useCallback(async () => {
    try {
      const data = await apiClient.getBankingMessages(30)
      setMessages(Array.isArray(data) ? data : [])
    } catch {
      setMessages([])
    }
  }, [])

  const handleParse = async () => {
    if (!rawText.trim()) return
    setLoading(true)
    setError(null)
    setParsed(null)
    try {
      const result = await apiClient.parseBankingMessage(rawText.trim())
      setParsed(result)
    } catch (err) {
      setError(getApiErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const handleSaveMessage = async () => {
    if (!rawText.trim()) return
    setLoading(true)
    setError(null)
    try {
      await apiClient.createBankingMessage(rawText.trim())
      setRawText('')
      setParsed(null)
      await loadMessages()
    } catch (err) {
      setError(getApiErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const handleCreateTransaction = async (messageId: number) => {
    if (createAccountId === '') return
    setCreatingFromId(messageId)
    setError(null)
    try {
      await apiClient.createTransactionFromMessage(
        messageId,
        createAccountId as number,
        createCategoryId === '' ? undefined : (createCategoryId as number)
      )
      await loadMessages()
    } catch (err) {
      setError(getApiErrorMessage(err))
    } finally {
      setCreatingFromId(null)
    }
  }

  useEffect(() => {
    loadAccountsAndCategories()
    loadMessages()
  }, [loadAccountsAndCategories, loadMessages])

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">Banking messages</h1>
          <p className="text-sm text-gray-600 mt-1">
            Paste a bank SMS or notification. We parse amount, date and description and suggest a cost category based on the content.
          </p>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <label htmlFor="raw" className="block text-sm font-medium text-gray-700 mb-2">
              Paste message
            </label>
            <textarea
              id="raw"
              rows={4}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              placeholder="e.g. Your a/c XX1234 debited with INR 500 on 15/01/2024. UPI-Swiggy. Avl bal: INR 10,000."
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
            />
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
            <div className="mt-3 flex flex-wrap gap-2">
              <Button onClick={handleParse} disabled={loading || !rawText.trim()}>
                {loading ? 'Parsing...' : 'Parse & suggest category'}
              </Button>
              <Button variant="outline" onClick={handleSaveMessage} disabled={loading || !rawText.trim()}>
                Save message
              </Button>
            </div>
          </div>

          {parsed && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
              <h2 className="text-base font-semibold text-gray-900 mb-3">Parsed result</h2>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                {parsed.amount != null && (
                  <>
                    <dt className="text-gray-500">Amount</dt>
                    <dd className="font-medium">{formatCurrency(parsed.amount)}</dd>
                  </>
                )}
                {parsed.date && (
                  <>
                    <dt className="text-gray-500">Date</dt>
                    <dd>{new Date(parsed.date).toLocaleDateString('fa-IR', { year: 'numeric', month: 'long', day: 'numeric' })}</dd>
                  </>
                )}
                {parsed.description && (
                  <>
                    <dt className="text-gray-500">Description</dt>
                    <dd className="break-words">{parsed.description}</dd>
                  </>
                )}
                <dt className="text-gray-500">Type</dt>
                <dd className="capitalize">{parsed.transaction_type}</dd>
                {parsed.suggested_category_name && (
                  <>
                    <dt className="text-gray-500">Suggested category</dt>
                    <dd className="font-medium text-primary-700">{parsed.suggested_category_name}</dd>
                  </>
                )}
              </dl>
            </div>
          )}

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <h2 className="text-base font-semibold text-gray-900 mb-3">Saved messages</h2>
            <p className="text-sm text-gray-500 mb-3">
              Create a transaction from a saved message. Select account and optionally override the suggested category.
            </p>
            <div className="mb-4 flex flex-wrap gap-2 items-center">
              <select
                value={createAccountId}
                onChange={(e) => setCreateAccountId(e.target.value === '' ? '' : Number(e.target.value))}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
              >
                <option value="">Select account</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
              <select
                value={createCategoryId}
                onChange={(e) => setCreateCategoryId(e.target.value === '' ? '' : Number(e.target.value))}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
              >
                <option value="">Use suggested</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            {messages.length === 0 ? (
              <p className="text-sm text-gray-500">No messages yet. Parse and save one above.</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {messages.map((m) => (
                  <li key={m.id} className="py-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {m.parsed_description || m.raw_text.slice(0, 60)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {m.parsed_amount != null && formatCurrency(m.parsed_amount)}
                        {m.transaction_id != null && ' · Transaction created'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCreateTransaction(m.id)}
                      disabled={creatingFromId === m.id || createAccountId === '' || m.parsed_amount == null || m.transaction_id != null}
                      className="text-sm font-medium text-primary-600 hover:text-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {m.transaction_id != null ? 'Created' : creatingFromId === m.id ? 'Creating...' : 'Create transaction'}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
