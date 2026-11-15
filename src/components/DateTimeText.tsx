import dayjs, { type ConfigType } from 'dayjs'
import type { CSSProperties } from 'react'

export interface DateTimeTextProps {
  value?: ConfigType
  format?: string
  fallback?: string
  className?: string
  style?: CSSProperties
}

export function DateTimeText({
  value,
  format = 'DD/MM/YYYY HH:mm:ss',
  fallback = '—',
  className,
  style,
}: DateTimeTextProps) {
  if (value === null || value === undefined || value === '') {
    return (
      <span className={className} style={style}>
        {fallback}
      </span>
    )
  }

  const parsed = dayjs(value)
  if (!parsed.isValid()) {
    return (
      <span className={className} style={style}>
        {fallback}
      </span>
    )
  }

  return (
    <span
      className={className}
      title={parsed.toISOString()}
      style={{
        fontVariantNumeric: 'tabular-nums',
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {parsed.format(format)}
    </span>
  )
}
