import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { apiClient } from '@/api/client'
import { AppError } from '@/api/errorHandler'
import { WalletsPage } from './WalletsPage'

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

describe('WalletsPage', () => {
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

  async function renderWalletsPage(initialUrl = '/wallets') {
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
              <Route path="/wallets" element={<WalletsPage />} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>,
      )
    })
    await flushPromises()
    return container
  }

  it('fetches GET /admin/wallets with table params and renders wallet list', async () => {
    const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValue({
      status: 200,
      data: {
        code: 1000,
        success: true,
        data: {
          currentPage: 1,
          pageSize: 10,
          totalElements: 1,
          totalPage: 1,
          data: [
            {
              uid: 'wallet-001',
              walletNumber: '88880001',
              walletName: 'Ví chính',
              walletType: 'CHECKING',
              currency: 'VND',
              balance: 5000000,
              availableBalance: 4500000,
              status: 'ACTIVE',
              userUid: 'user-123',
              userFullName: 'Nguyen Van A',
              userPhone: '0901234567',
              createdAt: '2026-11-17T08:00:00Z',
            },
          ],
        },
      },
    })

    const el = await renderWalletsPage('/wallets?page=1&size=10')

    expect(getSpy).toHaveBeenCalledWith('/admin/wallets', {
      params: { page: 1, size: 10 },
    })
    expect(el.textContent).toContain('88880001')
    expect(el.textContent).toContain('Ví chính')
    expect(el.textContent).toContain('CHECKING')
    expect(el.textContent).toContain('Nguyen Van A')
    expect(el.textContent).toContain('5.000.000')
    expect(el.textContent).toContain('4.500.000')
    expect(el.textContent).toContain('Hoạt động')
    expect(el.querySelector('a[href="/wallets/wallet-001"]')).not.toBeNull()
    expect(el.querySelector('a[href="/users/user-123"]')).not.toBeNull()
  })

  it('submits filter inputs and queries GET /admin/wallets with filters and page 0', async () => {
    const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValue({
      status: 200,
      data: {
        code: 1000,
        success: true,
        data: { currentPage: 0, pageSize: 20, totalElements: 0, data: [] },
      },
    })

    const el = await renderWalletsPage('/wallets?page=2&size=20')

    const walletNumberInput = el.querySelector<HTMLInputElement>('input[placeholder="Nhập số ví"]')
    const userNameInput = el.querySelector<HTMLInputElement>('input[placeholder="Nhập tên chủ ví"]')
    const userPhoneInput = el.querySelector<HTMLInputElement>('input[placeholder="Nhập SĐT"]')
    const userEmailInput = el.querySelector<HTMLInputElement>('input[placeholder="Nhập email"]')
    const submitBtn = Array.from(el.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Tìm kiếm'),
    )

    expect(walletNumberInput).not.toBeNull()
    expect(userNameInput).not.toBeNull()
    expect(userPhoneInput).not.toBeNull()
    expect(userEmailInput).not.toBeNull()
    expect(submitBtn).not.toBeNull()

    await act(async () => {
      setNativeInputValue(walletNumberInput!, '88880001')
      setNativeInputValue(userNameInput!, 'Nguyen Van A')
      setNativeInputValue(userPhoneInput!, '0901234567')
      setNativeInputValue(userEmailInput!, 'a@example.com')
    })

    await act(async () => {
      submitBtn!.click()
    })
    await flushPromises()

    expect(getSpy).toHaveBeenLastCalledWith('/admin/wallets', {
      params: {
        page: 0,
        size: 20,
        walletNumber: '88880001',
        userName: 'Nguyen Van A',
        userPhone: '0901234567',
        userEmail: 'a@example.com',
      },
    })
  })

  it('displays error alert when GET /admin/wallets fails', async () => {
    vi.spyOn(apiClient, 'get').mockRejectedValue(
      new AppError({ kind: 'server', message: 'Lỗi hệ thống' }),
    )

    const el = await renderWalletsPage()

    expect(el.textContent).toContain('Không thể tải danh sách ví')
    expect(el.textContent).toContain('Lỗi hệ thống')
  })
})
