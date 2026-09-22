'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Navbar from '@/components/layout/Navbar'
import { apiClient, getApiErrorMessage } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'
import { fa } from '@/lib/fa'
import { MOCK_CUSTOMERS, MOCK_INVOICES } from '@/lib/mock-data'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface InvoiceRow {
  id: number
  customer_id: number
  amount: number
  issue_date: string
  due_date: string
  paid_date: string | null
  status: 'issued' | 'paid' | 'overdue' | 'cancelled'
  description: string | null
}

interface CustomerOption {
  id: number
  name: string
}

const STATUS_LABEL: Record<InvoiceRow['status'], string> = {
  issued: fa.invoices.statusIssued,
  paid: fa.invoices.statusPaid,
  overdue: fa.invoices.statusOverdue,
  cancelled: fa.invoices.statusCancelled,
}

const STATUS_COLOR: Record<InvoiceRow['status'], string> = {
  issued: 'text-gray-600 dark:text-gray-400',
  paid: 'text-emerald-600 dark:text-emerald-400',
  overdue: 'text-red-600 dark:text-red-400',
  cancelled: 'text-gray-400 dark:text-gray-500',
}

export default function InvoicesPage() {
  const [list, setList] = useState<InvoiceRow[]>([])
  const [customers, setCustomers] = useState<CustomerOption[]>([])
  const [loading, setLoading] = useState(true)
  const [isMock, setIsMock] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    customer_id: '',
    amount: '',
    issue_date: new Date().toISOString().slice(0, 10),
    due_date: new Date().toISOString().slice(0, 10),
    description: '',
  })

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    setIsMock(false)
    try {
      const [invoices, custs] = await Promise.all([apiClient.getInvoices(), apiClient.getCustomers()])
      setList(Array.isArray(invoices) ? (invoices as InvoiceRow[]) : [])
      setCustomers(Array.isArray(custs) ? custs.map((c) => ({ id: c.id, name: c.name })) : [])
    } catch {
      setList(MOCK_INVOICES as InvoiceRow[])
      setCustomers(MOCK_CUSTOMERS.map((c) => ({ id: c.id, name: c.name })))
      setIsMock(true)
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const customerId = parseInt(form.customer_id, 10)
    const amount = parseFloat(form.amount)
    if (!customerId || !amount || amount <= 0) {
      setError('Select a customer and enter a positive amount.')
      return
    }
    setSaving(true)
    try {
      await apiClient.createInvoice({
        customer_id: customerId,
        amount,
        issue_date: form.issue_date,
        due_date: form.due_date,
        description: form.description.trim() || undefined,
      })
      setForm({ ...form, amount: '', description: '' })
      load()
    } catch (err) {
      setError(getApiErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  async function handleStatusChange(id: number, status: 'paid' | 'cancelled') {
    try {
      await apiClient.updateInvoice(id, { status })
      load()
    } catch (err) {
      setError(getApiErrorMessage(err))
    }
  }

  async function handleDelete(id: number) {
    if (!confirm(fa.invoices.removeConfirm)) return
    try {
      await apiClient.deleteInvoice(id)
      load()
    } catch (err) {
      setError(getApiErrorMessage(err))
    }
  }

  const customerName = (id: number) => customers.find((c) => c.id === id)?.name ?? `#${id}`

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold text-foreground">{fa.invoices.title}</h1>
          {isMock && <Badge variant="warning">نمایش نمونه</Badge>}
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>{fa.invoices.addInvoice}</CardTitle>
          </CardHeader>
          <CardContent>
          {customers.length === 0 && !loading ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {fa.invoices.noCustomersHint}{' '}
              <Link href="/customers" className="text-primary-600 dark:text-primary-400 hover:underline">
                {fa.nav.customers}
              </Link>
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-md text-sm">
                  {error}
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{fa.invoices.customer}</label>
                  <select
                    required
                    value={form.customer_id}
                    onChange={(e) => setForm((f) => ({ ...f, customer_id: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="">{fa.invoices.select}</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{fa.invoices.amount}</label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    required
                    value={form.amount}
                    onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{fa.invoices.issueDate}</label>
                  <input
                    type="date"
                    required
                    value={form.issue_date}
                    onChange={(e) => setForm((f) => ({ ...f, issue_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{fa.invoices.dueDate}</label>
                  <input
                    type="date"
                    required
                    value={form.due_date}
                    onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{fa.invoices.descriptionOptional}</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <Button type="submit" disabled={saving}>
                {saving ? fa.invoices.addingInvoice : fa.invoices.addInvoice}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="border-b border-border">
            <CardTitle>{fa.invoices.listTitle}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
          {loading ? (
            <div className="p-6 text-muted-foreground">{fa.common.loading}</div>
          ) : list.length === 0 ? (
            <div className="p-6 text-muted-foreground">{fa.invoices.noInvoicesYet} {fa.invoices.addOneAbove}</div>
          ) : (
            <ul className="divide-y divide-border">
              {list.map((inv) => (
                <li key={inv.id} className="p-4 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium text-foreground">
                      {customerName(inv.customer_id)} · {formatCurrency(inv.amount)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {fa.invoices.dueDate}: {inv.due_date} ·{' '}
                      <span className={STATUS_COLOR[inv.status]}>{STATUS_LABEL[inv.status]}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {(inv.status === 'issued' || inv.status === 'overdue') && (
                      <>
                        <Button size="sm" variant="ghost" onClick={() => handleStatusChange(inv.id, 'paid')} className="text-emerald-600 dark:text-emerald-400">
                          {fa.invoices.markPaid}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleStatusChange(inv.id, 'cancelled')} className="text-muted-foreground">
                          {fa.invoices.markCancelled}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDelete(inv.id)} className="text-red-600 dark:text-red-400">
                          {fa.invoices.remove}
                        </Button>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
          </CardContent>
        </Card>

        <p className="mt-6 text-sm text-muted-foreground">
          <Link href="/dashboard" className="text-accent hover:underline">
            {fa.invoices.backToDashboard}
          </Link>
        </p>
      </main>
    </div>
  )
}
