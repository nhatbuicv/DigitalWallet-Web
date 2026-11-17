import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { AppRoutes } from '@/App'
import { apiClient } from '@/api/client'
import { AppError } from '@/api/errorHandler'

async function flushPromises() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
}

async function setInputValue(input: HTMLInputElement, value: string) {
  await act(async () => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
    setter?.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
    input.dispatchEvent(new Event('change', { bubbles: true }))
  })
}

describe('ForgotPasswordPage & ResetPasswordPage', () => {
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

  async function renderPath(initialEntry: string) {
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

  it('validates email and submits /auth/forgot-password', async () => {
    const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValue({
      status: 202,
      data: { code: 1000, success: true },
    })

    const el = await renderPath('/forgot-password')
    const emailInput = el.querySelector<HTMLInputElement>('input[id="email"]')
    const form = el.querySelector('form')
    expect(emailInput).not.toBeNull()
    expect(form).not.toBeNull()

    await setInputValue(emailInput!, 'not-an-email')
    await act(async () => {
      form!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    })
    await flushPromises()

    expect(el.textContent).toContain('Email không đúng định dạng')
    expect(postSpy).not.toHaveBeenCalled()

    await setInputValue(emailInput!, 'admin@example.com')
    await act(async () => {
      form!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    })
    await flushPromises()

    expect(postSpy).toHaveBeenCalledWith('/auth/forgot-password', { email: 'admin@example.com' })
    expect(el.textContent).toContain('Đã gửi yêu cầu')
  })

  it('shows normalized error on /forgot-password failure', async () => {
    vi.spyOn(apiClient, 'post').mockRejectedValue(
      new AppError({
        kind: 'rate_limited',
        code: 9003,
        message: 'Too many requests',
        retryAfter: 45,
      }),
    )

    const el = await renderPath('/forgot-password')
    const emailInput = el.querySelector<HTMLInputElement>('input[id="email"]')
    const form = el.querySelector('form')

    await setInputValue(emailInput!, 'admin@example.com')
    await act(async () => {
      form!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    })
    await flushPromises()

    expect(el.textContent).toContain('Vui lòng thử lại sau 45 giây.')
  })

  it('prefills token from ?token=..., validates newPassword >= 8, and submits /auth/reset-password', async () => {
    const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValue({
      status: 200,
      data: { code: 1000, success: true },
    })

    const el = await renderPath('/reset-password?token=reset-tok-123')
    const tokenInput = el.querySelector<HTMLInputElement>('input[id="token"]')
    const passwordInput = el.querySelector<HTMLInputElement>('input[id="newPassword"]')
    const form = el.querySelector('form')

    expect(tokenInput?.value).toBe('reset-tok-123')
    expect(passwordInput).not.toBeNull()
    expect(form).not.toBeNull()

    await setInputValue(passwordInput!, 'short7')
    await act(async () => {
      form!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    })
    await flushPromises()

    expect(el.textContent).toContain('Mật khẩu mới phải có ít nhất 8 ký tự')
    expect(postSpy).not.toHaveBeenCalled()

    await setInputValue(passwordInput!, 'NewPass123!')
    await act(async () => {
      form!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    })
    await flushPromises()

    expect(postSpy).toHaveBeenCalledWith('/auth/reset-password', {
      token: 'reset-tok-123',
      newPassword: 'NewPass123!',
    })
    expect(el.textContent).toContain('Đặt lại mật khẩu thành công')
  })

  it('allows manual token entry and displays normalized error on /reset-password failure', async () => {
    vi.spyOn(apiClient, 'post').mockRejectedValue(
      new AppError({
        kind: 'validation',
        code: 1008,
        message: 'Token đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.',
      }),
    )

    const el = await renderPath('/reset-password')
    const tokenInput = el.querySelector<HTMLInputElement>('input[id="token"]')
    const passwordInput = el.querySelector<HTMLInputElement>('input[id="newPassword"]')
    const form = el.querySelector('form')

    expect(tokenInput?.value).toBe('')

    await setInputValue(tokenInput!, 'manual-token-999')
    await setInputValue(passwordInput!, 'ValidPass123!')
    await act(async () => {
      form!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    })
    await flushPromises()

    expect(el.textContent).toContain('Token đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.')
  })
})
