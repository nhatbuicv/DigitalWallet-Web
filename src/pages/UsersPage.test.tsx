import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { apiClient } from '@/api/client'
import { AppError } from '@/api/errorHandler'
import { UsersPage } from './UsersPage'

async function flushPromises() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
}

function setNativeInputValue(input: HTMLInputElement, value: string) {
  const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')
  descriptor?.set?.call(input, value)
  input.dispatchEvent(new Event('input', { bubbles: true }))
  input.dispatchEvent(new Event('change', { bubbles: true }))
}

describe('UsersPage', () => {
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
    if (root) {
      await act(async () => {
        root?.unmount()
      })
      root = null
    }
    container?.remove()
    container = null
  })

  async function renderUsersPage(initialUrl = '/users') {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)

    await act(async () => {
      root?.render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={[initialUrl]}>
            <Routes>
              <Route path="/users" element={<UsersPage />} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>,
      )
    })
    await flushPromises()
    return container
  }

  it('fetches GET /admin/users with table params and renders user list', async () => {
    const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValue({
      status: 200,
      data: {
        code: 1000,
        success: true,
        data: {
          currentPage: 0,
          pageSize: 20,
          totalElements: 1,
          totalPage: 1,
          data: [
            {
              uid: 'user-123',
              fullName: 'Nguyen Van A',
              email: 'a@example.com',
              phone: '0901234567',
              role: 'USER',
              status: 'ACTIVE',
              totalWallets: 2,
              totalBalance: 1500000,
              lastLogin: '2026-11-17T10:00:00Z',
            },
          ],
        },
      },
    })

    const el = await renderUsersPage('/users?page=1&size=10')

    expect(getSpy).toHaveBeenCalledWith('/admin/users', {
      params: { page: 1, size: 10 },
    })
    expect(el.textContent).toContain('Nguyen Van A')
    expect(el.textContent).toContain('a@example.com')
    expect(el.textContent).toContain('0901234567')
    expect(el.textContent).toContain('Hoạt động')
    expect(el.textContent).toContain('USER')
    expect(el.textContent).toContain('1.500.000')
    expect(el.querySelector('a[href="/users/user-123"]')).not.toBeNull()
  })

  it('submits filter inputs and queries GET /admin/users with filters and page 0', async () => {
    const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValue({
      status: 200,
      data: {
        code: 1000,
        success: true,
        data: { currentPage: 0, pageSize: 20, totalElements: 0, data: [] },
      },
    })

    const el = await renderUsersPage('/users?page=2&size=20')

    const fullNameInput = el.querySelector<HTMLInputElement>('input[placeholder="Nhập họ tên"]')
    const emailInput = el.querySelector<HTMLInputElement>('input[placeholder="Nhập email"]')
    const phoneInput = el.querySelector<HTMLInputElement>('input[placeholder="Nhập SĐT"]')
    const submitBtn = Array.from(el.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Tìm kiếm'),
    )

    expect(fullNameInput).not.toBeNull()
    expect(emailInput).not.toBeNull()
    expect(phoneInput).not.toBeNull()
    expect(submitBtn).not.toBeNull()

    await act(async () => {
      setNativeInputValue(fullNameInput!, 'Tran B')
      setNativeInputValue(emailInput!, 'b@example.com')
      setNativeInputValue(phoneInput!, '0988777666')
    })

    await act(async () => {
      submitBtn!.click()
    })
    await flushPromises()

    expect(getSpy).toHaveBeenLastCalledWith('/admin/users', {
      params: {
        page: 0,
        size: 20,
        fullName: 'Tran B',
        email: 'b@example.com',
        phone: '0988777666',
      },
    })
  })

  it('displays error alert when GET /admin/users fails', async () => {
    vi.spyOn(apiClient, 'get').mockRejectedValue(
      new AppError({ kind: 'server', message: 'Lỗi máy chủ' }),
    )

    const el = await renderUsersPage()

    expect(el.textContent).toContain('Không thể tải danh sách người dùng')
    expect(el.textContent).toContain('Lỗi máy chủ')
  })
})
