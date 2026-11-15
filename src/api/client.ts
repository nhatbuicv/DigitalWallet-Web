import axios, { type AxiosResponse } from 'axios'
import { useAuthStore } from '@/stores/authStore'
import { AppError, normalizeError } from './errorHandler'
import type { ApiResponse } from './types'

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 15_000,
})

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`)
  }
  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => Promise.reject(normalizeError(error)),
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
