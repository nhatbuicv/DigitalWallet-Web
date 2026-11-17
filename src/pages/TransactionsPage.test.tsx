import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { apiClient } from '@/api/client'
import { AppError } from '@/api/errorHandler'
import { TransactionsPage } from './TransactionsPage'

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

describe('TransactionsPage', () => {
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

  async function renderTransactionsPage(initialUrl = '/transactions') {
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
              <Route path="/transactions" element={<TransactionsPage />} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>,
      )
    })
    await flushPromises()
    return container
  }

  it('fetches GET /admin/transactions with default sort=createdAt,desc and renders list', async () => {
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
              id: 'tx-001',
              referenceCode: 'TXN-20261117-001',
              type: 'TRANSFER',
              status: 'SUCCESS',
              currency: 'VND',
              amount: 1500000,
              fromWalletId: 'wallet-1',
              fromWalletNumber: '88880001',
              fromOwnerName: 'Nguyen Van A',
              toWalletId: 'wallet-2',
              toWalletNumber: '88880002',
              toOwnerName: 'Tran Thi B',
              createdAt: '2026-11-17T08:00:00Z',
            },
          ],
        },
      },
    })

    const el = await renderTransactionsPage()

    expect(getSpy).toHaveBeenCalledWith('/admin/transactions', {
      params: { page: 0, size: 20, sort: 'createdAt,desc' },
    })
    expect(el.textContent).toContain('TXN-20261117-001')
    expect(el.textContent).toContain('88880001')
    expect(el.textContent).toContain('Nguyen Van A')
    expect(el.textContent).toContain('88880002')
    expect(el.textContent).toContain('Tran Thi B')
    expect(el.textContent).toContain('Chuyển tiền')
    expect(el.textContent).toContain('Thành công')
  })

  it('submits reference filter and queries GET /admin/transactions with page 0', async () => {
    const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValue({
      status: 200,
      data: {
        code: 1000,
        success: true,
        data: {
          currentPage: 0,
          pageSize: 20,
          totalElements: 0,
          totalPage: 0,
          data: [],
        },
      },
    })

    const el = await renderTransactionsPage('/transactions?page=2&size=20')

    const refInput = el.querySelector('input[placeholder="Nhập mã tham chiếu"]') as HTMLInputElement
    expect(refInput).not.toBeNull()

    await act(async () => {
      setNativeInputValue(refInput, 'TXN-999')
    })

    const submitButton = el.querySelector('button[type="submit"]') as HTMLButtonElement
    expect(submitButton).not.toBeNull()

    await act(async () => {
      submitButton.click()
    })
    await flushPromises()

    expect(getSpy).toHaveBeenLastCalledWith('/admin/transactions', {
      params: {
        page: 0,
        size: 20,
        sort: 'createdAt,desc',
        reference: 'TXN-999',
      },
    })
  })

  it('displays error alert when GET /admin/transactions fails', async () => {
    vi.spyOn(apiClient, 'get').mockRejectedValue(
      new AppError({ kind: 'server', message: 'Lỗi máy chủ', status: 500 }),
    )

    const el = await renderTransactionsPage()

    expect(el.textContent).toContain('Không thể tải danh sách giao dịch')
    expect(el.textContent).toContain('Lỗi máy chủ')
  })
})
