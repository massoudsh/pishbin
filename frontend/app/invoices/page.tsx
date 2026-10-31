'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Navbar from '@/components/layout/Navbar'
import { apiClient, getApiErrorMessage } from '@/lib/api'
import { formatCurrency, formatDate } from '@/lib/utils'
import { DataTable } from '@/components/ui/data-table'
import { daysBetween, tehranToday } from '@/lib/decision-center'
import { fa } from '@/lib/fa'
import SettlementForm from '@/components/forms/SettlementForm'
import { type Account } from '@/lib/schemas/account'
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
  settlement_transaction_id: number | null
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

export default function InvoicesPage() {
  const [list, setList] = useState<InvoiceRow[]>([])
  const [customers, setCustomers] = useState<CustomerOption[]>([])
  const [loading, setLoading] = useState(true)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [settlingId, setSettlingId] = useState<number | null>(null)
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
    setError('')
    try {
      const [invoices, custs, accs] = await Promise.all([apiClient.getInvoices(), apiClient.getCustomers(), apiClient.getAllAccounts()])
      setAccounts(accs.filter(account => account.is_active !== false && account.currency === 'IRT' && ['checking', 'savings', 'other'].includes(account.account_type)))
      setList(Array.isArray(invoices) ? (invoices as InvoiceRow[]) : [])
      setCustomers(Array.isArray(custs) ? custs.map((c) => ({ id: c.id, name: c.name })) : [])
    } catch (err) {
      setList([])
      setCustomers([])
      setAccounts([])
      setError(getApiErrorMessage(err))
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
      setError('مشتری را انتخاب کنید و مبلغ مثبت وارد کنید.')
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

  async function handleStatusChange(id: number, status: 'cancelled') {
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
      <main id="main-content" className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold text-foreground">{fa.invoices.title}</h1>
        </div>

        {error && <div role="alert" className="mb-4 text-destructive">{error} <Button variant="outline" onClick={load} disabled={loading}>دریافت دوباره</Button></div>}
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
          )}
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
            <DataTable rows={list} caption="فاکتورها" rowId={inv => `invoice-${inv.id}`} searchText={inv => `${inv.id} ${customerName(inv.customer_id)} ${STATUS_LABEL[inv.status]} ${inv.due_date}`} columns={[
              { key: 'customer', label: 'مشتری / فاکتور', value: inv => customerName(inv.customer_id), render: inv => <><Link className="text-accent underline" href={`/customers#customer-${inv.customer_id}`}><bdi>{customerName(inv.customer_id)}</bdi></Link><span className="block">#{inv.id}</span></> },
              { key: 'amount', label: 'مبلغ', value: inv => Number(inv.amount), render: inv => formatCurrency(inv.amount) },
              { key: 'issued', label: 'تاریخ صدور', value: inv => inv.issue_date, render: inv => formatDate(`${inv.issue_date}T12:00:00Z`) },
              { key: 'due', label: 'سررسید', value: inv => inv.due_date, render: inv => <>{formatDate(`${inv.due_date}T12:00:00Z`)}{['issued', 'overdue'].includes(inv.status) && inv.due_date < tehranToday() && <span className="block text-destructive">{daysBetween(inv.due_date, tehranToday()).toLocaleString('fa-IR')} روز تأخیر</span>}</> },
              { key: 'status', label: 'وضعیت', value: inv => STATUS_LABEL[inv.status], render: inv => <><Badge variant={inv.status === 'paid' ? 'success' : inv.status === 'overdue' ? 'warning' : 'neutral'}>{STATUS_LABEL[inv.status]}</Badge>{inv.settlement_transaction_id && <Link href="/transactions" className="block text-accent">تراکنش تسویه #{inv.settlement_transaction_id}</Link>}{inv.status === 'paid' && !inv.settlement_transaction_id && <p>تسویه قدیمی بدون پیوند دفتر؛ نیازمند تطبیق</p>}</> },
              { key: 'actions', label: 'عملیات', render: inv => (inv.status === 'issued' || inv.status === 'overdue') && <div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => setSettlingId(inv.id)}>{fa.invoices.markPaid}</Button><Button size="sm" variant="ghost" onClick={() => { if (confirm('این فاکتور لغو شود؟ این کار دریافت وجه نیست.')) void handleStatusChange(inv.id, 'cancelled') }}>{fa.invoices.markCancelled}</Button><Button size="sm" variant="destructive" onClick={() => handleDelete(inv.id)}>{fa.invoices.remove}</Button></div> },
            ]} detail={inv => settlingId === inv.id ? <SettlementForm key={inv.id} amount={inv.amount} direction="income" accounts={accounts} onCancel={() => setSettlingId(null)} onSubmit={async data => {
              await apiClient.settleInvoice(inv.id, { ...data, account_id: data.account_id! })
              setSettlingId(null)
              await load()
            }} /> : null} />
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
