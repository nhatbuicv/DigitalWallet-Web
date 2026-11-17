import axios, { type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'
import { useAuthStore } from '@/stores/authStore'
import { AppError, normalizeError } from './errorHandler'
import type { ApiResponse, RefreshTokenRequest, TokenRefreshResponse } from './types'

interface RetryableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean
}

const SKIP_REFRESH_PATHS = ['/auth/login', '/auth/refresh']

function shouldSkipRefresh(url?: string): boolean {
  if (!url) return false
  return SKIP_REFRESH_PATHS.some((path) => url.includes(path))
}

function redirectToLogin(): void {
  if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
    window.location.assign('/login')
  }
}

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 15_000,
})

let refreshPromise: Promise<string> | null = null

async function performRefresh(): Promise<string> {
  const { refreshToken, setTokens, clearSession } = useAuthStore.getState()

  if (!refreshToken) {
    clearSession()
    redirectToLogin()
    throw new AppError({
      kind: 'unauthorized',
      message: 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.',
      status: 401,
    })
  }

  try {
    const response = await apiClient.post<ApiResponse<TokenRefreshResponse>>('/auth/refresh', {
      refreshToken,
    } satisfies RefreshTokenRequest)
    const tokens = unwrapResponse(response)
    if (!tokens.accessToken) {
      throw new AppError({
        kind: 'unauthorized',
        message: 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.',
        status: 401,
      })
    }
    setTokens({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    })
    return tokens.accessToken
  } catch (error) {
    clearSession()
    redirectToLogin()
    throw normalizeError(error)
  }
}

function getRefreshPromise(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = performRefresh().finally(() => {
      refreshPromise = null
    })
  }
  return refreshPromise
}

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`)
  }
  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (!axios.isAxiosError(error)) {
      return Promise.reject(normalizeError(error))
    }

    const originalRequest = error.config as RetryableRequestConfig | undefined
    const status = error.response?.status

    if (
      status !== 401 ||
      !originalRequest ||
      originalRequest._retry ||
      shouldSkipRefresh(originalRequest.url)
    ) {
      return Promise.reject(normalizeError(error))
    }

    originalRequest._retry = true

    try {
      await getRefreshPromise()
      return await apiClient(originalRequest)
    } catch (refreshError) {
      return Promise.reject(normalizeError(refreshError))
    }
  },
)

/** Unwrap `ApiResponse<T>`; throws AppError when the backend reports `success: false`. */
export function unwrapResponse<T>(response: AxiosResponse<ApiResponse<T>>): T {
  const body = response.data
  if (!body.success) {
    throw new AppError({
      kind: 'unknown',
      message: body.message || 'Yêu cầu không thành công.',
      status: response.status,
      code: body.code,
    })
  }
  return body.data as T
}
