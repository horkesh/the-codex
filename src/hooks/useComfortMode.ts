import { useEffect } from 'react'
import { useAuthStore } from '@/store/auth'

const STORAGE_KEY = 'codex-comfort-mode'

function getComfortPref(gentId: string): boolean {
  try {
    const prefs = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
    return prefs[gentId] === true
  } catch { return false }
}

function setComfortPref(gentId: string, enabled: boolean) {
  try {
    const prefs = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
    prefs[gentId] = enabled
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
  } catch { /* silent */ }
}

export function toggleComfortMode(gentId: string) {
  const current = getComfortPref(gentId)
  setComfortPref(gentId, !current)
  document.documentElement.classList.toggle('comfort-mode', !current)
  return !current
}

export function isComfortMode(gentId: string): boolean {
  return getComfortPref(gentId)
}

/** Apply comfort mode class on mount based on logged-in gent's preference */
export function useComfortMode() {
  const gent = useAuthStore((s) => s.gent)

  useEffect(() => {
    if (!gent) return
    const enabled = getComfortPref(gent.id)
    document.documentElement.classList.toggle('comfort-mode', enabled)
    return () => document.documentElement.classList.remove('comfort-mode')
  }, [gent])
}
