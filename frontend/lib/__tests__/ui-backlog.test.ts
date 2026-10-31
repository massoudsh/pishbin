import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { runInNewContext } from 'node:vm'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import ts from 'typescript'
import { getApiErrorMessage } from '../api'

const realRequire = createRequire(import.meta.url)
const root = resolve(dirname(new URL(import.meta.url).pathname), '../..')
function component(path: string, react?: object, globals: object = {}): Record<string, any> {
  const filename = resolve(root, path)
  const source = readFileSync(filename, 'utf8')
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText
  const exports = {}
  runInNewContext(compiled, { ...globals, exports, require: (name: string) => {
    if (name === 'react' && react) return { ...realRequire('react'), ...react }
    if (name.startsWith('@/components/')) return component(`${name.slice(2)}.tsx`)
    if (name.startsWith('./')) return component(`${resolve(dirname(filename), name)}.tsx`)
    if (name.startsWith('@/')) return realRequire(resolve(root, name.slice(2)))
    return realRequire(name)
  } })
  return exports
}

for (const variant of ['subtle', 'medium', 'elevated']) {
  test(`glass surface renders ${variant} with caller semantics`, () => {
    const { GlassSurface } = component('components/ui/glass-surface.tsx')
    const html = renderToStaticMarkup(createElement(GlassSurface, { variant, role: 'region', 'aria-label': 'مالی' }, 'موجودی'))
    assert.match(html, new RegExp(`glass-${variant}`))
    assert.match(html, /role="region"/)
    assert.match(html, /موجودی/)
  })
}

test('loading button is disabled, announced busy and preserves its label', () => {
  const { Button } = component('components/ui/button.tsx')
  const html = renderToStaticMarkup(createElement(Button, { loading: true }, 'ثبت'))
  assert.match(html, /disabled=""/)
  assert.match(html, /aria-busy="true"/)
  assert.match(html, /ثبت/)
})

test('confirmation dialog has unique labelled native modal semantics', () => {
  const { ConfirmDialog } = component('components/ui/ConfirmDialog.tsx')
  const html = renderToStaticMarkup(createElement(ConfirmDialog, { open: false, title: 'حذف', message: 'تأیید کنید', onConfirm() {}, onCancel() {} }))
  assert.match(html, /^<dialog/)
  assert.match(html, /aria-labelledby=/)
  assert.match(html, /aria-describedby=/)
})

for (const status of [400, 401, 403, 404, 409, 422, 429, 500]) {
  test(`API ${status} returns safe actionable bilingual errors`, () => {
    const error = { isAxiosError: true, response: { status, data: { detail: 'private server exception' } }, message: 'private server exception' }
    for (const locale of ['fa', 'en'] as const) {
      const message = getApiErrorMessage(error, locale)
      assert.ok(message.length > 20)
      assert.ok(!message.includes('private'))
    }
    assert.notEqual(getApiErrorMessage(error, 'fa'), getApiErrorMessage(error, 'en'))
  })
}

test('network and unknown errors never expose raw exceptions', () => {
  assert.match(getApiErrorMessage({ isAxiosError: true }, 'en'), /connection/)
  assert.ok(!getApiErrorMessage(new Error('private')).includes('private'))
})

function tableHtml({ query = '', target = '', page = 0, sort = null }: { query?: string; target?: string; page?: number; sort?: { key: string; descending: boolean } | null } = {}) {
  const state = [query, target, page, sort]
  let index = 0
  const { DataTable } = component('components/ui/data-table.tsx', {
    useState: () => [state[index++], () => {}], useEffect: () => {}, useMemo: (fn: () => unknown) => fn(),
  })
  return renderToStaticMarkup(createElement(DataTable, {
    rows: Array.from({ length: 60 }, (_, id) => ({ id: id + 1 })),
    columns: [{ key: 'id', label: 'شماره', value: (r: { id: number }) => r.id, render: (r: { id: number }) => `record-${r.id}` }],
    caption: 'اسناد', rowId: (r: { id: number }) => `row-${r.id}`, searchText: (r: { id: number }) => `record-${r.id}`,
  }))
}

test('financial table limits rendered records and preserves table semantics', () => {
  const html = tableHtml()
  assert.equal((html.match(/<tbody/g) ?? []).length, 25)
  assert.match(html, /<caption/)
  assert.match(html, /scope="col"/)
  assert.match(html, /aria-sort="none"/)
  assert.ok(!html.includes('id="row-26"'))
})

test('financial table sorts numbers, filters, and clamps stale pages', () => {
  const sorted = tableHtml({ sort: { key: 'id', descending: true } })
  assert.ok(sorted.indexOf('id="row-60"') < sorted.indexOf('id="row-59"'))
  assert.match(sorted, /aria-sort="descending"/)
  const filtered = tableHtml({ query: 'record-60', page: 7 })
  assert.equal((filtered.match(/<tbody/g) ?? []).length, 1)
  assert.match(filtered, /id="row-60"/)
  assert.match(tableHtml({ query: 'missing' }), /role="status"/)
})

test('document deep links expose records beyond the first page', () => {
  const html = tableHtml({ target: 'row-60' })
  assert.match(html, /id="row-60"/)
  assert.ok(!html.includes('id="row-1"'))
})

test('cash chart describes assumptions and distinguishes scenarios without color alone', () => {
  const { CashFlowChart } = component('components/ui/cash-flow-chart.tsx')
  const baseline = [{ date: '2026-10-31', balance: 0 }, { date: '2026-11-01', balance: -10 }]
  const html = renderToStaticMarkup(createElement(CashFlowChart, { baseline, scenario: baseline }))
  assert.match(html, /role="img"/)
  assert.match(html, /stroke-dasharray="8 5"/)
  assert.ok(!html.includes('NaN'))
  assert.equal(renderToStaticMarkup(createElement(CashFlowChart, { baseline: [] })), '')
  assert.ok(!renderToStaticMarkup(createElement(CashFlowChart, { baseline: [{ date: '2026-10-31', balance: 0 }] })).includes('NaN'))
})

test('core text token pairs meet AA contrast on opaque surfaces', () => {
  const css = readFileSync(resolve(root, 'app/globals.css'), 'utf8')
  const parse = (text: string) => Object.fromEntries([...text.matchAll(/--([\w-]+): (\d+) (\d+) (\d+);/g)].map(match => [match[1], match.slice(2).map(Number)]))
  const light = parse(css.split(':root {')[1].split('}')[0])
  const dark = { ...light, ...parse(css.split('.dark {')[1].split('}')[0]) }
  const luminance = (rgb: number[]) => rgb.map(value => { const s = value / 255; return s <= .04045 ? s / 12.92 : ((s + .055) / 1.055) ** 2.4 }).reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index], 0)
  for (const theme of [light, dark]) {
    for (const [text, surface] of [['foreground', 'surface'], ['foreground', 'surface-elevated'], ['muted-foreground', 'muted'], ['accent-foreground', 'accent'], ['destructive-foreground', 'destructive'], ['success', 'success-surface'], ['warning', 'warning-surface']]) {
      const a = luminance(theme[text]), b = luminance(theme[surface])
      assert.ok((Math.max(a, b) + .05) / (Math.min(a, b) + .05) >= 4.5, `${text} on ${surface}`)
    }
  }
})

test('system theme changes update root classes even when storage is unavailable', () => {
  const effects: Array<() => unknown> = []
  const classes = new Set<string>()
  let onChange = () => {}
  const mq = { matches: false, addEventListener: (_: string, handler: () => void) => { onChange = handler }, removeEventListener() {} }
  const { ThemeProvider } = component('contexts/ThemeContext.tsx', {
    useState: (value: unknown) => [value, () => {}],
    useCallback: (fn: unknown) => fn,
    useEffect: (fn: () => unknown) => effects.push(fn),
  }, {
    window: { matchMedia: () => mq },
    localStorage: { getItem() { throw new Error('storage blocked') } },
    document: { documentElement: { classList: { add: (name: string) => classes.add(name), remove: (...names: string[]) => names.forEach(name => classes.delete(name)) } } },
  })
  ThemeProvider({ children: null })
  effects.forEach(effect => effect())
  assert.ok(classes.has('light'))
  mq.matches = true
  onChange()
  assert.ok(classes.has('dark'))
  assert.ok(!classes.has('light'))
})
