'use client'

import { useState, useCallback, useEffect } from 'react'
import { AccountCreateSchema, AccountUpdateSchema, type AccountCreate, type AccountUpdate, type Account } from '@/lib/schemas/account'
import { apiClient } from '@/lib/api'
import Button from '@/components/ui/form-button'

const ACCOUNT_TYPES = [
  { value: 'checking', label: 'Checking' },
  { value: 'savings', label: 'Savings' },
  { value: 'credit_card', label: 'Credit Card' },
  { value: 'investment', label: 'Investment' },
  { value: 'loan', label: 'Loan' },
  { value: 'other', label: 'Other' },
] as const

interface AccountFormProps {
  /** When set, form is in edit mode. */
  account?: Account | null
  onSuccess: () => void
  onCancel: () => void
}

export default function AccountForm({ account, onSuccess, onCancel }: AccountFormProps) {
  const isEdit = Boolean(account?.id)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: account?.name ?? '',
    account_type: account?.account_type ?? 'checking',
    balance: account?.balance ?? 0,
    currency: account?.currency ?? 'IRT',
    description: account?.description ?? '',
  })

  useEffect(() => {
    setFormData({
      name: account?.name ?? '',
      account_type: account?.account_type ?? 'checking',
      balance: account?.balance ?? 0,
      currency: account?.currency ?? 'IRT',
      description: account?.description ?? '',
    })
  }, [account])

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const { name, value } = e.target
      setError(null)
      if (name === 'balance') {
        setFormData((prev) => ({ ...prev, [name]: parseFloat(value) || 0 }))
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
      const payload = {
        name: formData.name.trim(),
        account_type: formData.account_type,
        balance: Number(formData.balance),
        currency: formData.currency.trim().toUpperCase().slice(0, 3),
        description: formData.description.trim() || null,
      }

      if (isEdit && account) {
        const parsed = AccountUpdateSchema.parse(payload) as AccountUpdate
        await apiClient.updateAccount(account.id, parsed)
      } else {
        const parsed = AccountCreateSchema.parse(payload) as AccountCreate
        await apiClient.createAccount(parsed)
      }
      onSuccess()
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : typeof (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail === 'string'
            ? (err as { response: { data: { detail: string } } }).response.data.detail
            : 'Failed to save account'
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
        <label htmlFor="account_type" className="block text-sm font-medium text-gray-700">
          Type
        </label>
        <select
          id="account_type"
          name="account_type"
          required
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
          value={formData.account_type}
          onChange={handleChange}
        >
          {ACCOUNT_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="balance" className="block text-sm font-medium text-gray-700">
          Initial balance
        </label>
        <input
          id="balance"
          name="balance"
          type="number"
          step="0.01"
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
          value={formData.balance}
          onChange={handleChange}
        />
      </div>
      <div>
        <label htmlFor="currency" className="block text-sm font-medium text-gray-700">
          Currency
        </label>
        <input
          id="currency"
          name="currency"
          type="text"
          maxLength={3}
          placeholder="IRT"
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm uppercase"
          value={formData.currency}
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
      <div className="flex gap-3 justify-end pt-2">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Saving...' : isEdit ? 'Update account' : 'Create account'}
        </Button>
      </div>
    </form>
  )
}
