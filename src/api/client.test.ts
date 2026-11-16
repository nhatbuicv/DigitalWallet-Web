import { http, HttpResponse, delay } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuthStore } from '@/stores/authStore'
import { apiClient, unwrapResponse } from './client'
import { AppError } from './errorHandler'

const server = setupServer()

describe('apiClient single-flight refresh token interceptor', () => {
  const assignMock = vi.fn()

  beforeAll(() => {
    server.listen()
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        ...window.location,
        pathname: '/dashboard',
        assign: assignMock,
      },
    })
  })

  afterEach(() => {
    server.resetHandlers()
    vi.clearAllMocks()
    useAuthStore.getState().clearSession()
  })

  afterAll(() => {
    server.close()
  })

  beforeEach(() => {
    useAuthStore.getState().setSession({
      accessToken: 'expired-access-token',
      refreshToken: 'valid-refresh-token',
      user: { customerId: 'cust-1', fullName: 'Admin', role: 'ADMIN' },
    })
  })

  it('calls POST /auth/refresh only once for 3 concurrent 401 requests and replays all of them', async () => {
    let refreshCallCount = 0
    let refreshBody: unknown = null

    server.use(
      http.post('*/auth/refresh', async ({ request }) => {
        refreshCallCount += 1
        refreshBody = await request.json()
        await delay(30)
        return HttpResponse.json({
          code: 200,
          success: true,
          data: {
            accessToken: 'fresh-access-token',
            refreshToken: 'fresh-refresh-token',
          },
        })
      }),
      http.get('*/users', ({ request }) => {
        if (request.headers.get('authorization') !== 'Bearer fresh-access-token') {
          return HttpResponse.json(
            { code: 401, success: false, message: 'Unauthorized' },
            { status: 401 },
          )
        }
        return HttpResponse.json({ code: 200, success: true, data: { items: ['u1'] } })
      }),
      http.get('*/wallets', ({ request }) => {
        if (request.headers.get('authorization') !== 'Bearer fresh-access-token') {
          return HttpResponse.json(
            { code: 401, success: false, message: 'Unauthorized' },
            { status: 401 },
          )
        }
        return HttpResponse.json({ code: 200, success: true, data: { items: ['w1'] } })
      }),
      http.get('*/transactions', ({ request }) => {
        if (request.headers.get('authorization') !== 'Bearer fresh-access-token') {
          return HttpResponse.json(
            { code: 401, success: false, message: 'Unauthorized' },
            { status: 401 },
          )
        }
        return HttpResponse.json({ code: 200, success: true, data: { items: ['t1'] } })
      }),
    )

    const [usersRes, walletsRes, txRes] = await Promise.all([
      apiClient.get('/users').then(unwrapResponse),
      apiClient.get('/wallets').then(unwrapResponse),
      apiClient.get('/transactions').then(unwrapResponse),
    ])

    expect(refreshCallCount).toBe(1)
    expect(refreshBody).toEqual({ refreshToken: 'valid-refresh-token' })
    expect(usersRes).toEqual({ items: ['u1'] })
    expect(walletsRes).toEqual({ items: ['w1'] })
    expect(txRes).toEqual({ items: ['t1'] })
    expect(useAuthStore.getState().accessToken).toBe('fresh-access-token')
    expect(useAuthStore.getState().refreshToken).toBe('fresh-refresh-token')
    expect(assignMock).not.toHaveBeenCalled()
  })

  it('clears session and redirects to /login once when /auth/refresh fails', async () => {
    let refreshCallCount = 0

    server.use(
      http.post('*/auth/refresh', async () => {
        refreshCallCount += 1
        await delay(20)
        return HttpResponse.json(
          { code: 401, success: false, message: 'Refresh token expired' },
          { status: 401 },
        )
      }),
      http.get('*/users', () =>
        HttpResponse.json({ code: 401, success: false, message: 'Unauthorized' }, { status: 401 }),
      ),
      http.get('*/wallets', () =>
        HttpResponse.json({ code: 401, success: false, message: 'Unauthorized' }, { status: 401 }),
      ),
      http.get('*/transactions', () =>
        HttpResponse.json({ code: 401, success: false, message: 'Unauthorized' }, { status: 401 }),
      ),
    )

    const results = await Promise.allSettled([
      apiClient.get('/users'),
      apiClient.get('/wallets'),
      apiClient.get('/transactions'),
    ])

    expect(refreshCallCount).toBe(1)
    expect(results.every((r) => r.status === 'rejected')).toBe(true)
    for (const r of results) {
      if (r.status === 'rejected') {
        expect(r.reason).toBeInstanceOf(AppError)
        expect((r.reason as AppError).kind).toBe('unauthorized')
      }
    }
    expect(useAuthStore.getState().accessToken).toBeNull()
    expect(useAuthStore.getState().refreshToken).toBeNull()
    expect(useAuthStore.getState().user).toBeNull()
    expect(assignMock).toHaveBeenCalledTimes(1)
    expect(assignMock).toHaveBeenCalledWith('/login')
  })

  it('skips refresh interceptor for /auth/login 401 responses', async () => {
    let refreshCallCount = 0

    server.use(
      http.post('*/auth/refresh', () => {
        refreshCallCount += 1
        return HttpResponse.json({ code: 200, success: true, data: { accessToken: 'x' } })
      }),
      http.post('*/auth/login', () =>
        HttpResponse.json({ code: 401, success: false, message: 'Sai mật khẩu' }, { status: 401 }),
      ),
    )

    await expect(
      apiClient.post('/auth/login', { phone: '0900000000', password: 'wrong' }),
    ).rejects.toMatchObject({
      kind: 'unauthorized',
      message: 'Sai mật khẩu',
    })

    expect(refreshCallCount).toBe(0)
    expect(assignMock).not.toHaveBeenCalled()
    expect(useAuthStore.getState().accessToken).toBe('expired-access-token')
  })

  it('clears session and redirects to /login when refreshToken is missing', async () => {
    useAuthStore.getState().setSession({
      accessToken: 'expired-access-token',
      refreshToken: null,
    })

    let refreshCallCount = 0

    server.use(
      http.post('*/auth/refresh', () => {
        refreshCallCount += 1
        return HttpResponse.json({ code: 200, success: true, data: { accessToken: 'x' } })
      }),
      http.get('*/users', () =>
        HttpResponse.json({ code: 401, success: false, message: 'Unauthorized' }, { status: 401 }),
      ),
    )

    await expect(apiClient.get('/users')).rejects.toBeInstanceOf(AppError)
    expect(refreshCallCount).toBe(0)
    expect(useAuthStore.getState().accessToken).toBeNull()
    expect(assignMock).toHaveBeenCalledWith('/login')
  })
})
