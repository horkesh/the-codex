import { useState, useCallback } from 'react'
import { DEFAULT_FILTER_ID } from '@/lib/photoFilters'
import type { FilterId } from '@/lib/photoFilters'

const key = (entryId: string) => `photo-filter:${entryId}`

export function getStoredFilter(entryId?: string): FilterId {
  if (!entryId) return DEFAULT_FILTER_ID
  return (localStorage.getItem(key(entryId)) as FilterId) ?? DEFAULT_FILTER_ID
}

export function useEntryFilter(entryId: string) {
  const [filterId, setFilterIdState] = useState<FilterId>(() => getStoredFilter(entryId))

  const setFilter = useCallback(
    (id: FilterId) => {
      localStorage.setItem(key(entryId), id)
      setFilterIdState(id)
    },
    [entryId],
  )

  return { filterId, setFilter }
}
