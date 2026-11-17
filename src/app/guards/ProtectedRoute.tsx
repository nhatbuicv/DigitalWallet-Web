import type { ReactNode } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'

export interface ProtectedRouteProps {
  children?: ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const accessToken = useAuthStore((s) => s.accessToken)
  const refreshToken = useAuthStore((s) => s.refreshToken)
  const location = useLocation()

  const isAuthenticated = Boolean(accessToken || refreshToken)

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return children ? <>{children}</> : <Outlet />
}
