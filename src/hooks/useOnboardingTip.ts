import { useState, useCallback } from 'react'

const STORAGE_PREFIX = 'codex_tip_seen_'

export function useOnboardingTip(key: string): { show: boolean; dismiss: () => void } {
  const storageKey = `${STORAGE_PREFIX}${key}`
  const [show, setShow] = useState(() => localStorage.getItem(storageKey) !== 'true')

  const dismiss = useCallback(() => {
    localStorage.setItem(storageKey, 'true')
    setShow(false)
  }, [storageKey])

  return { show, dismiss }
}
