'use client'

import { useEffect, useState, useCallback } from 'react'
import { apiClient } from '@/lib/api'
import { formatCurrency, formatDate } from '@/lib/utils'
import Navbar from '@/components/layout/Navbar'
import TransactionForm from '@/components/forms/TransactionForm'
import { EmptyState } from '@/components/ui/EmptyState'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { fa } from '@/lib/fa'
import type { Account } from '@/lib/schemas/account'
import type { Transaction } from '@/lib/schemas/transaction'
import type { CategoryOption } from '@/components/forms/TransactionForm'
import { MOCK_ACCOUNTS, MOCK_TRANSACTIONS } from '@/lib/mock-data'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [categories, setCategories] = useState<CategoryOption[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [importAccountId, setImportAccountId] = useState<number | ''>('')
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importResult, setImportResult] = useState<{ created: number; errors: string[] } | null>(null)
  const [importing, setImporting] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Transaction | null>(null)
  const [isMock, setIsMock] = useState(false)
  const [filters, setFilters] = useState<{
    q?: string
    account_id?: number
    category_id?: number
    amount_min?: number
    amount_max?: number
    start_date?: string
    end_date?: string
  }>({})

  const loadTransactions = useCallback(async () => {
    setLoading(true)
    setIsMock(false)
    try {
      const params: Record<string, string | number> = {}
      if (filters.q?.trim()) params.q = filters.q.trim()
      if (filters.account_id) params.account_id = filters.account_id
      if (filters.category_id) params.category_id = filters.category_id
      if (filters.amount_min != null) params.amount_min = filters.amount_min
      if (filters.amount_max != null) params.amount_max = filters.amount_max
      if (filters.start_date) params.start_date = filters.start_date
      if (filters.end_date) params.end_date = filters.end_date
      const data = await apiClient.getTransactions(params)
      setTransactions(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Failed to load transactions:', error)
      setTransactions(MOCK_TRANSACTIONS as Transaction[])
      setIsMock(true)
    } finally {
      setLoading(false)
    }
  }, [filters])

  const loadAccounts = useCallback(async () => {
    try {
      const data = await apiClient.getAccounts()
      setAccounts(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Failed to load accounts:', error)
      setAccounts(MOCK_ACCOUNTS as Account[])
    }
  }, [])

  const loadCategories = useCallback(async () => {
    try {
      const data = await apiClient.getCategories()
      setCategories(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Failed to load categories:', error)
      setCategories([{ id: 1, name: 'خوراک' }, { id: 2, name: 'حمل‌ونقل' }, { id: 3, name: 'سرگرمی' }])
    }
  }, [])

  useEffect(() => {
    loadTransactions()
    loadAccounts()
    loadCategories()
  }, [loadTransactions, loadAccounts, loadCategories])

  const openCreate = () => {
    setEditingTransaction(null)
    setFormOpen(true)
  }
  const openEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction)
    setFormOpen(true)
  }
  const closeForm = () => {
    setFormOpen(false)
    setEditingTransaction(null)
  }

  const handleImport = async () => {
    if (!importFile || importAccountId === '') return
    setImporting(true)
    setImportResult(null)
    try {
      const result = await apiClient.importTransactions(importFile, importAccountId as number)
      setImportResult({ created: result.created, errors: result.errors || [] })
      if (result.created > 0) await loadTransactions()
    } catch (err) {
      setImportResult({ created: 0, errors: [(err as Error).message] })
    } finally {
      setImporting(false)
    }
  }

  const closeImport = () => {
    setImportOpen(false)
    setImportAccountId('')
    setImportFile(null)
    setImportResult(null)
  }

  const handleDeleteClick = (transaction: Transaction) => setConfirmDelete(transaction)
  const handleDeleteConfirm = async () => {
    if (!confirmDelete) return
    setDeletingId(confirmDelete.id)
    setConfirmDelete(null)
    try {
      await apiClient.deleteTransaction(confirmDelete.id)
      await loadTransactions()
    } catch (error) {
      console.error('Failed to delete transaction:', error)
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex justify-between items-center mb-6 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold text-foreground">{fa.transactions.title}</h2>
              {isMock && <Badge variant="warning">نمایش نمونه</Badge>}
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" onClick={() => setImportOpen(true)}>
                {fa.transactions.importCsv}
              </Button>
              <Button onClick={openCreate}>{fa.transactions.addTransaction}</Button>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 mb-4 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
            <input
              type="text"
              placeholder="جستجو در توضیح..."
              value={filters.q ?? ''}
              onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value || undefined }))}
              onKeyDown={(e) => e.key === 'Enter' && loadTransactions()}
              className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white min-w-[180px]"
            />
            <select
              value={filters.account_id ?? ''}
              onChange={(e) => setFilters((f) => ({ ...f, account_id: e.target.value ? Number(e.target.value) : undefined }))}
              className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">همه حساب‌ها</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
            <select
              value={filters.category_id ?? ''}
              onChange={(e) => setFilters((f) => ({ ...f, category_id: e.target.value ? Number(e.target.value) : undefined }))}
              className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">همه دسته‌ها</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <input type="number" placeholder="حداقل مبلغ" value={filters.amount_min ?? ''} onChange={(e) => setFilters((f) => ({ ...f, amount_min: e.target.value ? Number(e.target.value) : undefined }))} className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 w-28" />
            <input type="number" placeholder="حداکثر مبلغ" value={filters.amount_max ?? ''} onChange={(e) => setFilters((f) => ({ ...f, amount_max: e.target.value ? Number(e.target.value) : undefined }))} className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 w-28" />
            <Button size="sm" onClick={() => loadTransactions()}>اعمال فیلتر</Button>
          </div>

          {loading ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">{fa.common.loading}</div>
          ) : transactions.length === 0 ? (
            <EmptyState
              title={fa.dashboard.noTransactionsYet}
              description={fa.transactions.addTransactionDesc}
              actionLabel={fa.transactions.addTransaction}
              onAction={openCreate}
            />
          ) : (
            <Card className="overflow-hidden">
              <CardContent className="p-0">
              <ul className="divide-y divide-border">
                {transactions.map((transaction) => (
                  <li key={transaction.id} className="px-6 py-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {transaction.description || fa.transactions.noDescription}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{formatDate(transaction.date)}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span
                          className={`text-sm font-medium ${
                            transaction.transaction_type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                          }`}
                        >
                          {transaction.transaction_type === 'income' ? '+' : '-'}
                          {formatCurrency(transaction.amount)}
                        </span>
                        <button
                          type="button"
                          onClick={() => openEdit(transaction)}
                          className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 font-medium"
                        >
                          {fa.common.edit}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteClick(transaction)}
                          disabled={deletingId === transaction.id}
                          className="text-sm text-red-600 dark:text-red-400 hover:text-red-700 font-medium disabled:opacity-50"
                        >
                          {deletingId === transaction.id ? fa.common.deleting : fa.common.delete}
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      <ConfirmDialog
        open={!!confirmDelete}
        title={fa.confirm.deleteTransaction}
        message={confirmDelete ? fa.confirm.deleteTransactionMessage : ''}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setConfirmDelete(null)}
      />
      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" aria-modal="true" role="dialog">
          <div className="card-elevated max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {editingTransaction ? fa.transactions.editTransaction : fa.transactions.newTransaction}
            </h3>
            <TransactionForm
              accounts={accounts}
              categories={categories}
              transaction={editingTransaction}
              onSuccess={() => {
                loadTransactions()
                closeForm()
              }}
              onCancel={closeForm}
            />
          </div>
        </div>
      )}

      {importOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" aria-modal="true" role="dialog">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Import from CSV</h3>
            <p className="text-sm text-gray-600 mb-3">CSV must have headers: date, amount, type, description (type = income or expense).</p>
            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Account</label>
                <select
                  value={importAccountId}
                  onChange={(e) => setImportAccountId(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                >
                  <option value="">Select account</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">CSV file</label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => setImportFile(e.target.files?.[0] ?? null)}
                  className="w-full text-sm text-gray-600 file:mr-2 file:py-1 file:px-3 file:rounded file:border file:border-gray-300"
                />
              </div>
            </div>
            {importResult && (
              <div className="mb-4 p-3 rounded-md bg-gray-50 text-sm">
                <p className="font-medium text-green-700">Imported {importResult.created} transaction(s).</p>
                {importResult.errors.length > 0 && (
                  <ul className="mt-2 text-amber-800 list-disc list-inside">
                    {importResult.errors.slice(0, 5).map((msg, i) => (
                      <li key={i}>{msg}</li>
                    ))}
                    {importResult.errors.length > 5 && (
                      <li>… and {importResult.errors.length - 5} more</li>
                    )}
                  </ul>
                )}
              </div>
            )}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={closeImport} className="px-4 py-2 rounded-md border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50">
                Close
              </button>
              <button
                type="button"
                onClick={handleImport}
                disabled={importing || !importFile || importAccountId === ''}
                className="px-4 py-2 rounded-md bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 disabled:opacity-50"
              >
                {importing ? 'Importing...' : 'Import'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

