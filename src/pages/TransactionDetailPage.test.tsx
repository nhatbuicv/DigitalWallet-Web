import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { apiClient } from '@/api/client'
import { AppError } from '@/api/errorHandler'
import { TransactionDetailPage } from './TransactionDetailPage'

async function flushPromises() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
}

const MOCK_TX_DETAIL = {
  id: 'tx-001',
  referenceCode: 'TXN-20261117-001',
  idempotencyKey: 'idem-key-123456',
  type: 'TRANSFER',
  status: 'SUCCESS',
  currency: 'VND',
  amount: 2000000,
  description: 'Chuyển khoản thanh toán',
  fromWalletId: 'wallet-1',
  fromWalletNumber: '88880001',
  fromOwnerName: 'Nguyen Van A',
  toWalletId: 'wallet-2',
  toWalletNumber: '88880002',
  toOwnerName: 'Tran Thi B',
  createdAt: '2026-11-17T08:00:00Z',
  completedAt: '2026-11-17T08:00:02Z',
  ledgerEntries: [
    {
      id: 'le-1',
      walletId: 'wallet-1',
      walletNumber: '88880001',
      entryType: 'DEBIT',
      amount: 2000000,
      balanceBefore: 5000000,
      balanceAfter: 3000000,
      createdAt: '2026-11-17T08:00:01Z',
    },
    {
      id: 'le-2',
      walletId: 'wallet-2',
      walletNumber: '88880002',
      entryType: 'CREDIT',
      amount: 2000000,
      balanceBefore: 1000000,
      balanceAfter: 3000000,
      createdAt: '2026-11-17T08:00:01Z',
    },
  ],
}

describe('TransactionDetailPage', () => {
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

  async function renderTransactionDetail(id = 'tx-001') {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)

    await act(async () => {
      root?.render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={[`/transactions/${id}`]}>
            <Routes>
              <Route path="/transactions/:id" element={<TransactionDetailPage />} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>,
      )
    })
    await flushPromises()
    return container
  }

  it('fetches GET /admin/transactions/{id} and renders transaction info and double-entry ledger', async () => {
    const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValue({
      status: 200,
      data: {
        code: 1000,
        success: true,
        data: MOCK_TX_DETAIL,
      },
    })

    const el = await renderTransactionDetail('tx-001')

    expect(getSpy).toHaveBeenCalledWith('/admin/transactions/tx-001')
    expect(el.textContent).toContain('TXN-20261117-001')
    expect(el.textContent).toContain('idem-key-123456')
    expect(el.textContent).toContain('88880001')
    expect(el.textContent).toContain('Nguyen Van A')
    expect(el.textContent).toContain('88880002')
    expect(el.textContent).toContain('Tran Thi B')
    expect(el.textContent).toContain('Chuyển khoản thanh toán')
    expect(el.textContent).toContain('Sổ cái kép (Double-Entry Ledger)')
    expect(el.textContent).toContain('Ghi nợ (DEBIT)')
    expect(el.textContent).toContain('Ghi có (CREDIT)')
  })

  it('renders error alert when GET /admin/transactions/{id} fails', async () => {
    vi.spyOn(apiClient, 'get').mockRejectedValue(
      new AppError({ kind: 'unknown', message: 'Không tìm thấy giao dịch', status: 404 }),
    )

    const el = await renderTransactionDetail('tx-404')

    expect(el.textContent).toContain('Không thể tải thông tin giao dịch')
    expect(el.textContent).toContain('Không tìm thấy giao dịch')
  })
})
