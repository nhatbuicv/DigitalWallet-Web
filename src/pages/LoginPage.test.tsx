import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { AppRoutes } from '@/App'
import { apiClient } from '@/api/client'
import { AppError } from '@/api/errorHandler'
import { useAuthStore } from '@/stores/authStore'
import { LoginPage } from './LoginPage'

function createJwtWithRole(role: string): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const payload = btoa(JSON.stringify({ sub: 'admin-1', role }))
  return `${header}.${payload}.signature`
}

async function flushPromises() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
}

async function setInputValue(input: HTMLInputElement, value: string) {
  await act(async () => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
    setter?.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
    input.dispatchEvent(new Event('change', { bubbles: true }))
  })
}

describe('LoginPage', () => {
  let container: HTMLDivElement | null = null
  let root: Root | null = null

  beforeAll(() => {
    ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

    class ResizeObserverMock {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    vi.stubGlobal('ResizeObserver', ResizeObserverMock)

    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    })
  })

  beforeEach(() => {
    window.localStorage.clear()
    useAuthStore.getState().clearSession()
  })

  afterEach(async () => {
    vi.restoreAllMocks()
    if (root) {
      await act(async () => {
        root?.unmount()
      })
      root = null
    }
    container?.remove()
    container = null
    useAuthStore.getState().clearSession()
  })

  async function renderLogin(useFullRouter = false) {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)

    await act(async () => {
      root?.render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={['/login']}>
            {useFullRouter ? <AppRoutes /> : <LoginPage />}
          </MemoryRouter>
        </QueryClientProvider>,
      )
    })

    return container
  }

  async function submitForm(el: HTMLElement, email: string, password: string) {
    const emailInput = el.querySelector<HTMLInputElement>('input[id="identifier"]')
    const passwordInput = el.querySelector<HTMLInputElement>('input[id="password"]')
    const form = el.querySelector('form')

    expect(emailInput).not.toBeNull()
    expect(passwordInput).not.toBeNull()
    expect(form).not.toBeNull()

    await setInputValue(emailInput!, email)
    await setInputValue(passwordInput!, password)

    await act(async () => {
      form!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    })
    await flushPromises()
  }

  it('validates email format and password minimum length', async () => {
    const postSpy = vi.spyOn(apiClient, 'post')
    const el = await renderLogin()

    await submitForm(el, 'invalid-email', '123')
    await flushPromises()

    expect(el.textContent).toContain('Email không đúng định dạng')
    expect(el.textContent).toContain('Mật khẩu phải có ít nhất 6 ký tự')
    expect(postSpy).not.toHaveBeenCalled()
  })

  it('submits WEB_ADMIN login with deviceId/deviceName, saves session, and redirects to /dashboard', async () => {
    const accessToken = createJwtWithRole('ADMIN')
    const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValue({
      status: 200,
      data: {
        code: 1000,
        success: true,
        data: {
          accessToken,
          refreshToken: 'refresh-token-123',
          customerId: 'cust-1',
          fullName: 'Admin User',
          phone: '0901234567',
        },
      },
    })

    const el = await renderLogin(true)
    await submitForm(el, 'admin@example.com', 'secret123')

    expect(postSpy).toHaveBeenCalledTimes(1)
    const [url, payload] = postSpy.mock.calls[0]
    expect(url).toBe('/auth/login')
    expect(payload).toMatchObject({
      identifier: 'admin@example.com',
      password: 'secret123',
      clientType: 'WEB_ADMIN',
    })
    expect((payload as { deviceId: string }).deviceId).toBeTruthy()
    expect((payload as { deviceName: string }).deviceName).toBeTruthy()

    const authState = useAuthStore.getState()
    expect(authState.accessToken).toBe(accessToken)
    expect(authState.refreshToken).toBe('refresh-token-123')
    expect(authState.user).toEqual({
      customerId: 'cust-1',
      fullName: 'Admin User',
      phone: '0901234567',
      role: 'ADMIN',
    })

    expect(el.textContent).toContain('Tổng quan')
  })

  it.each([
    { code: 1003, kind: 'unauthorized' as const, expected: 'Email hoặc mật khẩu không chính xác.' },
    {
      code: 1011,
      kind: 'forbidden' as const,
      expected: 'Tài khoản của bạn không được phép đăng nhập vào Web Admin.',
    },
    {
      code: 1050,
      kind: 'forbidden' as const,
      expected: 'Tài khoản đã bị khóa. Vui lòng liên hệ quản trị viên.',
    },
    {
      code: 1052,
      kind: 'forbidden' as const,
      expected: 'Tài khoản chưa được kích hoạt hoặc đã ngừng hoạt động.',
    },
    {
      code: 9003,
      kind: 'rate_limited' as const,
      expected: 'Bạn đã thử đăng nhập quá nhiều lần. Vui lòng thử lại sau.',
    },
  ])('displays error message for code $code', async ({ code, kind, expected }) => {
    vi.spyOn(apiClient, 'post').mockRejectedValue(
      new AppError({
        kind,
        code,
        message: 'Raw backend message',
      }),
    )

    const el = await renderLogin()
    await submitForm(el, 'admin@example.com', 'secret123')

    expect(el.textContent).toContain(expected)
  })

  it('displays retryAfter seconds when rate limited (9003)', async () => {
    vi.spyOn(apiClient, 'post').mockRejectedValue(
      new AppError({
        kind: 'rate_limited',
        code: 9003,
        message: 'Too many requests',
        retryAfter: 30,
      }),
    )

    const el = await renderLogin()
    await submitForm(el, 'admin@example.com', 'secret123')

    expect(el.textContent).toContain('Vui lòng thử lại sau 30 giây.')
  })
})
