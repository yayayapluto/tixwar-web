import { redirect } from '@tanstack/react-router'
import { getSession } from '@/lib/auth'

export function requireAuth(redirectTo?: string) {
  const session = getSession()
  if (!session) {
    throw redirect({ to: '/login', search: redirectTo ? { redirect: redirectTo } : undefined })
  }
  return session
}

export function requireAdmin() {
  const session = requireAuth()
  if (session.user.role !== 'admin') {
    throw redirect({ to: '/' })
  }
  return session
}
