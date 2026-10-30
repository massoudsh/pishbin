'use client'

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { apiClient } from '@/lib/api'

export interface AuthUser {
  id: number
  email: string
  username: string
  full_name: string | null
  is_active: boolean
}

interface AuthContextValue {
  user: AuthUser | null
  loading: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => void
  refreshAuth: () => Promise<boolean>
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

interface AuthProviderProps {
  children: React.ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshAuth = useCallback(async (): Promise<boolean> => {
    if (typeof window === 'undefined') return false
    const token = apiClient.getRefreshToken()
    if (!token && !localStorage.getItem('access_token')) {
      setUser(null)
      return false
    }
    try {
      const userData = await apiClient.getCurrentUser()
      setUser(userData as AuthUser)
      return true
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status
      if (status === 401 || status === 403) apiClient.logout()
      setUser(null)
      return false
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    async function init() {
      const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') || apiClient.getRefreshToken() : null
      if (!token) {
        if (!cancelled) setLoading(false)
        return
      }
      await refreshAuth()
      if (!cancelled) setLoading(false)
    }
    init()
    return () => { cancelled = true }
  }, [refreshAuth])

  const login = useCallback(async (username: string, password: string) => {
    await apiClient.login(username, password)
    const userData = await apiClient.getCurrentUser()
    setUser(userData as AuthUser)
  }, [])

  const logout = useCallback(() => {
    apiClient.logout?.()
    setUser(null)
  }, [])

  const value: AuthContextValue = {
    user,
    loading,
    login,
    logout,
    refreshAuth,
    isAuthenticated: !!user,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
