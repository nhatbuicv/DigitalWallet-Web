import type { ReactNode } from 'react'
import { Outlet } from 'react-router-dom'
import type { UserRole } from '@/api/types'
import { decodeJwt } from '@/lib/jwt'
import { ForbiddenPage } from '@/pages/ForbiddenPage'
import { useAuthStore } from '@/stores/authStore'

export interface RoleGuardProps {
  allowedRoles: UserRole[]
  children?: ReactNode
}

export function RoleGuard({ allowedRoles, children }: RoleGuardProps) {
  const user = useAuthStore((s) => s.user)
  const accessToken = useAuthStore((s) => s.accessToken)

  const role = user?.role ?? decodeJwt(accessToken)?.role

  if (!role || !allowedRoles.includes(role)) {
    return <ForbiddenPage />
  }

  return children ? <>{children}</> : <Outlet />
}
