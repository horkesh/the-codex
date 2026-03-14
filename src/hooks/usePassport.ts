import { useState, useEffect } from 'react'
import { fetchStamps } from '@/data/stamps'
import type { PassportStamp } from '@/types/app'

export function usePassport() {
  const [stamps, setStamps] = useState<PassportStamp[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStamps()
      .then(data => setStamps(data))
      .catch(err => console.error('usePassport: fetchStamps failed', err))
      .finally(() => setLoading(false))
  }, [])

  const missionStamps = stamps.filter(s => s.type === 'mission')
  const achievementStamps = stamps.filter(s => s.type === 'achievement')
  const diplomaticStamps = stamps.filter(s => s.type === 'diplomatic')

  const countries = [...new Set(missionStamps.map(s => s.country).filter(Boolean))] as string[]
  const cities = [...new Set(missionStamps.map(s => s.city).filter(Boolean))] as string[]

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
