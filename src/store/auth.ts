import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Gent } from '@/types/app'

interface AuthState {
  gent: Gent | null
  initialized: boolean
  setGent: (gent: Gent | null) => void
  setInitialized: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      gent: null,
      initialized: false,
      setGent: (gent) => set({ gent }),
      setInitialized: () => set({ initialized: true }),
    }),
    // Don't persist initialized — it resets to false on every page load intentionally
    { name: 'codex-auth', partialize: (s) => ({ gent: s.gent }) },
  ),
)
