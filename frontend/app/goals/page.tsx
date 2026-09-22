'use client'

import { useEffect, useState, useCallback } from 'react'
import { apiClient } from '@/lib/api'
import { formatCurrency, formatNumber } from '@/lib/utils'
import Navbar from '@/components/layout/Navbar'
import GoalForm from '@/components/forms/GoalForm'
import { EmptyState } from '@/components/ui/EmptyState'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { fa } from '@/lib/fa'
import type { Goal } from '@/lib/schemas/goal'
import { MOCK_GOALS } from '@/lib/mock-data'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [isMock, setIsMock] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Goal | null>(null)

  const loadGoals = useCallback(async () => {
    setLoading(true)
    setIsMock(false)
    try {
      const data = await apiClient.getGoals()
      setGoals(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Failed to load goals:', error)
      setGoals(MOCK_GOALS as Goal[])
      setIsMock(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadGoals()
  }, [loadGoals])

  const openCreate = () => {
    setEditingGoal(null)
    setFormOpen(true)
  }
  const openEdit = (goal: Goal) => {
    setEditingGoal(goal)
    setFormOpen(true)
  }
  const closeForm = () => {
    setFormOpen(false)
    setEditingGoal(null)
  }

  const handleDeleteClick = (goal: Goal) => setConfirmDelete(goal)
  const handleDeleteConfirm = async () => {
    if (!confirmDelete) return
    setDeletingId(confirmDelete.id)
    setConfirmDelete(null)
    try {
      await apiClient.deleteGoal(confirmDelete.id)
      await loadGoals()
    } catch (error) {
      console.error('Failed to delete goal:', error)
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
              <h2 className="text-2xl font-bold text-foreground">{fa.goals.title}</h2>
              {isMock && <Badge variant="warning">نمایش نمونه</Badge>}
            </div>
            <Button onClick={openCreate}>{fa.goals.createGoal}</Button>
          </div>

          {loading ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">{fa.common.loading}</div>
          ) : goals.length === 0 ? (
            <EmptyState
              title={fa.goals.noGoalsYet}
              description={fa.goals.createGoalDescription}
              actionLabel={fa.goals.createGoal}
              onAction={openCreate}
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {goals.map((goal) => {
                const progress = goal.target_amount > 0 ? (goal.current_amount / goal.target_amount) * 100 : 0
                return (
                  <Card key={goal.id}>
                    <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white">{goal.name}</h3>
                        {goal.description && (
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{goal.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          goal.status === 'completed' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' :
                          goal.status === 'active' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300' :
                          goal.status === 'paused' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300' :
                          'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
                        }`}>
                          {goal.status}
                        </span>
                        <button
                          type="button"
                          onClick={() => openEdit(goal)}
                          className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 font-medium"
                        >
                          {fa.common.edit}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteClick(goal)}
                          disabled={deletingId === goal.id}
                          className="text-sm text-red-600 dark:text-red-400 hover:text-red-700 font-medium disabled:opacity-50"
                        >
                          {deletingId === goal.id ? fa.common.deleting : fa.common.delete}
                        </button>
                      </div>
                    </div>
                    <div className="mb-2">
                      <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-1">
                        <span>{formatCurrency(goal.current_amount)}</span>
                        <span>{formatCurrency(goal.target_amount)}</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-primary-500 h-2 rounded-full"
                          style={{ width: `${Math.min(progress, 100)}%` }}
                        />
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">{formatNumber(progress, { maximumFractionDigits: 1, minimumFractionDigits: 1 })} {fa.goals.percentComplete}</p>
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
        title={fa.confirm.deleteGoal}
        message={confirmDelete ? `"${confirmDelete.name}" — ${fa.confirm.deleteItemMessage}` : ''}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setConfirmDelete(null)}
      />
      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" aria-modal="true" role="dialog">
          <div className="card-elevated max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {editingGoal ? fa.goals.editGoal : fa.goals.newGoal}
            </h3>
            <GoalForm
              goal={editingGoal}
              onSuccess={() => {
                loadGoals()
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

