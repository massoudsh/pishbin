'use client'

import { useState, useCallback, useEffect } from 'react'
import {
  BudgetCreateSchema,
  BudgetUpdateSchema,
  type BudgetCreate,
  type BudgetUpdate,
  type Budget,
} from '@/lib/schemas/budget'
import { apiClient } from '@/lib/api'
import Button from '@/components/ui/form-button'

const PERIODS = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
] as const

function toDateInput(iso: string): string {
  if (!iso) return ''
  return iso.slice(0, 10)
}

function fromDateInput(value: string): string {
  if (!value) return ''
  return new Date(value).toISOString().slice(0, 10)
}

interface BudgetFormProps {
  budget?: Budget | null
  onSuccess: () => void
  onCancel: () => void
}

export default function BudgetForm({ budget, onSuccess, onCancel }: BudgetFormProps) {
  const isEdit = Boolean(budget?.id)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: budget?.name ?? '',
    amount: budget?.amount ?? 0,
    period: (budget?.period ?? 'monthly') as string,
    start_date: budget?.start_date ? toDateInput(budget.start_date) : toDateInput(new Date().toISOString()),
    end_date: budget?.end_date ? toDateInput(budget.end_date) : '',
  })

  useEffect(() => {
    setFormData({
      name: budget?.name ?? '',
      amount: budget?.amount ?? 0,
      period: (budget?.period ?? 'monthly') as string,
      start_date: budget?.start_date ? toDateInput(budget.start_date) : toDateInput(new Date().toISOString()),
      end_date: budget?.end_date ? toDateInput(budget.end_date) : '',
    })
  }, [budget])

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setError(null)
    if (name === 'amount') {
      setFormData((prev) => ({ ...prev, [name]: parseFloat(value) || 0 }))
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }))
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const payload = {
        name: formData.name.trim(),
        amount: Number(formData.amount),
        period: formData.period,
        start_date: fromDateInput(formData.start_date),
        end_date: formData.end_date ? fromDateInput(formData.end_date) : null,
      }
      if (isEdit && budget) {
        const parsed = BudgetUpdateSchema.parse(payload) as BudgetUpdate
        await apiClient.updateBudget(budget.id, parsed)
      } else {
        const parsed = BudgetCreateSchema.parse(payload) as BudgetCreate
        await apiClient.createBudget(parsed)
      }
      onSuccess()
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : typeof (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail === 'string'
            ? (err as { response: { data: { detail: string } } }).response.data.detail
            : 'Failed to save budget'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700" role="alert">
          {error}
        </div>
      )}
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
          Name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          maxLength={100}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
          value={formData.name}
          onChange={handleChange}
        />
      </div>
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
        <label htmlFor="period" className="block text-sm font-medium text-gray-700">
          Period
        </label>
        <select
          id="period"
          name="period"
          required
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
          value={formData.period}
          onChange={handleChange}
        >
          {PERIODS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="start_date" className="block text-sm font-medium text-gray-700">
          Start date
        </label>
        <input
          id="start_date"
          name="start_date"
          type="date"
          required
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
          value={formData.start_date}
          onChange={handleChange}
        />
      </div>
      <div>
        <label htmlFor="end_date" className="block text-sm font-medium text-gray-700">
          End date (optional)
        </label>
        <input
          id="end_date"
          name="end_date"
          type="date"
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
          value={formData.end_date}
          onChange={handleChange}
        />
      </div>
      <div className="flex gap-3 justify-end pt-2">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Saving...' : isEdit ? 'Update budget' : 'Create budget'}
        </Button>
      </div>
    </form>
  )
}
