import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { apiClient } from '@/api/client'
import type { UserRole } from '@/api/types'
import { useAuthStore } from '@/stores/authStore'
import { WalletDetailPage } from './WalletDetailPage'

async function flushPromises() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
}

function setTextAreaValue(textarea: HTMLTextAreaElement, value: string) {
  const descriptor = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')
  descriptor?.set?.call(textarea, value)
  textarea.dispatchEvent(new Event('input', { bubbles: true }))
  textarea.dispatchEvent(new Event('change', { bubbles: true }))
}

const MOCK_WALLET_DETAIL = {
  uid: 'wallet-001',
  walletNumber: '88880001',
  walletName: 'Ví thanh toán chính',
  walletType: 'CHECKING',
  currency: 'VND',
  balance: 10000000,
  availableBalance: 9000000,
  blockedBalance: 1000000,
  overdraftLimit: 500000,
  minimumBalance: 50000,
  singleTransactionLimit: 20000000,
  dailyLimit: 50000000,
  monthlyLimit: 200000000,
  status: 'ACTIVE',
  branchCode: 'HCM-01',
  branchName: 'Chi nhánh TP.HCM',
  version: 7,
  openedAt: '2026-01-01T00:00:00Z',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-11-17T10:00:00Z',
  userUid: 'user-123',
  userFullName: 'Nguyen Van A',
  userPhone: '0901234567',
  userEmail: 'a@example.com',
}

describe('WalletDetailPage', () => {
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

  async function renderWalletDetail(currentRole: UserRole) {
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
          <MemoryRouter initialEntries={['/wallets/wallet-001']}>
            <Routes>
              <Route path="/wallets/:walletUid" element={<WalletDetailPage />} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>,
      )
    })
    await flushPromises()
    return container
  }

  it('renders wallet balances, limits, branch, version, and owner details', async () => {
    const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValue({
      status: 200,
      data: { code: 1000, success: true, data: MOCK_WALLET_DETAIL },
    })

    const el = await renderWalletDetail('ADMIN')

    expect(getSpy).toHaveBeenCalledWith('/admin/wallets/wallet-001')
    expect(el.textContent).toContain('88880001')
    expect(el.textContent).toContain('10.000.000')
    expect(el.textContent).toContain('9.000.000')
    expect(el.textContent).toContain('1.000.000')
    expect(el.textContent).toContain('500.000')
    expect(el.textContent).toContain('50.000')
    expect(el.textContent).toContain('20.000.000')
    expect(el.textContent).toContain('50.000.000')
    expect(el.textContent).toContain('200.000.000')
    expect(el.textContent).toContain('HCM-01')
    expect(el.textContent).toContain('Chi nhánh TP.HCM')
    expect(el.textContent).toContain('7')
    expect(el.textContent).toContain('Nguyen Van A')
    expect(el.textContent).toContain('0901234567')
    expect(el.textContent).toContain('a@example.com')
  })

  it('validates required reason in freeze modal and calls PATCH /admin/wallets/{walletUid}/freeze for ADMIN', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValue({
      status: 200,
      data: { code: 1000, success: true, data: MOCK_WALLET_DETAIL },
    })
    const patchSpy = vi.spyOn(apiClient, 'patch').mockResolvedValue({
      status: 200,
      data: {
        code: 1000,
        success: true,
        data: { ...MOCK_WALLET_DETAIL, status: 'FROZEN' },
      },
    })

    const el = await renderWalletDetail('ADMIN')

    const freezeBtn = Array.from(el.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Đóng băng ví'),
    )
    expect(freezeBtn).toBeDefined()

    await act(async () => {
      freezeBtn!.click()
    })
    await flushPromises()

    const confirmBtn = Array.from(document.querySelectorAll('.ant-modal button')).find((b) =>
      b.textContent?.includes('Xác nhận đóng băng'),
    ) as HTMLButtonElement | undefined
    expect(confirmBtn).toBeDefined()

    // Submit empty reason -> should fail validation and not call PATCH
    await act(async () => {
      confirmBtn!.click()
    })
    await flushPromises()
    expect(patchSpy).not.toHaveBeenCalled()
    expect(document.body.textContent).toContain('Vui lòng nhập lý do')

    // Enter valid reason and submit
    const textarea = document.querySelector<HTMLTextAreaElement>('.ant-modal textarea')
    expect(textarea).not.toBeNull()
    await act(async () => {
      setTextAreaValue(textarea!, 'Nghi ngờ giao dịch bất thường')
    })
    await act(async () => {
      confirmBtn!.click()
    })
    await flushPromises()

    expect(patchSpy).toHaveBeenCalledWith('/admin/wallets/wallet-001/freeze', {
      reason: 'Nghi ngờ giao dịch bất thường',
    })
  })

  it('allows MANAGER to unfreeze a frozen wallet via PATCH /admin/wallets/{walletUid}/unfreeze', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValue({
      status: 200,
      data: {
        code: 1000,
        success: true,
        data: { ...MOCK_WALLET_DETAIL, status: 'FROZEN' },
      },
    })
    const patchSpy = vi.spyOn(apiClient, 'patch').mockResolvedValue({
      status: 200,
      data: { code: 1000, success: true, data: MOCK_WALLET_DETAIL },
    })

    const el = await renderWalletDetail('MANAGER')

    const unfreezeBtn = Array.from(el.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Mở đóng băng ví'),
    )
    expect(unfreezeBtn).toBeDefined()

    await act(async () => {
      unfreezeBtn!.click()
    })
    await flushPromises()

    const textarea = document.querySelector<HTMLTextAreaElement>('.ant-modal textarea')
    expect(textarea).not.toBeNull()
    await act(async () => {
      setTextAreaValue(textarea!, 'Đã xác minh chủ ví')
    })

    const confirmBtn = Array.from(document.querySelectorAll('.ant-modal button')).find((b) =>
      b.textContent?.includes('Xác nhận mở đóng băng'),
    ) as HTMLButtonElement | undefined
    expect(confirmBtn).toBeDefined()

    await act(async () => {
      confirmBtn!.click()
    })
    await flushPromises()

    expect(patchSpy).toHaveBeenCalledWith('/admin/wallets/wallet-001/unfreeze', {
      reason: 'Đã xác minh chủ ví',
    })
  })

  it('hides freeze and unfreeze buttons for STAFF', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValue({
      status: 200,
      data: { code: 1000, success: true, data: MOCK_WALLET_DETAIL },
    })

    const el = await renderWalletDetail('STAFF')

    expect(el.textContent).not.toContain('Đóng băng ví')
    expect(el.textContent).not.toContain('Mở đóng băng ví')
  })
})
