'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Button } from './button'
import { formatNumber } from '@/lib/utils'

export interface DataColumn<T> {
  key: string
  label: string
  render: (row: T) => ReactNode
  value?: (row: T) => string | number
}

export function DataTable<T>({ rows, columns, caption, rowId, detail, searchText }: {
  rows: T[]
  columns: DataColumn<T>[]
  caption: string
  rowId: (row: T) => string
  detail?: (row: T) => ReactNode
  searchText: (row: T) => string
}) {
  const [query, setQuery] = useState('')
  const [target, setTarget] = useState('')
  useEffect(() => {
    const update = () => { setTarget(window.location.hash.slice(1)); setQuery('') }
    update()
    window.addEventListener('hashchange', update)
    return () => window.removeEventListener('hashchange', update)
  }, [])
  useEffect(() => { if (target) document.getElementById(target)?.scrollIntoView({ block: 'nearest' }) }, [target, rows])
  const [page, setPage] = useState(0)
  const [sort, setSort] = useState<{ key: string; descending: boolean } | null>(null)
  const filtered = useMemo(() => {
    const result = rows.filter(row => searchText(row).toLocaleLowerCase('fa').includes(query.trim().toLocaleLowerCase('fa')))
    const column = columns.find(column => column.key === sort?.key)
    if (column?.value && sort) {
      const value = column.value
      result.sort((a, b) => {
        const left = value(a), right = value(b)
        const order = typeof left === 'number' && typeof right === 'number' ? left - right : String(left).localeCompare(String(right), 'fa')
        return sort.descending ? -order : order
      })
    }
    return result
  }, [rows, columns, query, sort, searchText])
  const pages = Math.max(1, Math.ceil(filtered.length / 25))
  const targetIndex = target ? filtered.findIndex(row => rowId(row) === target) : -1
  const current = targetIndex >= 0 ? Math.floor(targetIndex / 25) : Math.min(page, pages - 1)
  const visible = filtered.slice(current * 25, (current + 1) * 25)

  return <div className="space-y-3">
    <label className="block p-3 text-sm">جست‌وجو در {caption}
      <input type="search" value={query} onChange={event => { setTarget(''); setQuery(event.target.value); setPage(0) }} className="mt-2 w-full rounded-xl border border-border p-3" />
    </label>
    <div className="max-h-[36rem] overflow-auto" role="region" aria-label={caption} tabIndex={0}>
      <table className="financial-table text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead><tr>{columns.map(column => <th key={column.key} scope="col" aria-sort={column.value ? sort?.key === column.key ? sort.descending ? 'descending' : 'ascending' : 'none' : undefined}>
          {column.value ? <button type="button" className="whitespace-nowrap rounded p-1" onClick={() => { setSort({ key: column.key, descending: sort?.key === column.key && !sort.descending }); setPage(0) }}>{column.label}{sort?.key === column.key ? sort.descending ? ' ↓' : ' ↑' : ' ↕'}</button> : column.label}
        </th>)}</tr></thead>
        {visible.map(row => {
          const extra = detail?.(row)
          return <tbody key={rowId(row)} id={rowId(row)} className="scroll-mt-40">
            <tr>{columns.map(column => <td key={column.key}>{column.render(row)}</td>)}</tr>
            {extra && <tr><td colSpan={columns.length}>{extra}</td></tr>}
          </tbody>
        })}
      </table>
      {!visible.length && <p role="status" className="p-6">رکوردی با این جست‌وجو پیدا نشد.</p>}
    </div>
    <div className="flex flex-wrap items-center justify-between gap-3 p-3">
      <p role="status" className="text-sm">{formatNumber(filtered.length)} رکورد · صفحه {formatNumber(current + 1)} از {formatNumber(pages)}</p>
      <div className="flex gap-2"><Button variant="outline" size="sm" disabled={current === 0} onClick={() => { setTarget(''); setPage(current - 1) }}>قبلی</Button><Button variant="outline" size="sm" disabled={current + 1 >= pages} onClick={() => { setTarget(''); setPage(current + 1) }}>بعدی</Button></div>
    </div>
  </div>
}
