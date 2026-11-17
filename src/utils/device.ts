const DEVICE_ID_STORAGE_KEY = 'dw_admin_device_id'
const DEVICE_NAME_MAX_LENGTH = 100

function generateUuidV4(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  const bytes = new Uint8Array(16)
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(bytes)
  } else {
    for (let i = 0; i < bytes.length; i += 1) {
      bytes[i] = Math.floor(Math.random() * 256)
    }
  }

  // RFC 4122 version 4 & variant 1 bits
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80

  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

/**
 * Returns a persistent UUID v4 device identifier stored in `localStorage`.
 */
export function getDeviceId(): string {
  if (typeof window === 'undefined') {
    return generateUuidV4()
  }

  try {
    const existing = window.localStorage.getItem(DEVICE_ID_STORAGE_KEY)
    if (existing && existing.trim().length > 0) {
      return existing
    }

    const nextId = generateUuidV4()
    window.localStorage.setItem(DEVICE_ID_STORAGE_KEY, nextId)
    return nextId
  } catch {
    return generateUuidV4()
  }
}

function detectBrowser(ua: string): string {
  if (/Edg\//i.test(ua)) return 'Edge'
  if (/OPR\//i.test(ua) || /Opera/i.test(ua)) return 'Opera'
  if (/Chrome\//i.test(ua)) return 'Chrome'
  if (/Firefox\//i.test(ua)) return 'Firefox'
  if (/Safari\//i.test(ua)) return 'Safari'
  return 'Web Browser'
}

function detectOs(ua: string): string {
  if (/Windows/i.test(ua)) return 'Windows'
  if (/Mac OS X|Macintosh/i.test(ua)) return 'macOS'
  if (/Android/i.test(ua)) return 'Android'
  if (/iPhone|iPad|iPod/i.test(ua)) return 'iOS'
  if (/Linux/i.test(ua)) return 'Linux'
  return 'Unknown OS'
}

/**
 * Returns a concise browser/OS device name truncated to at most 100 characters.
 */
export function getDeviceName(): string {
  if (typeof navigator === 'undefined') {
    return 'Wallet Ledger Service Admin Web'
  }

  const ua = navigator.userAgent?.trim() ?? ''
  if (!ua) {
    return 'Wallet Ledger Service Admin Web'
  }

  const label = `${detectBrowser(ua)} on ${detectOs(ua)}`.trim()
  return label.slice(0, DEVICE_NAME_MAX_LENGTH)
}
