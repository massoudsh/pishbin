'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

interface ProtectedRouteProps {
  children: React.ReactNode
  /** If true, redirect to login when not authenticated. Default true. */
  requireAuth?: boolean
}

/**
 * Wraps content that requires authentication. Redirects to /login when not authenticated.
 * Use for pages that should only be visible to signed-in users.
 */
export function ProtectedRoute({ children, requireAuth = true }: ProtectedRouteProps) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!requireAuth || loading) return
    if (!user) {
      const loginUrl = `/login?redirect=${encodeURIComponent(pathname || '/')}`
      router.replace(loginUrl)
    }
  }, [user, loading, requireAuth, router, pathname])

  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <div className="animate-pulse text-gray-500 dark:text-gray-400 font-dana">در حال بارگذاری…</div>
      </div>
    )
  }

  if (requireAuth && !user) {
    return null
  }

  return <>{children}</>
}
