import { useState, useEffect, useCallback } from 'react'
import { fetchEntry, fetchEntryPhotos } from '@/data/entries'
import type { EntryWithParticipants } from '@/types/app'

interface EntryPhoto {
  id: string
  url: string
  caption: string | null
  sort_order: number
  taken_by: string | null
}

export function useEntry(id: string | undefined) {
  const [entry, setEntry] = useState<EntryWithParticipants | null>(null)
  const [photos, setPhotos] = useState<EntryPhoto[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setNotFound(false)
    try {
      const [e, p] = await Promise.all([fetchEntry(id), fetchEntryPhotos(id)])
      if (!e) {
        setNotFound(true)
      } else {
        setEntry(e)
        setPhotos(p)
      }
    } catch (err) {
      console.error('Failed to load entry:', err)
      setNotFound(true)
    }
    setLoading(false)
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  return { entry, photos, loading, notFound, reload: load, setEntry }
}
