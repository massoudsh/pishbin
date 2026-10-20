'use client'

import { useState, useCallback, useEffect } from 'react'
import {
  TransactionCreateSchema,
  TransactionUpdateSchema,
  type TransactionCreate,
  type TransactionUpdate,
  type Transaction,
} from '@/lib/schemas/transaction'
import type { Account } from '@/lib/schemas/account'
import { apiClient } from '@/lib/api'
import Button from '@/components/ui/form-button'

const TRANSACTION_TYPES = [
  { value: 'income', label: 'Income' },
  { value: 'expense', label: 'Expense' },
  { value: 'transfer', label: 'Transfer' },
] as const

function toDatetimeLocal(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function fromDatetimeLocal(local: string): string {
  return new Date(local).toISOString()
}

export interface CategoryOption {
  id: number
  name: string
  description?: string | null
  color?: string | null
}

interface TransactionFormProps {
  accounts: Account[]
  /** Categories for cost/expense and income (e.g. from getCategories). */
  categories?: CategoryOption[]
  /** When set, form is in edit mode. */
  transaction?: Transaction | null
  onSuccess: () => void
  onCancel: () => void
}

export default function TransactionForm({ accounts, categories = [], transaction, onSuccess, onCancel }: TransactionFormProps) {
  const isEdit = Boolean(transaction?.id)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [duplicateDetail, setDuplicateDetail] = useState<{ existing_id: number; existing_date?: string } | null>(null)
  const getInitialState = useCallback(() => {
    const defaultDate = transaction?.date
      ? toDatetimeLocal(transaction.date)
      : new Date().toISOString().slice(0, 16)
    return {
      account_id: transaction?.account_id ?? (accounts[0]?.id ?? 0),
      category_id: transaction?.category_id ?? '',
      amount: transaction?.amount ?? 0,
      transaction_type: transaction?.transaction_type ?? 'expense',
      description: transaction?.description ?? '',
      date: defaultDate,
      notes: transaction?.notes ?? '',
    }
  }, [transaction, accounts])

  const [formData, setFormData] = useState(getInitialState)

  useEffect(() => {
    setFormData(getInitialState())
  }, [getInitialState])

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const { name, value } = e.target
      setError(null)
      if (name === 'account_id') {
        setFormData((prev) => ({ ...prev, [name]: parseInt(value, 10) }))
      } else if (name === 'amount') {
        setFormData((prev) => ({ ...prev, [name]: parseFloat(value) || 0 }))
      } else if (name === 'category_id') {
        setFormData((prev) => ({ ...prev, [name]: value ? parseInt(value, 10) : '' }))
      } else {
        setFormData((prev) => ({ ...prev, [name]: value }))
      }
    },
    []
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const accountId = Number(formData.account_id)
      const amount = Number(formData.amount)
      const dateIso = fromDatetimeLocal(formData.date)
      const payload = {
        account_id: accountId,
        category_id: formData.category_id ? Number(formData.category_id) : null,
        amount,
        transaction_type: formData.transaction_type,
        description: formData.description.trim() || null,
        date: dateIso,
        notes: formData.notes.trim() || null,
      }

      if (isEdit && transaction) {
        const parsed = TransactionUpdateSchema.parse(payload) as TransactionUpdate
        await apiClient.updateTransaction(transaction.id, parsed)
      } else {
        const parsed = TransactionCreateSchema.parse(payload) as TransactionCreate
        await apiClient.createTransaction(parsed, false)
      }
      setDuplicateDetail(null)
      onSuccess()
    } catch (err: unknown) {
      const ax = err as { response?: { status?: number; data?: { detail?: unknown } } }
      if (ax?.response?.status === 409 && ax.response?.data?.detail && typeof ax.response.data.detail === 'object' && 'existing_id' in (ax.response.data.detail as object)) {
        const d = ax.response.data.detail as { existing_id: number; existing_date?: string }
        setDuplicateDetail({ existing_id: d.existing_id, existing_date: d.existing_date })
        setError('تراکنش مشابه در همین روز و حساب وجود دارد. در صورت اطمینان دکمه «ثبت باز هم» را بزنید.')
        setLoading(false)
        return
      }
      const detail = ax?.response?.data?.detail
      const message =
        err instanceof Error
          ? err.message
          : typeof detail === 'string'
            ? detail
            : 'Failed to save transaction'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateAnyway = async () => {
    if (!duplicateDetail) return
    setError(null)
    setLoading(true)
    try {
      const accountId = Number(formData.account_id)
      const amount = Number(formData.amount)
      const dateIso = fromDatetimeLocal(formData.date)
      const payload = {
        account_id: accountId,
        category_id: formData.category_id ? Number(formData.category_id) : null,
        amount,
        transaction_type: formData.transaction_type,
        description: formData.description.trim() || null,
        date: dateIso,
        notes: formData.notes.trim() || null,
      }
      const parsed = TransactionCreateSchema.parse(payload) as TransactionCreate
      await apiClient.createTransaction(parsed, true)
      setDuplicateDetail(null)
      onSuccess()
    } catch (err) {
      setError(typeof (err as Error).message === 'string' ? (err as Error).message : 'Failed to save')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-300" role="alert">
          {error}
          {duplicateDetail && (
            <div className="mt-2">
              <button type="button" onClick={handleCreateAnyway} disabled={loading} className="text-sm font-medium underline hover:no-underline">
                ثبت باز هم
              </button>
            </div>
          )}
        </div>
      )}
      <div>
        <label htmlFor="account_id" className="block text-sm font-medium text-gray-700">
          Account
        </label>
        <select
          id="account_id"
          name="account_id"
          required
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
          value={formData.account_id}
          onChange={handleChange}
        >
          {accounts.length === 0 ? (
            <option value="">No accounts — create an account first</option>
          ) : (
            accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} ({a.account_type})
              </option>
            ))
          )}
        </select>
      </div>
      <div>
        <label htmlFor="transaction_type" className="block text-sm font-medium text-gray-700">
          Type
        </label>
        <select
          id="transaction_type"
          name="transaction_type"
          required
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
          value={formData.transaction_type}
          onChange={handleChange}
        >
          {TRANSACTION_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>
      {categories.length > 0 && (
        <div>
          <label htmlFor="category_id" className="block text-sm font-medium text-gray-700">
            Category (for costs / income)
          </label>
          <select
            id="category_id"
            name="category_id"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
            value={formData.category_id === '' ? '' : formData.category_id}
            onChange={handleChange}
          >
            <option value="">None</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      )}
      <div>
        <label htmlFor="amount" className="block text-sm font-medium text-gray-700">
          Amount
        </label>
        <input
          id="amount"
          name="amount"
          type="number"
          step="0.01"
          min="0.01"
          required
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
          value={formData.amount || ''}
          onChange={handleChange}
        />
      </div>
      <div>
        <label htmlFor="date" className="block text-sm font-medium text-gray-700">
          Date & time
        </label>
        <input
          id="date"
          name="date"
          type="datetime-local"
          required
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
          value={formData.date}
          onChange={handleChange}
        />
      </div>
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700">
          Description (optional)
        </label>
        <input
          id="description"
          name="description"
          type="text"
          maxLength={500}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
          value={formData.description}
          onChange={handleChange}
        />
      </div>
      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
          Notes (optional)
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={2}
          maxLength={1000}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
          value={formData.notes}
          onChange={handleChange}
        />
      </div>
      <div className="flex gap-3 justify-end pt-2">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading || accounts.length === 0}>
          {loading ? 'Saving...' : isEdit ? 'Update transaction' : 'Create transaction'}
        </Button>
      </div>
    </form>
  )
}
