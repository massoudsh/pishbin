'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { apiClient } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'
import { fa } from '@/lib/fa'

interface CashFlowAlertItem {
  type: string
  days: number
  current_balance: number
  projected_balance: number
  threshold: number
  alert_type: 'warning' | 'critical'
}

export function CashFlowAlert() {
  const [alerts, setAlerts] = useState<CashFlowAlertItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiClient
      .getCashFlowAlerts()
      .then(setAlerts)
      .catch(() => setAlerts([]))
      .finally(() => setLoading(false))
  }, [])

  if (loading || alerts.length === 0) return null

  const alert = alerts[0]
  const critical = alert.alert_type === 'critical'

  return (
    <div
      className={
        critical
          ? 'mb-6 rounded-xl border border-red-200 bg-red-50 p-4'
          : 'mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4'
      }
    >
      <h3 className={critical ? 'text-sm font-semibold text-red-900 mb-2' : 'text-sm font-semibold text-amber-900 mb-2'}>
        {fa.cashFlow.forecastTitle}
      </h3>
      <p className={critical ? 'text-sm text-red-800' : 'text-sm text-amber-800'}>
        {critical ? fa.cashFlow.riskCritical : fa.cashFlow.riskWarning}
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        <span className={critical ? 'text-red-900' : 'text-amber-900'}>
          {fa.cashFlow.currentBalance}: <span className="font-medium">{formatCurrency(alert.current_balance)}</span>
        </span>
        <span className={critical ? 'text-red-900 font-medium' : 'text-amber-900 font-medium'}>
          {fa.cashFlow.projectedBalance} ({alert.days} روز): {formatCurrency(alert.projected_balance)}
        </span>
      </div>
      <Link
        href="/checks"
        className={critical ? 'mt-2 inline-block text-sm font-medium text-red-800 hover:text-red-900' : 'mt-2 inline-block text-sm font-medium text-amber-800 hover:text-amber-900'}
      >
        {fa.common.viewAll} ←
      </Link>
    </div>
  )
}
