import type { UserRole, UserStatus } from '@/api/types'

export const USER_STATUS_OPTIONS: { value: UserStatus; label: string }[] = [
  { value: 'ACTIVE', label: 'Hoạt động (ACTIVE)' },
  { value: 'INACTIVE', label: 'Không hoạt động (INACTIVE)' },
  { value: 'LOCKED', label: 'Đã khóa (LOCKED)' },
  { value: 'PENDING', label: 'Chờ duyệt (PENDING)' },
  { value: 'SUSPENDED', label: 'Tạm ngưng (SUSPENDED)' },
]

export const USER_ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: 'ADMIN', label: 'ADMIN' },
  { value: 'MANAGER', label: 'MANAGER' },
  { value: 'STAFF', label: 'STAFF' },
  { value: 'USER', label: 'USER' },
]
