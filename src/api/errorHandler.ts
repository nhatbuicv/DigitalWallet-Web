import axios from 'axios'
import type { ApiResponse } from './types'

export type AppErrorKind =
  | 'unauthorized'
  | 'forbidden'
  | 'rate_limited'
  | 'validation'
  | 'network'
  | 'timeout'
  | 'server'
  | 'unknown'

export interface AppErrorInit {
  kind: AppErrorKind
  message: string
  status?: number
  code?: number
  fieldErrors?: Record<string, string>
  retryAfter?: number
}

export class AppError extends Error {
  readonly kind: AppErrorKind
  readonly status?: number
  readonly code?: number
  readonly fieldErrors?: Record<string, string>
  readonly retryAfter?: number

  constructor(init: AppErrorInit) {
    super(init.message)
    this.name = 'AppError'
    this.kind = init.kind
    this.status = init.status
    this.code = init.code
    this.fieldErrors = init.fieldErrors
    this.retryAfter = init.retryAfter
  }
}

const DEFAULT_MESSAGES: Record<AppErrorKind, string> = {
  unauthorized: 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.',
  forbidden: 'Bạn không có quyền thực hiện thao tác này.',
  rate_limited: 'Bạn thao tác quá nhanh, vui lòng thử lại sau.',
  validation: 'Dữ liệu không hợp lệ.',
  network: 'Không thể kết nối tới máy chủ, vui lòng kiểm tra mạng.',
  timeout: 'Yêu cầu quá thời gian chờ, vui lòng thử lại.',
  server: 'Máy chủ gặp sự cố, vui lòng thử lại sau.',
  unknown: 'Đã xảy ra lỗi không xác định.',
}

/** Backend validation errors: `data` is a map of field -> message (best effort). */
function extractFieldErrors(data: unknown): Record<string, string> | undefined {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return undefined
  const entries = Object.entries(data as Record<string, unknown>).filter(
    (entry): entry is [string, string] => typeof entry[1] === 'string',
  )
  return entries.length > 0 ? Object.fromEntries(entries) : undefined
}

export function normalizeError(error: unknown): AppError {
  if (error instanceof AppError) return error

  if (axios.isAxiosError<ApiResponse<unknown>>(error)) {
    const response = error.response

    if (!response) {
      const kind: AppErrorKind = error.code === 'ECONNABORTED' ? 'timeout' : 'network'
      return new AppError({ kind, message: DEFAULT_MESSAGES[kind] })
    }

    const { status, data, headers } = response
    const body = data && typeof data === 'object' ? data : undefined
    const message = body?.message
    const code = body?.code

    let kind: AppErrorKind
    if (status === 401) kind = 'unauthorized'
    else if (status === 403) kind = 'forbidden'
    else if (status === 429) kind = 'rate_limited'
    else if (status >= 500) kind = 'server'
    else if (status === 400 || status === 422) kind = 'validation'
    else kind = 'unknown'

    const fieldErrors = kind === 'validation' ? extractFieldErrors(body?.data) : undefined
    const retryAfterRaw = Number(headers?.['retry-after'])

    return new AppError({
      kind,
      message: message || DEFAULT_MESSAGES[kind],
      status,
      code,
      fieldErrors,
      retryAfter:
        kind === 'rate_limited' && Number.isFinite(retryAfterRaw) ? retryAfterRaw : undefined,
    })
  }

  if (error instanceof Error) {
    return new AppError({ kind: 'unknown', message: error.message || DEFAULT_MESSAGES.unknown })
  }
  return new AppError({ kind: 'unknown', message: DEFAULT_MESSAGES.unknown })
}
