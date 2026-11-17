import type { WalletStatus, WalletType } from '@/api/types'

export const WALLET_STATUS_OPTIONS: { value: WalletStatus; label: string }[] = [
  { value: 'ACTIVE', label: 'Hoạt động (ACTIVE)' },
  { value: 'INACTIVE', label: 'Không hoạt động (INACTIVE)' },
  { value: 'FROZEN', label: 'Đóng băng (FROZEN)' },
  { value: 'CLOSED', label: 'Đã đóng (CLOSED)' },
  { value: 'PENDING', label: 'Chờ duyệt (PENDING)' },
  { value: 'SUSPENDED', label: 'Tạm ngưng (SUSPENDED)' },
]

export const WALLET_TYPE_OPTIONS: { value: WalletType; label: string }[] = [
  { value: 'CHECKING', label: 'Thanh toán (CHECKING)' },
  { value: 'SAVINGS', label: 'Tiết kiệm (SAVINGS)' },
  { value: 'BUSINESS', label: 'Doanh nghiệp (BUSINESS)' },
  { value: 'FOREIGN', label: 'Ngoại tệ (FOREIGN)' },
  { value: 'PAYROLL', label: 'Trả lương (PAYROLL)' },
  { value: 'INVESTMENT', label: 'Đầu tư (INVESTMENT)' },
  { value: 'JOINT', label: 'Đồng sở hữu (JOINT)' },
  { value: 'SYSTEM', label: 'Hệ thống (SYSTEM)' },
]
