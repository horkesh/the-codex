import { useState, useEffect } from 'react'
import { fetchToastSession } from '@/data/toast'
import type { ToastSessionFull } from '@/types/app'

export function useToastSession(entryId: string | undefined) {
  const [session, setSession] = useState<ToastSessionFull | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!entryId) {
      setLoading(false)
      return
    }

    fetchToastSession(entryId)
      .then(setSession)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [entryId])

  return { session, loading }
}
