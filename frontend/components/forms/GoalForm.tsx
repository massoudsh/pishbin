'use client'

import { useState, useEffect } from 'react'
import {
  GoalCreateSchema,
  GoalUpdateSchema,
  type GoalCreate,
  type GoalUpdate,
  type Goal,
} from '@/lib/schemas/goal'
import { apiClient } from '@/lib/api'
import Button from '@/components/ui/form-button'

const GOAL_TYPES = [
  { value: 'savings', label: 'Savings' },
  { value: 'debt_payoff', label: 'Debt payoff' },
  { value: 'purchase', label: 'Purchase' },
  { value: 'emergency_fund', label: 'Emergency fund' },
  { value: 'other', label: 'Other' },
] as const

const GOAL_STATUSES = [
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
  { value: 'paused', label: 'Paused' },
  { value: 'cancelled', label: 'Cancelled' },
] as const

function toDateInput(iso: string): string {
  if (!iso) return ''
  return iso.slice(0, 10)
}

function fromDateInput(value: string): string | null {
  if (!value) return null
  return new Date(value).toISOString().slice(0, 10)
}

interface GoalFormProps {
  goal?: Goal | null
  onSuccess: () => void
  onCancel: () => void
}

export default function GoalForm({ goal, onSuccess, onCancel }: GoalFormProps) {
  const isEdit = Boolean(goal?.id)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: goal?.name ?? '',
    description: goal?.description ?? '',
    goal_type: (goal?.goal_type ?? 'savings') as string,
    target_amount: goal?.target_amount ?? 0,
    current_amount: goal?.current_amount ?? 0,
    target_date: goal?.target_date ? toDateInput(goal.target_date) : '',
    status: (goal?.status ?? 'active') as string,
  })

  useEffect(() => {
    setFormData({
      name: goal?.name ?? '',
      description: goal?.description ?? '',
      goal_type: (goal?.goal_type ?? 'savings') as string,
      target_amount: goal?.target_amount ?? 0,
      current_amount: goal?.current_amount ?? 0,
      target_date: goal?.target_date ? toDateInput(goal.target_date) : '',
      status: (goal?.status ?? 'active') as string,
    })
  }, [goal])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setError(null)
    if (name === 'target_amount' || name === 'current_amount') {
      setFormData((prev) => ({ ...prev, [name]: parseFloat(value) || 0 }))
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        goal_type: formData.goal_type,
        target_amount: Number(formData.target_amount),
        current_amount: Number(formData.current_amount),
        target_date: fromDateInput(formData.target_date),
        ...(isEdit && { status: formData.status }),
      }
      if (isEdit && goal) {
        const parsed = GoalUpdateSchema.parse(payload) as GoalUpdate
        await apiClient.updateGoal(goal.id, parsed)
      } else {
        const parsed = GoalCreateSchema.parse({
          name: payload.name,
          description: payload.description,
          goal_type: payload.goal_type,
          target_amount: payload.target_amount,
          current_amount: payload.current_amount,
          target_date: payload.target_date,
        }) as GoalCreate
        await apiClient.createGoal(parsed)
      }
      onSuccess()
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : typeof (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail === 'string'
            ? (err as { response: { data: { detail: string } } }).response.data.detail
            : 'Failed to save goal'
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
        <label htmlFor="description" className="block text-sm font-medium text-gray-700">
          Description (optional)
        </label>
        <textarea
          id="description"
          name="description"
          rows={2}
          maxLength={500}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
          value={formData.description}
          onChange={handleChange}
        />
      </div>
      <div>
        <label htmlFor="goal_type" className="block text-sm font-medium text-gray-700">
          Type
        </label>
        <select
          id="goal_type"
          name="goal_type"
          required
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
          value={formData.goal_type}
          onChange={handleChange}
        >
          {GOAL_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="target_amount" className="block text-sm font-medium text-gray-700">
          Target amount
        </label>
        <input
          id="target_amount"
          name="target_amount"
          type="number"
          step="0.01"
          min="0.01"
          required
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
          value={formData.target_amount || ''}
          onChange={handleChange}
        />
      </div>
      <div>
        <label htmlFor="current_amount" className="block text-sm font-medium text-gray-700">
          Current amount
        </label>
        <input
          id="current_amount"
          name="current_amount"
          type="number"
          step="0.01"
          min="0"
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
          value={formData.current_amount || ''}
          onChange={handleChange}
        />
      </div>
      <div>
        <label htmlFor="target_date" className="block text-sm font-medium text-gray-700">
          Target date (optional)
        </label>
        <input
          id="target_date"
          name="target_date"
          type="date"
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
          value={formData.target_date}
          onChange={handleChange}
        />
      </div>
      {isEdit && (
        <div>
          <label htmlFor="status" className="block text-sm font-medium text-gray-700">
            Status
          </label>
          <select
            id="status"
            name="status"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
            value={formData.status}
            onChange={handleChange}
          >
            {GOAL_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      )}
      <div className="flex gap-3 justify-end pt-2">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Saving...' : isEdit ? 'Update goal' : 'Create goal'}
        </Button>
      </div>
    </form>
  )
}
