import { beforeEach, describe, expect, it } from 'vitest'
import { getDeviceId, getDeviceName } from './device'

const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

describe('device utils', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('generates a UUID v4 and persists it in localStorage', () => {
    const first = getDeviceId()
    const second = getDeviceId()

    expect(first).toMatch(UUID_V4_REGEX)
    expect(second).toBe(first)
    expect(window.localStorage.getItem('dw_admin_device_id')).toBe(first)
  })

  it('reuses an existing deviceId from localStorage', () => {
    const preset = '123e4567-e89b-42d3-a456-426614174000'
    window.localStorage.setItem('dw_admin_device_id', preset)

    expect(getDeviceId()).toBe(preset)
  })

  it('returns a non-empty deviceName with length <= 100', () => {
    const name = getDeviceName()

    expect(name.length).toBeGreaterThan(0)
    expect(name.length).toBeLessThanOrEqual(100)
  })
})
