import type { AuditAction, AuditTargetType } from '@/api/types'

export const AUDIT_ACTION_OPTIONS: { value: AuditAction; label: string }[] = [
  { value: 'USER_STATUS_CHANGE', label: 'Đổi trạng thái người dùng (USER_STATUS_CHANGE)' },
  { value: 'USER_ROLE_CHANGE', label: 'Đổi vai trò người dùng (USER_ROLE_CHANGE)' },
  { value: 'WALLET_FREEZE', label: 'Đóng băng ví (WALLET_FREEZE)' },
  { value: 'WALLET_UNFREEZE', label: 'Mở đóng băng ví (WALLET_UNFREEZE)' },
]

export const AUDIT_TARGET_TYPE_OPTIONS: { value: AuditTargetType; label: string }[] = [
  { value: 'USER', label: 'Người dùng (USER)' },
  { value: 'WALLET', label: 'Ví điện tử (WALLET)' },
]
