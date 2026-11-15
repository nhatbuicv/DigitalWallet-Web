import { create } from 'zustand'
import type { UserProfileResponse } from '@/api/types'

interface AuthState {
  accessToken: string | null
  user: UserProfileResponse | null
  setAccessToken: (token: string | null) => void
  setUser: (user: UserProfileResponse | null) => void
  clear: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  setAccessToken: (accessToken) => set({ accessToken }),
  setUser: (user) => set({ user }),
  clear: () => set({ accessToken: null, user: null }),
}))
