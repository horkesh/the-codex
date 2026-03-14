import { useState, useEffect } from 'react'
import { useAuthStore } from '@/store/auth'
import { fetchEarnedThresholds } from '@/data/thresholds'

export function useThresholds(): { rewardKeys: Set<string>; loading: boolean } {
  const { gent } = useAuthStore()
  const [rewardKeys, setRewardKeys] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!gent) { setLoading(false); return }
    fetchEarnedThresholds(gent.id)
      .then((keys) => setRewardKeys(new Set(keys)))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [gent?.id])

  return { rewardKeys, loading }
}
