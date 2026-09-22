'use client'

import { useEffect, useState, useCallback } from 'react'
import { apiClient } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'
import Navbar from '@/components/layout/Navbar'
import BudgetForm from '@/components/forms/BudgetForm'
import { EmptyState } from '@/components/ui/EmptyState'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { fa } from '@/lib/fa'
import type { Budget } from '@/lib/schemas/budget'
import { MOCK_BUDGETS } from '@/lib/mock-data'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'

export default function BudgetsPage() {
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [loading, setLoading] = useState(true)
  const [isMock, setIsMock] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Budget | null>(null)

  const loadBudgets = useCallback(async () => {
    setLoading(true)
    setIsMock(false)
    try {
      const data = await apiClient.getBudgets()
      setBudgets(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Failed to load budgets:', error)
      setBudgets(MOCK_BUDGETS as Budget[])
      setIsMock(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadBudgets()
  }, [loadBudgets])

  const openCreate = () => {
    setEditingBudget(null)
    setFormOpen(true)
  }
  const openEdit = (budget: Budget) => {
    setEditingBudget(budget)
    setFormOpen(true)
  }
  const closeForm = () => {
    setFormOpen(false)
    setEditingBudget(null)
  }

  const handleDeleteClick = (budget: Budget) => setConfirmDelete(budget)
  const handleDeleteConfirm = async () => {
    if (!confirmDelete) return
    setDeletingId(confirmDelete.id)
    setConfirmDelete(null)
    try {
      await apiClient.deleteBudget(confirmDelete.id)
      await loadBudgets()
    } catch (error) {
      console.error('Failed to delete budget:', error)
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
              <h2 className="text-2xl font-bold text-foreground">{fa.budgets.title}</h2>
              {isMock && <Badge variant="warning">نمایش نمونه</Badge>}
            </div>
            <Button onClick={openCreate}>{fa.budgets.createBudget}</Button>
          </div>

          {loading ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">{fa.common.loading}</div>
          ) : budgets.length === 0 ? (
            <EmptyState
              title={fa.budgets.noBudgetsYet}
              description={fa.budgets.createBudgetDescription}
              actionLabel={fa.budgets.createBudget}
              onAction={openCreate}
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {budgets.map((budget) => {
                const b = budget as Budget & { spent?: number; remaining?: number; percentage_used?: number }
                const spent = b.spent ?? 0
                const remaining = b.remaining ?? budget.amount - spent
                const pct = typeof b.percentage_used === 'number'
                  ? b.percentage_used
                  : (budget.amount > 0 ? (spent / budget.amount) * 100 : 0)
                return (
                  <Card key={budget.id}>
                    <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white">{budget.name}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 capitalize mt-1">{budget.period}</p>
                        <p className="text-lg font-medium text-gray-900 dark:text-white mt-2">{formatCurrency(budget.amount)} {fa.budgets.budget}</p>
                        {typeof spent === 'number' && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {fa.budgets.spent}: {formatCurrency(spent)} · {fa.budgets.remaining}: {formatCurrency(remaining)}
                          </p>
                        )}
                        <div className="mt-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${pct > 100 ? 'bg-red-500' : 'bg-primary-500'}`}
                            style={{ width: `${Math.min(pct, 100)}%` }}
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(budget)}
                          className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 font-medium"
                        >
                          {fa.common.edit}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteClick(budget)}
                          disabled={deletingId === budget.id}
                          className="text-sm text-red-600 dark:text-red-400 hover:text-red-700 font-medium disabled:opacity-50"
                        >
                          {deletingId === budget.id ? fa.common.deleting : fa.common.delete}
                        </button>
                      </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      </main>

      <ConfirmDialog
        open={!!confirmDelete}
        title={fa.confirm.deleteBudget}
        message={confirmDelete ? `"${confirmDelete.name}" — ${fa.confirm.deleteItemMessage}` : ''}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setConfirmDelete(null)}
      />
      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" aria-modal="true" role="dialog">
          <div className="card-elevated max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {editingBudget ? fa.budgets.editBudget : fa.budgets.newBudget}
            </h3>
            <BudgetForm
              budget={editingBudget}
              onSuccess={() => {
                loadBudgets()
                closeForm()
              }}
              onCancel={closeForm}
            />
          </div>
        </div>
      )}
    </div>
  )
}

