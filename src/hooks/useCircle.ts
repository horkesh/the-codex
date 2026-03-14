import { useState, useEffect, useCallback } from 'react'
import { fetchPeople } from '@/data/people'
import type { Person } from '@/types/app'

interface CircleFilters {
  search?: string
  label?: string
}

export function useCircle() {
  const [people, setPeople] = useState<Person[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<CircleFilters>({})

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchPeople(filters)
      setPeople(data)
    } catch (err) {
      console.error('useCircle: fetchPeople failed', err)
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    load()
  }, [load])

  return { people, loading, filters, setFilters, reload: load }
}
