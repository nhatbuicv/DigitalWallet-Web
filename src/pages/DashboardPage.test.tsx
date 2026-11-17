import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { apiClient } from '@/api/client'
import { AppError } from '@/api/errorHandler'
import { DashboardPage } from './DashboardPage'

async function flushPromises() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
}

describe('DashboardPage', () => {
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

  async function renderDashboard() {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)

    await act(async () => {
      root?.render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={['/dashboard']}>
            <DashboardPage />
          </MemoryRouter>
        </QueryClientProvider>,
      )
    })
    await flushPromises()
    return container
  }

  it('fetches total users, wallets, and 5 recent transactions and renders stats & table', async () => {
    const getSpy = vi.spyOn(apiClient, 'get').mockImplementation(async (url) => {
      if (url === '/admin/users') {
        return {
          status: 200,
          data: { code: 1000, success: true, data: { totalElements: 128, data: [] } },
        }
      }
      if (url === '/admin/wallets') {
        return {
          status: 200,
          data: { code: 1000, success: true, data: { totalElements: 256, data: [] } },
        }
      }
      if (url === '/admin/transactions') {
        return {
          status: 200,
          data: {
            code: 1000,
            success: true,
            data: {
              totalElements: 1024,
              data: [
                {
                  id: 'tx-1',
                  referenceCode: 'TX-2026-001',
                  type: 'TRANSFER',
                  status: 'SUCCESS',
                  currency: 'VND',
                  amount: 500000,
                  fromWalletNumber: '10000001',
                  fromOwnerName: 'Nguyen Van A',
                  toWalletNumber: '10000002',
                  toOwnerName: 'Tran Thi B',
                  createdAt: '2026-11-17T10:15:30Z',
                },
              ],
            },
          },
        }
      }
      throw new Error(`Unexpected URL: ${url}`)
    })

    const el = await renderDashboard()

    expect(getSpy).toHaveBeenCalledWith('/admin/users', { params: { page: 0, size: 1 } })
    expect(getSpy).toHaveBeenCalledWith('/admin/wallets', { params: { page: 0, size: 1 } })
    expect(getSpy).toHaveBeenCalledWith('/admin/transactions', {
      params: { page: 0, size: 5, sort: 'createdAt,desc' },
    })

    expect(el.textContent).toContain('Tổng người dùng')
    expect(el.textContent).toContain('128')
    expect(el.textContent).toContain('Tổng ví điện tử')
    expect(el.textContent).toContain('256')
    expect(el.textContent).toContain('Tổng giao dịch')
    expect(el.textContent).toContain('1,024')

    expect(el.textContent).toContain('TX-2026-001')
    expect(el.textContent).toContain('Chuyển tiền')
    expect(el.textContent).toContain('Thành công')
    expect(el.textContent).toContain('500.000')
    expect(el.textContent).toContain('10000001 (Nguyen Van A)')
    expect(el.textContent).toContain('10000002 (Tran Thi B)')
  })

  it('displays normalized error alert when API fails', async () => {
    vi.spyOn(apiClient, 'get').mockRejectedValue(
      new AppError({ kind: 'server', message: 'Máy chủ gặp sự cố, vui lòng thử lại sau.' }),
    )

    const el = await renderDashboard()

    expect(el.textContent).toContain('Không thể tải dữ liệu tổng quan')
    expect(el.textContent).toContain('Máy chủ gặp sự cố, vui lòng thử lại sau.')
  })
})
