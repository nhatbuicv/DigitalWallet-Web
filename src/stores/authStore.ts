import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { UserRole } from '@/api/types'
import { decodeJwt } from '@/lib/jwt'

export interface AuthUser {
  customerId?: string
  fullName?: string
  phone?: string
  role?: UserRole
}

export interface SetSessionPayload {
  accessToken: string
  refreshToken?: string | null
  user?: AuthUser | null
}

export interface SetTokensPayload {
  accessToken: string
  refreshToken?: string | null
}

interface AuthState {
  accessToken: string | null
  refreshToken: string | null
  user: AuthUser | null
  setSession: (payload: SetSessionPayload) => void
  setTokens: (payload: SetTokensPayload) => void
  clearSession: () => void
}

const AUTH_STORAGE_KEY = 'dw_admin_auth'

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,

      setSession: ({ accessToken, refreshToken, user }) => {
        const decodedRole = decodeJwt(accessToken)?.role
        const nextUser: AuthUser | null = user
          ? {
              customerId: user.customerId,
              fullName: user.fullName,
              phone: user.phone,
              role: user.role ?? decodedRole,
            }
          : decodedRole
            ? { role: decodedRole }
            : null

        set((state) => ({
          accessToken,
          refreshToken: refreshToken !== undefined ? refreshToken : state.refreshToken,
          user: nextUser,
        }))
      },

      setTokens: ({ accessToken, refreshToken }) =>
        set((state) => ({
          accessToken,
          refreshToken: refreshToken !== undefined ? refreshToken : state.refreshToken,
        })),

      clearSession: () => {
        set({ accessToken: null, refreshToken: null, user: null })
        if (typeof window !== 'undefined') {
          window.sessionStorage.removeItem(AUTH_STORAGE_KEY)
        }
      },
    }),
    {
      name: AUTH_STORAGE_KEY,
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        refreshToken: state.refreshToken,
        user: state.user,
      }),
    },
  ),
)
