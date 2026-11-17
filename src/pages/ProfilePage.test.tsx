import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { AppRoutes } from '@/App'
import { apiClient } from '@/api/client'
import provinces from '@/data/provinces.json'
import { useAuthStore } from '@/stores/authStore'

async function flushPromises() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
}

async function setInputValue(input: HTMLInputElement | HTMLTextAreaElement, value: string) {
  await act(async () => {
    const proto =
      input instanceof HTMLTextAreaElement
        ? HTMLTextAreaElement.prototype
        : HTMLInputElement.prototype
    const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set
    setter?.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
    input.dispatchEvent(new Event('change', { bubbles: true }))
  })
}

describe('ProfilePage', () => {
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
    useAuthStore.getState().setSession({
      accessToken: 'admin-token',
      refreshToken: 'admin-refresh',
      user: { customerId: 'C-001', fullName: 'Admin Old', role: 'ADMIN' },
    })
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

  async function renderProfile() {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)

    await act(async () => {
      root?.render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={['/profile']}>
            <AppRoutes />
          </MemoryRouter>
        </QueryClientProvider>,
      )
    })
    await flushPromises()
    return container
  }

  it('has 63 Vietnam provinces in static JSON', () => {
    expect(provinces).toHaveLength(63)
  })

  it('fetches GET /users/me and updates profile via PUT /users/me', async () => {
    const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValue({
      status: 200,
      data: {
        code: 1000,
        success: true,
        data: {
          customerId: 'C-001',
          fullName: 'Nguyen Van A',
          email: 'admin@example.com',
          phone: '0901234567',
          dateOfBirth: '1995-05-20',
          address: '123 Le Loi',
          provinceResponse: { code: '79', name: 'Thành phố Hồ Chí Minh' },
          role: 'ADMIN',
          status: 'ACTIVE',
        },
      },
    })

    const putSpy = vi.spyOn(apiClient, 'put').mockResolvedValue({
      status: 200,
      data: {
        code: 1000,
        success: true,
        data: {
          customerId: 'C-001',
          fullName: 'Nguyen Van B',
          email: 'admin@example.com',
          dateOfBirth: '1995-05-20',
          address: '456 Nguyen Hue',
          provinceResponse: { code: '79', name: 'Thành phố Hồ Chí Minh' },
        },
      },
    })

    const el = await renderProfile()
    expect(getSpy).toHaveBeenCalledWith('/users/me')
    expect(el.textContent).toContain('admin@example.com')

    const fullNameInput = el.querySelector<HTMLInputElement>('input[id="fullName"]')
    const addressInput = el.querySelector<HTMLTextAreaElement>('textarea[id="address"]')
    expect(fullNameInput?.value).toBe('Nguyen Van A')
    expect(addressInput?.value).toBe('123 Le Loi')

    await setInputValue(fullNameInput!, 'Nguyen Van B')
    await setInputValue(addressInput!, '456 Nguyen Hue')

    const forms = el.querySelectorAll('form')
    await act(async () => {
      forms[0].dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    })
    await flushPromises()

    expect(putSpy).toHaveBeenCalledWith('/users/me', {
      fullName: 'Nguyen Van B',
      dateOfBirth: '1995-05-20',
      address: '456 Nguyen Hue',
      provinceCode: '79',
    })
    expect(el.textContent).toContain('Cập nhật thông tin hồ sơ thành công.')
    expect(useAuthStore.getState().user?.fullName).toBe('Nguyen Van B')
  })

  it('validates and submits change password via PUT /users/me/password', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValue({
      status: 200,
      data: {
        code: 1000,
        success: true,
        data: { customerId: 'C-001', fullName: 'Nguyen Van A', role: 'ADMIN' },
      },
    })
    const putSpy = vi.spyOn(apiClient, 'put').mockResolvedValue({
      status: 200,
      data: { code: 1000, success: true },
    })

    const el = await renderProfile()
    const oldPw = el.querySelector<HTMLInputElement>('input[id="oldPassword"]')
    const newPw = el.querySelector<HTMLInputElement>('input[id="password"]')
    const confirmPw = el.querySelector<HTMLInputElement>('input[id="confirmPassword"]')
    const forms = el.querySelectorAll('form')

    await setInputValue(oldPw!, 'OldPass123!')
    await setInputValue(newPw!, 'NewPass123!')
    await setInputValue(confirmPw!, 'Mismatch!')

    await act(async () => {
      forms[1].dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    })
    await flushPromises()

    expect(el.textContent).toContain('Mật khẩu xác nhận không khớp')
    expect(putSpy).not.toHaveBeenCalled()

    await setInputValue(confirmPw!, 'NewPass123!')
    await act(async () => {
      forms[1].dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    })
    await flushPromises()

    expect(putSpy).toHaveBeenCalledWith('/users/me/password', {
      oldPassword: 'OldPass123!',
      password: 'NewPass123!',
      confirmPassword: 'NewPass123!',
    })
    expect(el.textContent).toContain('Đổi mật khẩu thành công.')
  })

  it('logs out from all devices via POST /auth/logout-all, clears session, and redirects to /login', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValue({
      status: 200,
      data: {
        code: 1000,
        success: true,
        data: { customerId: 'C-001', fullName: 'Nguyen Van A', role: 'ADMIN' },
      },
    })
    const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValue({
      status: 200,
      data: { code: 1000, success: true },
    })

    const el = await renderProfile()
    const buttons = Array.from(el.querySelectorAll('button'))
    const logoutAllBtn = buttons.find((b) =>
      b.textContent?.includes('Đăng xuất khỏi tất cả thiết bị'),
    )
    expect(logoutAllBtn).toBeDefined()

    await act(async () => {
      logoutAllBtn!.click()
    })
    await flushPromises()

    expect(postSpy).toHaveBeenCalledWith('/auth/logout-all')
    expect(useAuthStore.getState().accessToken).toBeNull()
    expect(useAuthStore.getState().refreshToken).toBeNull()
    expect(el.textContent).toContain('Đăng nhập Quản trị')
  })
})
