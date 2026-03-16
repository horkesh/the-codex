import { useState, useEffect, useMemo } from 'react'
import { fetchStamps, backfillMissionStamps } from '@/data/stamps'
import type { PassportStamp } from '@/types/app'

const BACKFILL_KEY = 'codex_stamps_backfilled'

export function usePassport() {
  const [stamps, setStamps] = useState<PassportStamp[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        // Backfill only once per session
        if (!sessionStorage.getItem(BACKFILL_KEY)) {
          await backfillMissionStamps()
          sessionStorage.setItem(BACKFILL_KEY, '1')
        }
        const data = await fetchStamps()
        setStamps(data)
      } catch (err) {
        console.error('usePassport: load failed', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const missionStamps = useMemo(() => stamps.filter(s => s.type === 'mission'), [stamps])
  const achievementStamps = useMemo(() => stamps.filter(s => s.type === 'achievement'), [stamps])
  const diplomaticStamps = useMemo(() => stamps.filter(s => s.type === 'diplomatic'), [stamps])

  const countries = useMemo(() => [...new Set(missionStamps.map(s => s.country).filter(Boolean))] as string[], [missionStamps])
  const cities = useMemo(() => [...new Set(missionStamps.map(s => s.city).filter(Boolean))] as string[], [missionStamps])

  return {
    stamps,
    missionStamps,
    achievementStamps,
    diplomaticStamps,
    countries,
    cities,
    loading,
  }
}
