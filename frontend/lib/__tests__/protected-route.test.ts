import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'

const source = readFileSync(new URL('../../components/ProtectedRoute.tsx', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText
const realRequire = createRequire(import.meta.url)

for (const state of [
  { loading: true, user: null, requireAuth: true, redirect: false, content: false },
  { loading: false, user: null, requireAuth: true, redirect: true, content: false },
  { loading: false, user: { id: 1 }, requireAuth: true, redirect: false, content: true },
  { loading: false, user: null, requireAuth: false, redirect: false, content: true },
]) {
  test(`route guard loading=${state.loading} user=${Boolean(state.user)} required=${state.requireAuth}`, () => {
    const effects: Array<() => void> = []
    const redirects: string[] = []
    const exports: { ProtectedRoute?: (props: { children: string; requireAuth: boolean }) => { props: { children: unknown } } | null } = {}
    runInNewContext(compiled, {
      exports,
      require: (name: string) => {
        if (name === 'react') return { useEffect: (effect: () => void) => effects.push(effect) }
        if (name === 'next/navigation') return { useRouter: () => ({ replace: (path: string) => redirects.push(path) }), usePathname: () => '/accounts' }
        if (name === '@/contexts/AuthContext') return { useAuth: () => state }
        return realRequire(name)
      },
    })
    const result = exports.ProtectedRoute!({ children: 'protected-content', requireAuth: state.requireAuth })
    for (const effect of effects) effect()
    assert.deepEqual(redirects, state.redirect ? ['/login?redirect=%2Faccounts'] : [])
    assert.equal(result?.props.children === 'protected-content', state.content)
    if (!state.loading && state.redirect) assert.equal(result, null)
  })
}
