'use client'

import { useEffect, useState, useCallback } from 'react'
import { apiClient } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'
import Navbar from '@/components/layout/Navbar'
import AccountForm from '@/components/forms/AccountForm'
import { EmptyState } from '@/components/ui/EmptyState'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { fa } from '@/lib/fa'
import type { Account } from '@/lib/schemas/account'
import { MOCK_ACCOUNTS } from '@/lib/mock-data'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [isMock, setIsMock] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [editingAccount, setEditingAccount] = useState<Account | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Account | null>(null)

  const loadAccounts = useCallback(async () => {
    setLoading(true)
    setIsMock(false)
    try {
      const data = await apiClient.getAccounts()
      setAccounts(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Failed to load accounts:', error)
      setAccounts(MOCK_ACCOUNTS as Account[])
      setIsMock(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadAccounts()
  }, [loadAccounts])

  const openCreate = () => {
    setEditingAccount(null)
    setFormOpen(true)
  }
  const openEdit = (account: Account) => {
    setEditingAccount(account)
    setFormOpen(true)
  }
  const closeForm = () => {
    setFormOpen(false)
    setEditingAccount(null)
  }

  const handleDeleteClick = (account: Account) => setConfirmDelete(account)
  const handleDeleteConfirm = async () => {
    if (!confirmDelete) return
    setDeletingId(confirmDelete.id)
    setConfirmDelete(null)
    try {
      await apiClient.deleteAccount(confirmDelete.id)
      await loadAccounts()
    } catch (error) {
      console.error('Failed to delete account:', error)
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
              <h2 className="text-2xl font-bold text-foreground">{fa.accounts.title}</h2>
              {isMock && <Badge variant="warning">نمایش نمونه</Badge>}
            </div>
            <Button onClick={openCreate}>{fa.accounts.addAccount}</Button>
          </div>

          {loading ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">{fa.common.loading}</div>
          ) : accounts.length === 0 ? (
            <EmptyState
              title={fa.dashboard.noAccountsYet}
              description={fa.accounts.addFirstDescription}
              actionLabel={fa.accounts.addAccount}
              onAction={openCreate}
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {accounts.map((account) => (
                <Card key={account.id}>
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-lg font-medium text-foreground">{account.name}</h3>
                        <p className="text-sm text-muted-foreground capitalize">{account.account_type.replace('_', ' ')}</p>
                        <p className="text-2xl font-bold text-foreground mt-4">{formatCurrency(account.balance, account.currency)}</p>
                        {account.description && (
                          <p className="text-sm text-muted-foreground mt-2">{account.description}</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="ghost" onClick={() => openEdit(account)} className="text-accent">
                          {fa.common.edit}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDeleteClick(account)} disabled={deletingId === account.id} className="text-red-600 dark:text-red-400">
                          {deletingId === account.id ? fa.common.deleting : fa.common.delete}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      <ConfirmDialog
        open={!!confirmDelete}
        title={fa.confirm.deleteAccount}
        message={confirmDelete ? `"${confirmDelete.name}" — ${fa.confirm.deleteAccountMessage}` : ''}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setConfirmDelete(null)}
      />
      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" aria-modal="true" role="dialog">
          <div className="card-elevated max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {editingAccount ? fa.accounts.editAccount : fa.accounts.newAccount}
            </h3>
            <AccountForm
              account={editingAccount}
              onSuccess={() => {
                loadAccounts()
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

