import type { UserRole } from '@/api/types'

const VALID_ROLES = new Set<UserRole>(['ADMIN', 'MANAGER', 'STAFF', 'USER'])

export interface JwtPayload {
  sub?: string
  role?: UserRole
  exp?: number
  iat?: number
  [key: string]: unknown
}

function normalizeRole(value: unknown): UserRole | undefined {
  if (typeof value !== 'string') return undefined
  const stripped = value
    .trim()
    .toUpperCase()
    .replace(/^ROLE_/, '')
  return VALID_ROLES.has(stripped as UserRole) ? (stripped as UserRole) : undefined
}

function decodeBase64Url(segment: string): string {
  const base64 = segment.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=')
  const binary = atob(padded)
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

export function decodeJwt(token: string | null | undefined): JwtPayload | null {
  if (!token || typeof token !== 'string') return null

  const parts = token.split('.')
  if (parts.length !== 3 || !parts[1]) return null

  try {
    const json = decodeBase64Url(parts[1])
    const parsed: unknown = JSON.parse(json)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return null
    }

    const record = parsed as Record<string, unknown>
    const rawRole = record.role ?? (Array.isArray(record.roles) ? record.roles[0] : undefined)

    return {
      ...record,
      sub: typeof record.sub === 'string' ? record.sub : undefined,
      role: normalizeRole(rawRole),
      exp: typeof record.exp === 'number' && Number.isFinite(record.exp) ? record.exp : undefined,
      iat: typeof record.iat === 'number' && Number.isFinite(record.iat) ? record.iat : undefined,
    }
  } catch {
    return null
  }
}

export function isTokenExpired(token: string | null | undefined, skewSeconds = 0): boolean {
  const payload = decodeJwt(token)
  if (!payload || payload.exp === undefined) return true

  const expiresAtMs = payload.exp * 1000
  return Date.now() >= expiresAtMs - skewSeconds * 1000
}
