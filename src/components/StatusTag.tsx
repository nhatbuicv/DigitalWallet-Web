import { Tag, type TagProps } from 'antd'
import type {
  AuditAction,
  EntryType,
  TransactionStatus,
  TransactionType,
  UserRole,
  UserStatus,
  WalletStatus,
} from '@/api/types'

interface TagMeta {
  color: TagProps['color']
  label: string
}

const USER_STATUS_MAP: Record<UserStatus, TagMeta> = {
  ACTIVE: { color: 'success', label: 'Hoạt động' },
  INACTIVE: { color: 'default', label: 'Không hoạt động' },
  LOCKED: { color: 'error', label: 'Đã khóa' },
  PENDING: { color: 'warning', label: 'Chờ duyệt' },
  SUSPENDED: { color: 'volcano', label: 'Tạm ngưng' },
}

const WALLET_STATUS_MAP: Record<WalletStatus, TagMeta> = {
  ACTIVE: { color: 'success', label: 'Hoạt động' },
  INACTIVE: { color: 'default', label: 'Không hoạt động' },
  FROZEN: { color: 'cyan', label: 'Đóng băng' },
  CLOSED: { color: 'magenta', label: 'Đã đóng' },
  PENDING: { color: 'warning', label: 'Chờ duyệt' },
  SUSPENDED: { color: 'volcano', label: 'Tạm ngưng' },
}

const TRANSACTION_STATUS_MAP: Record<TransactionStatus, TagMeta> = {
  PENDING: { color: 'warning', label: 'Chờ xử lý' },
  PROCESSING: { color: 'processing', label: 'Đang xử lý' },
  SUCCESS: { color: 'success', label: 'Thành công' },
  FAILED: { color: 'error', label: 'Thất bại' },
  REVERSED: { color: 'purple', label: 'Đã hoàn tác' },
}

const TRANSACTION_TYPE_MAP: Record<TransactionType, TagMeta> = {
  DEPOSIT: { color: 'green', label: 'Nạp tiền' },
  WITHDRAW: { color: 'orange', label: 'Rút tiền' },
  TRANSFER: { color: 'blue', label: 'Chuyển tiền' },
  PAYMENT: { color: 'cyan', label: 'Thanh toán' },
  REFUND: { color: 'purple', label: 'Hoàn tiền' },
}

const AUDIT_ACTION_MAP: Record<AuditAction, TagMeta> = {
  USER_STATUS_CHANGE: { color: 'blue', label: 'Đổi trạng thái người dùng' },
  USER_ROLE_CHANGE: { color: 'purple', label: 'Đổi vai trò người dùng' },
  WALLET_FREEZE: { color: 'cyan', label: 'Đóng băng ví' },
  WALLET_UNFREEZE: { color: 'green', label: 'Mở đóng băng ví' },
}

const ENTRY_TYPE_MAP: Record<EntryType, TagMeta> = {
  DEBIT: { color: 'red', label: 'Ghi nợ (DEBIT)' },
  CREDIT: { color: 'green', label: 'Ghi có (CREDIT)' },
}

const USER_ROLE_MAP: Record<UserRole, TagMeta> = {
  ADMIN: { color: 'red', label: 'ADMIN' },
  MANAGER: { color: 'purple', label: 'MANAGER' },
  STAFF: { color: 'blue', label: 'STAFF' },
  USER: { color: 'default', label: 'USER' },
}

export type StatusKind =
  | 'userStatus'
  | 'walletStatus'
  | 'transactionStatus'
  | 'transactionType'
  | 'auditAction'
  | 'entryType'
  | 'userRole'

const KIND_MAPS: Record<StatusKind, Record<string, TagMeta>> = {
  userStatus: USER_STATUS_MAP,
  walletStatus: WALLET_STATUS_MAP,
  transactionStatus: TRANSACTION_STATUS_MAP,
  transactionType: TRANSACTION_TYPE_MAP,
  auditAction: AUDIT_ACTION_MAP,
  entryType: ENTRY_TYPE_MAP,
  userRole: USER_ROLE_MAP,
}

function findFallbackMeta(value: string): TagMeta | undefined {
  for (const map of Object.values(KIND_MAPS)) {
    if (value in map) {
      return map[value]
    }
  }
  return undefined
}

export interface StatusTagProps extends Omit<TagProps, 'color'> {
  value?: string | null
  kind?: StatusKind
  fallback?: string
}

export function StatusTag({ value, kind, fallback = '—', ...rest }: StatusTagProps) {
  if (!value) {
    return <span>{fallback}</span>
  }

  const normalized = value.toUpperCase()
  const meta = kind ? KIND_MAPS[kind][normalized] : findFallbackMeta(normalized)

  if (!meta) {
    return <Tag {...rest}>{value}</Tag>
  }

  return (
    <Tag color={meta.color} {...rest}>
      {meta.label}
    </Tag>
  )
}
