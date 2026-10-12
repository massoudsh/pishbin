'use client'

import { useState } from 'react'
import Navbar from '@/components/layout/Navbar'
import { apiClient } from '@/lib/api'
import { fa } from '@/lib/fa'
import { Button } from '@/components/ui/button'

const TABS = [
  { id: 'cash', label: fa.investors.cashRevenue },
  { id: 'accrual', label: fa.investors.accrualRevenue },
  { id: 'mrr-arr', label: fa.investors.mrrArr },
  { id: 'by-customers', label: fa.investors.mrrArrByCustomers },
] as const

const MONTHS = ["Mar '23", "Apr '23", "May '23", "Jun '23", "Jul '23", "Aug '23"]

const ROWS = [
  { key: 'beginning', label: fa.investors.beginningOfPeriod, type: 'neutral' as const },
  { key: 'new', label: fa.investors.new, type: 'growth' as const },
  { key: 'reactivation', label: fa.investors.reactivation, type: 'growth' as const },
  { key: 'expansion', label: fa.investors.expansion, type: 'growth' as const },
  { key: 'contraction', label: fa.investors.contraction, type: 'loss' as const },
  { key: 'lost', label: fa.investors.lost, type: 'loss' as const },
  { key: 'end', label: fa.investors.endOfPeriod, type: 'neutral' as const },
]

const SAMPLE_DATA: Record<string, Record<string, number>> = {
  beginning: { "Mar '23": 12000, "Apr '23": 12250, "May '23": 12350, "Jun '23": 12480, "Jul '23": 12520, "Aug '23": 12650 },
  new: { "Mar '23": 100, "Apr '23": 120, "May '23": 80, "Jun '23": 150, "Jul '23": 90, "Aug '23": 110 },
  reactivation: { "Mar '23": 100, "Apr '23": 120, "May '23": 0, "Jun '23": 50, "Jul '23": 0, "Aug '23": 80 },
  expansion: { "Mar '23": 100, "Apr '23": 30, "May '23": 50, "Jun '23": 40, "Jul '23": 60, "Aug '23": 20 },
  contraction: { "Mar '23": -30, "Apr '23": -10, "May '23": -20, "Jun '23": -15, "Jul '23": -25, "Aug '23": -30 },
  lost: { "Mar '23": -20, "Apr '23": -100, "May '23": -50, "Jun '23": -80, "Jul '23": -40, "Aug '23": -60 },
  end: { "Mar '23": 12250, "Apr '23": 12350, "May '23": 12410, "Jun '23": 12525, "Jul '23": 12605, "Aug '23": 12700 },
}

const SUMMARY_ROWS = [
  { key: 'churn', label: fa.investors.arrGrossChurnRate, values: ['0.2%', '0.8%', '0.4%', '0.6%', '0.3%', '0.5%'] },
  { key: 'retention', label: fa.investors.arrGrossRetentionRate, values: ['99%', '99%', '99.6%', '99.4%', '99.7%', '99.5%'] },
  { key: 'net-churn', label: fa.investors.arrNetChurnRate, values: ['0.4%', '0.6%', '0.5%', '0.4%', '0.5%', '0.6%'] },
]

function formatCell(val: number): string {
  const formatted = new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 0 }).format(Math.abs(val))
  if (val >= 0) return formatted + ' تومان'
  return `(${formatted} تومان)`
}

export default function InvestorsPage() {
  const [activeTab, setActiveTab] = useState<string>('mrr-arr')
  const [dateRange] = useState('Mar 2023 - Aug 2023')
  const [metric] = useState('ARR')
  const [exporting, setExporting] = useState(false)

  const handleExportCsv = async () => {
    setExporting(true)
    try {
      const blob = await apiClient.exportTransactions()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'pishbin-arr-mrr.csv'
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main id="main-content" className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          {fa.investors.titleBefore}<span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">{fa.investors.titleHighlight}</span>{fa.investors.titleAfter}
        </h1>
        <p className="text-gray-400 mb-8">{fa.investors.subtitle}</p>

        <div className="rounded-xl border border-gray-700 bg-gray-800/80 overflow-hidden">
          <div className="flex flex-wrap items-center gap-4 p-4 border-b border-gray-700">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id)}
                className={`text-sm font-medium pb-2 border-b-2 transition ${
                  activeTab === t.id
                    ? 'text-emerald-400 border-emerald-400'
                    : 'text-gray-400 border-transparent hover:text-white'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 p-4 border-b border-gray-700">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-2 text-sm text-gray-300">
                <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                {dateRange}
              </span>
              <select className="text-sm bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white focus:ring-emerald-500 focus:border-emerald-500">
                <option>{metric}</option>
                <option>MRR</option>
              </select>
            </div>
            <Button variant="outline" onClick={handleExportCsv} disabled={exporting}>
              {exporting ? fa.common.loading : fa.investors.exportCsv}
            </Button>
          </div>

          <div className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <h2 className="text-sm font-semibold text-white">{fa.investors.compositionTitle}</h2>
              <button type="button" className="text-gray-500 hover:text-gray-400" aria-label="Info">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </button>
            </div>
            <p className="text-xs text-gray-500 mb-4">
              {fa.investors.stripeDisclaimer}
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-right py-3 pr-4 text-gray-400 font-medium">{fa.investors.customer}</th>
                    {MONTHS.map((m) => (
                      <th key={m} className="text-right py-3 px-2 text-gray-400 font-medium">{m}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ROWS.map((r) => (
                    <tr
                      key={r.key}
                      className={`border-b border-gray-700/70 ${
                        r.type === 'growth' ? 'border-l-4 border-l-emerald-500/50' : r.type === 'loss' ? 'border-l-4 border-l-red-500/50' : ''
                      }`}
                    >
                      <td className="py-2.5 pr-4 text-white font-medium flex items-center gap-2">
                        {r.label}
                        <button type="button" className="text-gray-500 hover:text-gray-400" aria-label="Info"><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></button>
                      </td>
                      {MONTHS.map((m) => {
                        const val = SAMPLE_DATA[r.key]?.[m] ?? 0
                        return (
                          <td key={m} className="text-right py-2.5 px-2 text-gray-300">
                            {val === 0 ? '—' : formatCell(val)}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  {SUMMARY_ROWS.map((s) => (
                    <tr key={s.key} className="border-b border-gray-700/50">
                      <td className="py-2.5 pr-4 text-gray-400 font-medium flex items-center gap-2">
                        {s.label}
                        <button type="button" className="text-gray-500" aria-label="Info"><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></button>
                      </td>
                      {s.values.map((v, i) => (
                        <td key={i} className="text-right py-2.5 px-2 text-gray-300">{v}</td>
                      ))}
                    </tr>
                  ))}
                </tfoot>
              </table>
            </div>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2" />
          <div className="rounded-xl bg-gradient-to-b from-violet-900/40 to-emerald-900/30 border border-gray-700 p-6">
            <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">{fa.investors.keyMetrics}</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                </span>
                <span className="text-white">{fa.investors.mrrDef}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                </span>
                <span className="text-white">{fa.investors.arrDef}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                </span>
                <span className="text-white">{fa.investors.churnDef}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                </span>
                <span className="text-white">{fa.investors.retentionDef}</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
