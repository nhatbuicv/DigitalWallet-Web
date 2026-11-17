import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { apiClient } from '@/api/client'
import type { UserRole } from '@/api/types'
import { useAuthStore } from '@/stores/authStore'
import { UserDetailPage } from './UserDetailPage'

async function flushPromises() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
}

const MOCK_USER_DETAIL = {
  uid: 'user-123',
  fullName: 'Nguyen Van A',
  email: 'a@example.com',
  phone: '0901234567',
  citizenId: '079090001234',
  dateOfBirth: '1995-05-20',
  address: '123 Le Loi, Q1, TP.HCM',
  status: 'ACTIVE',
  role: 'USER',
  phoneVerified: true,
  walletNonLocked: true,
  failedLoginAttempts: 2,
  lockTime: '2026-11-16T08:00:00Z',
  lastLogin: '2026-11-17T10:30:00Z',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-11-17T10:30:00Z',
  totalWallets: 3,
  totalBalance: 2500000,
}

describe('UserDetailPage', () => {
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
    vi.restoreAllMocks()
    useAuthStore.getState().clearSession()
    if (root) {
      await act(async () => {
        root?.unmount()
      })
      root = null
    }
    container?.remove()
    container = null
  })

  async function renderUserDetail(currentRole: UserRole) {
    useAuthStore.getState().setSession({
      accessToken: 'fake-token',
      user: { customerId: 'admin-1', fullName: 'Admin', role: currentRole },
    })

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)

    await act(async () => {
      root?.render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={['/users/user-123']}>
            <Routes>
              <Route path="/users/:uid" element={<UserDetailPage />} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>,
      )
    })
    await flushPromises()
    return container
  }

  it('renders user detail with KYC, wallets, balance, and security fields', async () => {
    const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValue({
      status: 200,
      data: { code: 1000, success: true, data: MOCK_USER_DETAIL },
    })

    const el = await renderUserDetail('ADMIN')

    expect(getSpy).toHaveBeenCalledWith('/admin/users/user-123')
    expect(el.textContent).toContain('Nguyen Van A')
    expect(el.textContent).toContain('079090001234')
    expect(el.textContent).toContain('20/05/1995')
    expect(el.textContent).toContain('123 Le Loi, Q1, TP.HCM')
    expect(el.textContent).toContain('3')
    expect(el.textContent).toContain('2.500.000')
    expect(el.textContent).toContain('2')
    expect(el.textContent).toContain('16/11/2026')
    expect(el.textContent).toContain('17/11/2026')
  })

  it('shows both status and role actions for ADMIN and calls PATCH endpoints', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValue({
      status: 200,
      data: { code: 1000, success: true, data: MOCK_USER_DETAIL },
    })
    const patchSpy = vi.spyOn(apiClient, 'patch').mockResolvedValue({
      status: 200,
      data: { code: 1000, success: true },
    })

    const el = await renderUserDetail('ADMIN')

    expect(el.textContent).toContain('Đổi trạng thái tài khoản')
    expect(el.textContent).toContain('Đổi vai trò tài khoản')

    // Open status select and choose LOCKED
    const statusSelect = el.querySelector<HTMLElement>('[aria-label="Chọn trạng thái"]')
    expect(statusSelect).not.toBeNull()
    await act(async () => {
      statusSelect!.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    })
    await flushPromises()

    const lockedOption = Array.from(document.querySelectorAll('.ant-select-item-option')).find(
      (opt) => opt.textContent?.includes('LOCKED'),
    ) as HTMLElement | undefined
    expect(lockedOption).toBeDefined()

    await act(async () => {
      lockedOption!.click()
    })

    const updateStatusBtn = Array.from(el.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Cập nhật trạng thái'),
    )
    expect(updateStatusBtn).toBeDefined()
    await act(async () => {
      updateStatusBtn!.click()
    })
    await flushPromises()

    expect(patchSpy).toHaveBeenCalledWith('/admin/users/user-123/status', null, {
      params: { status: 'LOCKED' },
    })

    // Open role select and choose STAFF
    const roleSelect = el.querySelector<HTMLElement>('[aria-label="Chọn vai trò"]')
    expect(roleSelect).not.toBeNull()
    await act(async () => {
      roleSelect!.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    })
    await flushPromises()

    const staffOption = Array.from(document.querySelectorAll('.ant-select-item-option')).find(
      (opt) => opt.textContent?.trim() === 'STAFF',
    ) as HTMLElement | undefined
    expect(staffOption).toBeDefined()

    await act(async () => {
      staffOption!.click()
    })

    const updateRoleBtn = Array.from(el.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Cập nhật vai trò'),
    )
    expect(updateRoleBtn).toBeDefined()
    await act(async () => {
      updateRoleBtn!.click()
    })
    await flushPromises()

    expect(patchSpy).toHaveBeenCalledWith('/admin/users/user-123/role', null, {
      params: { role: 'STAFF' },
    })
  })

  it('shows only status action for MANAGER and hides role action', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValue({
      status: 200,
      data: { code: 1000, success: true, data: MOCK_USER_DETAIL },
    })

    const el = await renderUserDetail('MANAGER')

    expect(el.textContent).toContain('Đổi trạng thái tài khoản')
    expect(el.textContent).not.toContain('Đổi vai trò tài khoản')
  })

  it('hides both status and role actions for STAFF', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValue({
      status: 200,
      data: { code: 1000, success: true, data: MOCK_USER_DETAIL },
    })

    const el = await renderUserDetail('STAFF')

    expect(el.textContent).not.toContain('Đổi trạng thái tài khoản')
    expect(el.textContent).not.toContain('Đổi vai trò tài khoản')
    expect(el.textContent).not.toContain('Quản trị trạng thái & phân quyền')
  })
})
