import { useState, useEffect, useCallback } from 'react'
import { fetchAllStats, fetchYearStats, fetchPS5HeadToHead, fetchMissionsByYear } from '@/data/stats'
import type { GentStats } from '@/types/app'

interface UseStatsReturn {
  stats: GentStats[]
  ps5H2H: Record<string, Record<string, number>>
  missionsByYear: Array<{ year: number; count: number }>
  selectedYear: number | null
  setSelectedYear: (year: number | null) => void
  loading: boolean
}

export function useStats(): UseStatsReturn {
  const [stats, setStats] = useState<GentStats[]>([])
  const [ps5H2H, setPs5H2H] = useState<Record<string, Record<string, number>>>({})
  const [missionsByYear, setMissionsByYear] = useState<Array<{ year: number; count: number }>>([])
  const [selectedYear, setSelectedYear] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  // Load all-time stats, PS5 H2H, and missions by year on mount
  useEffect(() => {
    let cancelled = false

    const loadInitial = async () => {
      setLoading(true)
      try {
        const [allStats, h2h, missions] = await Promise.all([
          fetchAllStats(),
          fetchPS5HeadToHead(),
          fetchMissionsByYear(),
        ])
        if (!cancelled) {
          setStats(allStats.filter(s => s.alias !== 'operative'))
          setPs5H2H(h2h)
          setMissionsByYear(missions)
        }
      } catch {
        // leave state as-is on error
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadInitial()

    return () => { cancelled = true }
  }, [])

  // On selectedYear change: load year stats or fall back to all-time
  const loadYearStats = useCallback(async (year: number | null) => {
    setLoading(true)
    try {
      const data = year !== null ? await fetchYearStats(year) : await fetchAllStats()
      setStats(data.filter(s => s.alias !== 'operative'))
    } catch {
      // leave state as-is
    } finally {
      setLoading(false)
    }
  }, [])

  // Track prior mount so we skip the initial run (handled above)
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    if (!mounted) {
      setMounted(true)
      return
    }
    loadYearStats(selectedYear)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedYear])

  return { stats, ps5H2H, missionsByYear, selectedYear, setSelectedYear, loading }
}
