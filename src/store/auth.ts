import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Gent } from '@/types/app'

interface AuthState {
  gent: Gent | null
  setGent: (gent: Gent | null) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      gent: null,
      setGent: (gent) => set({ gent }),
    }),
    { name: 'codex-auth' },
  ),
)
