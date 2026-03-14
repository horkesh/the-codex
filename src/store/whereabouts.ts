import { create } from 'zustand'
import type { GentWhereabouts } from '@/types/app'

interface WhereaboutsState {
  // Other gents' locations (by gent_id)
  locations: Record<string, GentWhereabouts>
  // My own sharing state
  sharing: boolean
  shareExpiresAt: number | null
  // Actions
  setLocation: (gentId: string, loc: GentWhereabouts) => void
  removeLocation: (gentId: string) => void
  setSharing: (sharing: boolean, expiresAt: number | null) => void
  pruneStale: () => void  // Remove locations older than 5 minutes
}

export const useWhereaboutsStore = create<WhereaboutsState>((set) => ({
  locations: {},
  sharing: false,
  shareExpiresAt: null,
  setLocation: (gentId, loc) => set(state => ({
    locations: { ...state.locations, [gentId]: loc }
  })),
  removeLocation: (gentId) => set(state => {
    const next = { ...state.locations }
    delete next[gentId]
    return { locations: next }
  }),
  setSharing: (sharing, expiresAt) => set({ sharing, shareExpiresAt: expiresAt }),
  pruneStale: () => set(state => {
    const now = Date.now()
    const STALE_MS = 5 * 60 * 1000  // 5 minutes
    const fresh: Record<string, GentWhereabouts> = {}
    for (const [id, loc] of Object.entries(state.locations)) {
      if (now - loc.shared_at < STALE_MS) fresh[id] = loc
    }
    return { locations: fresh }
  }),
}))
