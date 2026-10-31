import { useId } from 'react'
import { formatCurrency, formatDate } from '@/lib/utils'

export function CashFlowChart({ baseline, scenario }: {
  baseline: Array<{ date: string; balance: number }>
  scenario?: Array<{ date: string; balance: number }>
}) {
  const id = useId()
  if (!baseline.length) return null
  const values = [...baseline, ...(scenario ?? [])].map(row => row.balance)
  const min = Math.min(0, ...values), max = Math.max(0, ...values)
  const range = max - min || 1
  const y = (value: number) => 180 - ((value - min) / range) * 160
  const x = (index: number) => 20 + index / Math.max(1, baseline.length - 1) * 560
  const points = (rows: typeof baseline) => rows.map((row, index) => `${x(index)},${y(row.balance)}`).join(' ')
  return <figure className="space-y-3 rounded-xl border border-border bg-surface p-4">
    <figcaption id={`${id}-title`} className="font-semibold">روند مانده پایان روز (تومان)</figcaption>
    <p id={`${id}-description`} className="text-sm text-muted-foreground">خط پیوسته: برنامه پایه؛ {scenario ? 'خط‌چین: سناریوی شما؛ ' : ''}خط افقی: مانده صفر. ارقام، محاسبات فرضی بر اساس اسناد هستند؛ نه موجودی قطعی آینده.</p>
    <svg viewBox="0 0 600 200" role="img" aria-labelledby={`${id}-title ${id}-description`} className="w-full" style={{ direction: 'ltr' }}>
      <line x1="20" x2="580" y1={y(0)} y2={y(0)} stroke="currentColor" strokeDasharray="2 4" />
      <polyline points={points(baseline)} fill="none" stroke="rgb(var(--accent))" strokeWidth="3" />
      {scenario && <polyline points={points(scenario)} fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray="8 5" />}
    </svg>
    <div className="flex flex-wrap justify-between gap-2 text-xs" dir="ltr"><span>{formatDate(`${baseline[0].date}T12:00:00Z`)}</span><span>{formatDate(`${baseline[baseline.length - 1].date}T12:00:00Z`)}</span></div>
    <p className="text-sm">کمترین مانده پایه: {formatCurrency(Math.min(...baseline.map(row => row.balance)))}{scenario && ` · کمترین مانده سناریو: ${formatCurrency(Math.min(...scenario.map(row => row.balance)))}`}</p>
  </figure>
}
