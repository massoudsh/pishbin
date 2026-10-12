'use client'

import { useEffect, useState } from 'react'
import { apiClient, getApiErrorMessage } from '@/lib/api'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/layout/Navbar'
import { useTheme, type Theme } from '@/contexts/ThemeContext'
import { useToast } from '@/contexts/ToastContext'
import { fa } from '@/lib/fa'
import { Button } from '@/components/ui/button'

export default function SettingsPage() {
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const { addToast } = useToast()
  const [user, setUser] = useState<{ email?: string; username?: string; full_name?: string | null; totp_enabled?: boolean; dashboard_preferences?: { widget_ids?: string[] } | null } | null>(null)
  const [loading, setLoading] = useState(true)
  const [isGuest, setIsGuest] = useState(false)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [form, setForm] = useState({ email: '', username: '', full_name: '' })
  const [apiKeys, setApiKeys] = useState<Array<{ id: number; name: string; last_used_at: string | null; created_at: string }>>([])
  const [apiKeyName, setApiKeyName] = useState('')
  const [creatingKey, setCreatingKey] = useState(false)
  const [newKeyShown, setNewKeyShown] = useState<{ id: number; name: string; key: string } | null>(null)
  const [revokingId, setRevokingId] = useState<number | null>(null)
  const [twoFaSetup, setTwoFaSetup] = useState<{ secret: string; provisioning_uri: string } | null>(null)
  const [twoFaCode, setTwoFaCode] = useState('')
  const [twoFaDisablePassword, setTwoFaDisablePassword] = useState('')
  const [twoFaLoading, setTwoFaLoading] = useState(false)
  const [dashboardWidgets, setDashboardWidgets] = useState<string[]>(['kpi', 'burn', 'charts', 'quick_links', 'accounts', 'recent'])
  const [savingLayout, setSavingLayout] = useState(false)
  const [backupDownloading, setBackupDownloading] = useState(false)
  const [restoreFile, setRestoreFile] = useState<File | null>(null)
  const [restoreConfirm, setRestoreConfirm] = useState(false)
  const [restoring, setRestoring] = useState(false)

  useEffect(() => {
    loadUser()
  }, [])

  useEffect(() => {
    if (user) {
      setForm({
        email: user.email ?? '',
        username: user.username ?? '',
        full_name: user.full_name ?? '',
      })
      if (user.dashboard_preferences?.widget_ids?.length) setDashboardWidgets(user.dashboard_preferences.widget_ids)
    }
  }, [user])

  const loadApiKeys = async () => {
    try {
      const list = await apiClient.listApiKeys()
      setApiKeys(list)
    } catch {
      setApiKeys([])
    }
  }

  const loadUser = async () => {
    try {
      const data = await apiClient.getCurrentUser()
      setUser(data)
      loadApiKeys()
    } catch (error) {
      console.error('Failed to load user:', error)
      const status = (error as any)?.response?.status
      if (status === 401) setIsGuest(true)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)
    setSaving(true)
    try {
      const updated = await apiClient.updateProfile({
        email: form.email || undefined,
        username: form.username || undefined,
        full_name: form.full_name || undefined,
      })
      setUser(updated)
      setEditing(false)
      setMessage({ type: 'success', text: fa.settings.profileUpdated })
      addToast('success', fa.settings.profileUpdated)
    } catch (err) {
      setMessage({ type: 'error', text: getApiErrorMessage(err) })
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    router.replace('/dashboard')
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <h2 className="text-2xl font-bold text-foreground mb-6">{fa.settings.title}</h2>

          {loading ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">{fa.settings.loading}</div>
          ) : isGuest ? (
            <div className="card p-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">{fa.settings.guestMode}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {fa.settings.createAccountToManage}
              </p>
              <div className="mt-6">
                <Link
                  href="/register"
                  className="inline-flex items-center bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 text-sm font-medium"
                >
                  {fa.common.createAccount}
                </Link>
              </div>
            </div>
          ) : user ? (
            <div className="space-y-6">
              <div className="card p-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">{fa.settings.profile}</h3>
                {message && (
                  <div
                    className={`mb-4 px-4 py-3 rounded-md text-sm ${
                      message.type === 'success'
                        ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200'
                        : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200'
                    }`}
                  >
                    {message.text}
                  </div>
                )}
                {editing ? (
                  <form onSubmit={handleSaveProfile} className="space-y-4">
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {fa.auth.email}
                      </label>
                      <input
                        id="email"
                        type="email"
                        required
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        value={form.email}
                        onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {fa.auth.username}
                      </label>
                      <input
                        id="username"
                        type="text"
                        required
                        minLength={3}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        value={form.username}
                        onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {fa.settings.fullName}
                      </label>
                      <input
                        id="full_name"
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        value={form.full_name}
                        onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button type="submit" disabled={saving}>
                        {saving ? fa.settings.saving : fa.common.save}
                      </Button>
                      <Button variant="outline" onClick={() => { setEditing(false); setForm({ email: user.email ?? '', username: user.username ?? '', full_name: user.full_name ?? '' }); }}>
                        {fa.common.cancel}
                      </Button>
                    </div>
                  </form>
                ) : (
                  <>
                    <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                      <div>
                        <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">{fa.auth.email}</dt>
                        <dd className="mt-1 text-sm text-gray-900 dark:text-white">{user.email}</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">{fa.auth.username}</dt>
                        <dd className="mt-1 text-sm text-gray-900 dark:text-white">{user.username}</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">{fa.settings.fullName}</dt>
                        <dd className="mt-1 text-sm text-gray-900 dark:text-white">{user.full_name || '—'}</dd>
                      </div>
                    </dl>
                    <div className="mt-6">
                      <button
                        type="button"
                        onClick={() => setEditing(true)}
                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 text-sm font-medium"
                      >
                        {fa.nav.editProfile}
                      </button>
                    </div>
                  </>
                )}
              </div>

              <div className="card p-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">{fa.nav.appearance}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{fa.settings.chooseTheme}</p>
                <div className="flex gap-2">
                  {(['light', 'dark', 'system'] as Theme[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTheme(t)}
                      className={`px-4 py-2 rounded-md text-sm font-medium ${
                        theme === t
                          ? 'bg-primary-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      {t === 'light' ? fa.settings.light : t === 'dark' ? fa.settings.dark : fa.settings.system}
                    </button>
                  ))}
                </div>
              </div>

              <div className="card p-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">{fa.settings.dashboardLayout}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">انتخاب کنید کدام بخش‌ها در داشبورد نمایش داده شوند.</p>
                <div className="flex flex-wrap gap-4 mb-4">
                  {[
                    { id: 'kpi', label: 'نوار شاخص' },
                    { id: 'burn', label: 'هوش سوخت' },
                    { id: 'charts', label: 'نمودارها' },
                    { id: 'quick_links', label: 'لینک‌های سریع' },
                    { id: 'accounts', label: 'حساب‌ها' },
                    { id: 'recent', label: 'تراکنش‌های اخیر' },
                  ].map((w) => (
                    <label key={w.id} className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={dashboardWidgets.includes(w.id)} onChange={(e) => setDashboardWidgets((prev) => (e.target.checked ? [...prev, w.id] : prev.filter((x) => x !== w.id)))} className="rounded border-gray-300 dark:border-gray-600 text-primary-600" />
                      <span className="text-sm text-gray-700 dark:text-gray-300">{w.label}</span>
                    </label>
                  ))}
                </div>
                <button type="button" disabled={savingLayout} onClick={async () => { setSavingLayout(true); try { const u = await apiClient.updateProfile({ dashboard_preferences: { widget_ids: dashboardWidgets } }); setUser((prev) => (prev ? { ...prev, dashboard_preferences: u.dashboard_preferences ?? undefined } : null)); addToast('success', 'چیدمان ذخیره شد.'); } catch (err) { addToast('error', getApiErrorMessage(err)); } finally { setSavingLayout(false); }}} className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 text-sm font-medium">{savingLayout ? fa.common.loading : fa.common.save}</button>
              </div>

              <div className="card p-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">{fa.settings.security}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{fa.settings.twoFactor}</p>
                {user?.totp_enabled ? (
                  <div>
                    <p className="text-sm text-green-600 dark:text-green-400 mb-2">احراز هویت دو مرحله‌ای فعال است.</p>
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault()
                        if (!twoFaDisablePassword) return
                        setTwoFaLoading(true)
                        try {
                          await apiClient.disable2fa(twoFaDisablePassword)
                          setUser((u) => (u ? { ...u, totp_enabled: false } : null))
                          setTwoFaDisablePassword('')
                          addToast('success', '۲FA غیرفعال شد.')
                        } catch (err) {
                          addToast('error', getApiErrorMessage(err))
                        } finally {
                          setTwoFaLoading(false)
                        }
                      }}
                      className="flex gap-2 items-end"
                    >
                      <div className="flex-1">
                        <label htmlFor="disable-2fa-pw" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{fa.auth.password}</label>
                        <input id="disable-2fa-pw" type="password" value={twoFaDisablePassword} onChange={(e) => setTwoFaDisablePassword(e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700" />
                      </div>
                      <button type="submit" disabled={twoFaLoading} className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 text-sm font-medium">غیرفعال کردن ۲FA</button>
                    </form>
                  </div>
                ) : twoFaSetup ? (
                  <div className="space-y-3">
                    <p className="text-sm text-gray-600 dark:text-gray-400">کد اپ احراز هویت را با این رمز (یا اسکن QR) اضافه کنید، سپس کد ۶ رقمی را وارد کنید.</p>
                    <p className="text-xs font-mono break-all bg-gray-100 dark:bg-gray-800 p-2 rounded">{twoFaSetup.secret}</p>
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault()
                        if (twoFaCode.length !== 6) return
                        setTwoFaLoading(true)
                        try {
                          await apiClient.enable2fa(twoFaCode, twoFaSetup.secret)
                          setUser((u) => (u ? { ...u, totp_enabled: true } : null))
                          setTwoFaSetup(null)
                          setTwoFaCode('')
                          addToast('success', '۲FA فعال شد.')
                        } catch (err) {
                          addToast('error', getApiErrorMessage(err))
                        } finally {
                          setTwoFaLoading(false)
                        }
                      }}
                      className="flex gap-2"
                    >
                      <input type="text" inputMode="numeric" maxLength={6} placeholder="۰۰۰۰۰۰" value={twoFaCode} onChange={(e) => setTwoFaCode(e.target.value.replace(/\D/g, ''))} className="w-32 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-center" />
                      <button type="submit" disabled={twoFaLoading || twoFaCode.length !== 6} className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 text-sm font-medium">{fa.auth.verify}</button>
                      <button type="button" onClick={() => { setTwoFaSetup(null); setTwoFaCode(''); }} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm">{fa.common.cancel}</button>
                    </form>
                  </div>
                ) : (
                  <button type="button" onClick={async () => { try { const s = await apiClient.get2faSetup(); setTwoFaSetup(s); } catch (err) { addToast('error', getApiErrorMessage(err)); } }} className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 text-sm font-medium">فعال‌سازی ۲FA</button>
                )}
              </div>

              <div className="card p-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">{fa.settings.apiKeys}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{fa.settings.apiKeysDescription}</p>
                <form
                  onSubmit={async (e) => {
                    e.preventDefault()
                    if (!apiKeyName.trim()) return
                    setCreatingKey(true)
                    try {
                      const res = await apiClient.createApiKey(apiKeyName.trim())
                      setNewKeyShown({ id: res.id, name: res.name, key: res.key })
                      setApiKeyName('')
                      loadApiKeys()
                    } catch (err) {
                      addToast('error', getApiErrorMessage(err))
                    } finally {
                      setCreatingKey(false)
                    }
                  }}
                  className="flex gap-2 mb-4"
                >
                  <input
                    type="text"
                    placeholder={fa.settings.keyName}
                    value={apiKeyName}
                    onChange={(e) => setApiKeyName(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  <button type="submit" disabled={creatingKey} className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 text-sm font-medium">
                    {creatingKey ? fa.settings.saving : fa.settings.createApiKey}
                  </button>
                </form>
                <ul className="space-y-2">
                  {apiKeys.map((k) => (
                    <li key={k.id} className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-700 last:border-0">
                      <div>
                        <span className="font-medium text-gray-900 dark:text-white">{k.name}</span>
                        <span className="text-sm text-gray-500 dark:text-gray-400 mr-2">
                          · {k.last_used_at ? new Date(k.last_used_at).toLocaleDateString('fa-IR') : fa.settings.neverUsed}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          if (!confirm(fa.settings.revokeConfirm)) return
                          setRevokingId(k.id)
                          try {
                            await apiClient.revokeApiKey(k.id)
                            loadApiKeys()
                          } catch (err) {
                            addToast('error', getApiErrorMessage(err))
                          } finally {
                            setRevokingId(null)
                          }
                        }}
                        disabled={revokingId === k.id}
                        className="text-red-600 dark:text-red-400 text-sm font-medium hover:underline disabled:opacity-50"
                      >
                        {fa.settings.revoke}
                      </button>
                    </li>
                  ))}
                </ul>
                {newKeyShown && (
                  <div className="mt-4 p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                    <p className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-2">{fa.settings.keyCreatedCopy}</p>
                    <div className="flex gap-2">
                      <code className="flex-1 break-all text-xs bg-white dark:bg-gray-800 p-2 rounded border border-amber-200 dark:border-amber-700">
                        {newKeyShown.key}
                      </code>
                      <button
                        type="button"
                        onClick={() => { navigator.clipboard.writeText(newKeyShown!.key); addToast('success', fa.settings.copyKey); }}
                        className="px-3 py-1.5 bg-amber-600 text-white rounded text-sm"
                      >
                        {fa.settings.copyKey}
                      </button>
                    </div>
                    <button type="button" onClick={() => setNewKeyShown(null)} className="mt-2 text-sm text-amber-700 dark:text-amber-300 hover:underline">
                      {fa.common.close}
                    </button>
                  </div>
                )}
              </div>

              <div className="card p-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">{fa.settings.backupRestore}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">پشتیبان JSON از حساب‌ها، تراکنش‌ها، بودجه و اهداف.</p>
                <div className="flex flex-wrap gap-4 items-end">
                  <button type="button" disabled={backupDownloading} onClick={async () => { setBackupDownloading(true); try { const data = await apiClient.getBackup(); const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `pishbin-backup-${new Date().toISOString().slice(0, 10)}.json`; a.click(); URL.revokeObjectURL(url); addToast('success', 'پشتیبان دانلود شد.'); } catch (err) { addToast('error', getApiErrorMessage(err)); } finally { setBackupDownloading(false); } }} className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 text-sm font-medium">دانلود پشتیبان</button>
                  <div className="flex gap-2 items-center flex-wrap">
                    <input type="file" accept=".json" onChange={(e) => setRestoreFile(e.target.files?.[0] ?? null)} className="text-sm" />
                    <label className="flex items-center gap-1 text-sm text-gray-700 dark:text-gray-300"><input type="checkbox" checked={restoreConfirm} onChange={(e) => setRestoreConfirm(e.target.checked)} /> تأیید بازیابی</label>
                    <button type="button" disabled={!restoreFile || !restoreConfirm || restoring} onClick={async () => { if (!restoreFile || !restoreConfirm) return; setRestoring(true); try { await apiClient.restoreBackup(restoreFile, true); addToast('success', 'فایل اعتبارسنجی شد.'); setRestoreFile(null); setRestoreConfirm(false); } catch (err) { addToast('error', getApiErrorMessage(err)); } finally { setRestoring(false); } }} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm disabled:opacity-50">ارسال برای اعتبارسنجی</button>
                  </div>
                </div>
              </div>

              <div className="card p-6">
                <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={handleLogout}
                    className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 text-sm font-medium"
                  >
                    {fa.settings.logout}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">{fa.settings.failedToLoadUser}</div>
          )}
        </div>
      </main>
    </div>
  )
}
