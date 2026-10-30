'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { getApiErrorMessage } from '@/lib/api'
import { tehranToday } from '@/lib/decision-center'
import { formatCurrency } from '@/lib/utils'

type SettlementData = { account_id?: number; settlement_date: string; transaction_id?: number }

export default function SettlementForm({ amount, direction, accounts, accountName, onSubmit, onCancel }: {
  amount: number
  direction: 'income' | 'expense'
  accounts?: Array<{ id: number; name: string }>
  accountName?: string
  onSubmit: (data: SettlementData) => Promise<void>
  onCancel: () => void
}) {
  const [accountId, setAccountId] = useState('')
  const [date, setDate] = useState(tehranToday)
  const [transactionId, setTransactionId] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const fieldClass = 'block w-full rounded-xl border border-border bg-background p-2 text-foreground'

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      await onSubmit({ account_id: accounts ? Number(accountId) : undefined, settlement_date: date, transaction_id: transactionId ? Number(transactionId) : undefined })
    } catch (err) {
      setError(getApiErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form aria-label="ثبت تسویه در دفتر" onSubmit={submit} className="w-full space-y-3 rounded-xl border border-border bg-surface p-4">
      <p className="font-medium">{direction === 'income' ? 'ثبت دریافت' : 'ثبت پرداخت'} {formatCurrency(amount)} {accountName && `— ${accountName}`}</p>
      <p className="text-sm text-muted-foreground">فقط پس از تأیید جابه‌جایی واقعی پول ثبت کنید. این کار انتقال بانکی انجام نمی‌دهد. مبالغ این مسیر تومانی هستند و حساب باید فعال و تومانی باشد.</p>
      <p className="text-sm text-muted-foreground">اگر این مبلغ قبلاً در دفتر ثبت شده، شناسه همان تراکنش را وارد کنید تا مانده دوباره تغییر نکند. فاکتور و چک مربوط به یک دریافت را جداگانه تسویه نکنید.</p>
      <fieldset disabled={saving} className="space-y-3">
        {accounts && <label className="block text-sm">حساب دریافت
          <select required value={accountId} onChange={event => setAccountId(event.target.value)} className={fieldClass}>
            <option value="">حساب را انتخاب کنید</option>
            {accounts.map(account => <option key={account.id} value={account.id}>{account.name}</option>)}
          </select>
        </label>}
        {accounts?.length === 0 && <p role="status" className="text-sm text-destructive">حساب نقدی فعال تومانی در فهرست دریافت‌شده موجود نیست؛ ابتدا حساب را بررسی کنید.</p>}
        <label className="block text-sm">تاریخ تسویه
          <input required type="date" max={tehranToday()} value={date} onChange={event => setDate(event.target.value)} className={fieldClass} />
        </label>
        <label className="block text-sm">شناسه تراکنش موجود (اختیاری)
          <input type="number" min="1" step="1" value={transactionId} onChange={event => setTransactionId(event.target.value)} className={fieldClass} />
        </label>
        <p className="text-sm text-muted-foreground">{transactionId ? 'فقط اتصال به تراکنش هم‌مبلغ، هم‌تاریخ و متعلق به همین حساب؛ بدون تغییر مانده.' : 'یک تراکنش جدید ساخته می‌شود و مانده حساب به همان اندازه تغییر می‌کند.'} تسویه ثبت‌شده از این صفحه قابل ویرایش یا حذف نیست.</p>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <div className="flex gap-2">
          <Button type="submit" disabled={saving || Boolean(accounts && !accountId)}>{saving ? 'در حال ثبت…' : transactionId ? 'اتصال تراکنش و تأیید تسویه' : 'ثبت تراکنش و تأیید تسویه'}</Button>
          <Button variant="secondary" onClick={onCancel}>انصراف</Button>
        </div>
      </fieldset>
    </form>
  )
}
