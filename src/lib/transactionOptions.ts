import type { TransactionStatus, TransactionType } from '@/api/types'

export const TRANSACTION_STATUS_OPTIONS: { value: TransactionStatus; label: string }[] = [
  { value: 'PENDING', label: 'Chờ xử lý (PENDING)' },
  { value: 'PROCESSING', label: 'Đang xử lý (PROCESSING)' },
  { value: 'SUCCESS', label: 'Thành công (SUCCESS)' },
  { value: 'FAILED', label: 'Thất bại (FAILED)' },
  { value: 'REVERSED', label: 'Đã hoàn tác (REVERSED)' },
]

export const TRANSACTION_TYPE_OPTIONS: { value: TransactionType; label: string }[] = [
  { value: 'DEPOSIT', label: 'Nạp tiền (DEPOSIT)' },
  { value: 'WITHDRAW', label: 'Rút tiền (WITHDRAW)' },
  { value: 'TRANSFER', label: 'Chuyển tiền (TRANSFER)' },
  { value: 'PAYMENT', label: 'Thanh toán (PAYMENT)' },
  { value: 'REFUND', label: 'Hoàn tiền (REFUND)' },
]
