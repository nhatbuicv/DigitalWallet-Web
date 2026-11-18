import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { apiClient } from '@/api/client'
import { AppError } from '@/api/errorHandler'
import { AuditLogsPage } from './AuditLogsPage'

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

describe('AuditLogsPage', () => {
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

  async function renderAuditLogsPage(initialUrl = '/audit-logs') {
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
              <Route path="/audit-logs" element={<AuditLogsPage />} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>,
      )
    })
    await flushPromises()
    return container
  }

  it('fetches GET /admin/audit-logs with default sort=createdAt,desc and renders logs', async () => {
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
              uid: 'audit-001',
              actorUid: 'admin-1',
              actorName: 'Admin One',
              action: 'WALLET_FREEZE',
              targetType: 'WALLET',
              targetUid: 'wallet-99',
              targetIdentifier: '88880099',
              detail: 'Đóng băng ví do nghi ngờ gian lận',
              createdAt: '2026-11-18T07:30:00Z',
            },
          ],
        },
      },
    })

    const el = await renderAuditLogsPage()

    expect(getSpy).toHaveBeenCalledWith('/admin/audit-logs', {
      params: { page: 0, size: 20, sort: 'createdAt,desc' },
    })
    expect(el.textContent).toContain('Admin One')
    expect(el.textContent).toContain('Đóng băng ví')
    expect(el.textContent).toContain('Ví điện tử')
    expect(el.textContent).toContain('88880099')
    expect(el.textContent).toContain('Đóng băng ví do nghi ngờ gian lận')
  })

  it('submits actorUid and targetUid filters and queries GET /admin/audit-logs with page 0', async () => {
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

    const el = await renderAuditLogsPage('/audit-logs?page=2&size=20')

    const actorInput = el.querySelector(
      'input[placeholder="Nhập UID người thực hiện"]',
    ) as HTMLInputElement
    const targetInput = el.querySelector(
      'input[placeholder="Nhập UID đối tượng"]',
    ) as HTMLInputElement
    expect(actorInput).not.toBeNull()
    expect(targetInput).not.toBeNull()

    await act(async () => {
      setNativeInputValue(actorInput, 'actor-123')
      setNativeInputValue(targetInput, 'target-456')
    })

    const submitButton = el.querySelector('button[type="submit"]') as HTMLButtonElement
    expect(submitButton).not.toBeNull()

    await act(async () => {
      submitButton.click()
    })
    await flushPromises()

    expect(getSpy).toHaveBeenLastCalledWith('/admin/audit-logs', {
      params: {
        page: 0,
        size: 20,
        sort: 'createdAt,desc',
        actorUid: 'actor-123',
        targetUid: 'target-456',
      },
    })
  })

  it('displays error alert when GET /admin/audit-logs fails', async () => {
    vi.spyOn(apiClient, 'get').mockRejectedValue(
      new AppError({ kind: 'server', message: 'Lỗi máy chủ', status: 500 }),
    )

    const el = await renderAuditLogsPage()

    expect(el.textContent).toContain('Không thể tải nhật ký kiểm toán')
    expect(el.textContent).toContain('Lỗi máy chủ')
  })
})
