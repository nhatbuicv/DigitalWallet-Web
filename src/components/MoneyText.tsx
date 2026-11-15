import type { CSSProperties } from 'react'
import type { EntryType } from '@/api/types'

export interface MoneyTextProps {
  amount?: number | string | null
  currency?: string
  entryType?: EntryType | string | null
  showSign?: boolean
  fallback?: string
  className?: string
  style?: CSSProperties
}

function formatAmount(value: number, currency: string): string {
  try {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency,
      maximumFractionDigits: currency === 'VND' ? 0 : 2,
    }).format(value)
  } catch {
    return `${new Intl.NumberFormat('vi-VN').format(value)} ${currency}`
  }
}

export function MoneyText({
  amount,
  currency = 'VND',
  entryType,
  showSign = true,
  fallback = '—',
  className,
  style,
}: MoneyTextProps) {
  if (amount === null || amount === undefined || amount === '') {
    return (
      <span className={className} style={style}>
        {fallback}
      </span>
    )
  }

  const numeric = typeof amount === 'number' ? amount : Number(amount)
  if (!Number.isFinite(numeric)) {
    return (
      <span className={className} style={style}>
        {fallback}
      </span>
    )
  }

  const normalizedEntry = entryType?.toUpperCase()
  const isDebit = normalizedEntry === 'DEBIT'
  const isCredit = normalizedEntry === 'CREDIT'

  const color = isDebit ? '#cf1322' : isCredit ? '#389e0d' : undefined
  const sign = showSign ? (isDebit ? '-' : isCredit ? '+' : '') : ''
  const formatted = formatAmount(Math.abs(numeric), currency)
  const displayValue = numeric < 0 && !sign ? `-${formatted}` : `${sign}${formatted}`

  return (
    <span
      className={className}
      style={{
        fontVariantNumeric: 'tabular-nums',
        fontWeight: isDebit || isCredit ? 600 : 500,
        color,
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {displayValue}
    </span>
  )
}
