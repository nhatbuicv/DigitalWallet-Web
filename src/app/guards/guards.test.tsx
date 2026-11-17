import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { AppRoutes } from '@/App'
import { useAuthStore } from '@/stores/authStore'

describe('RBAC route guards and router', () => {
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

  afterEach(async () => {
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

  async function renderRoute(initialEntry: string) {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)

    await act(async () => {
      root?.render(
        <MemoryRouter initialEntries={[initialEntry]}>
          <AppRoutes />
        </MemoryRouter>,
      )
    })

    return container
  }

  it('redirects unauthenticated users to /login', async () => {
    const el = await renderRoute('/')
    expect(el.textContent).toContain('Đăng nhập')
  })

  it('blocks USER role with 403 Forbidden', async () => {
    useAuthStore.getState().setSession({
      accessToken: 'token-user',
      refreshToken: 'refresh-user',
      user: { customerId: 'u-1', fullName: 'End User', role: 'USER' },
    })

    const el = await renderRoute('/')
    expect(el.textContent).toContain('403')
    expect(el.textContent).toContain('Bạn không có quyền truy cập trang này.')
  })

  it('allows STAFF on / and hides Nhật ký kiểm toán in sidebar', async () => {
    useAuthStore.getState().setSession({
      accessToken: 'token-staff',
      refreshToken: 'refresh-staff',
      user: { customerId: 's-1', fullName: 'Staff Member', role: 'STAFF' },
    })

    const el = await renderRoute('/')
    expect(el.textContent).toContain('Tổng quan')
    expect(el.textContent).not.toContain('Nhật ký kiểm toán')
  })

  it('blocks STAFF from /audit-logs with 403 Forbidden', async () => {
    useAuthStore.getState().setSession({
      accessToken: 'token-staff',
      refreshToken: 'refresh-staff',
      user: { customerId: 's-1', fullName: 'Staff Member', role: 'STAFF' },
    })

    const el = await renderRoute('/audit-logs')
    expect(el.textContent).toContain('403')
    expect(el.textContent).toContain('Bạn không có quyền truy cập trang này.')
  })

  it('allows ADMIN and MANAGER to access /audit-logs and see the menu item', async () => {
    useAuthStore.getState().setSession({
      accessToken: 'token-manager',
      refreshToken: 'refresh-manager',
      user: { customerId: 'm-1', fullName: 'Manager', role: 'MANAGER' },
    })

    const el = await renderRoute('/audit-logs')
    expect(el.textContent).toContain('Nhật ký kiểm toán')
    expect(el.textContent).not.toContain('403')
  })
})
