import { useState, useEffect, useCallback } from 'react'
import { fetchPersonWithNote } from '@/data/people'
import { useAuthStore } from '@/store/auth'
import type { PersonWithPrivateNote } from '@/types/app'

export function usePerson(id: string | undefined) {
  const { gent } = useAuthStore()
  const [person, setPerson] = useState<PersonWithPrivateNote | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const load = useCallback(async () => {
    if (!id || !gent) return
    setLoading(true)
    const data = await fetchPersonWithNote(id, gent.id)
    if (!data) setNotFound(true)
    else setPerson(data)
    setLoading(false)
  }, [id, gent])

  useEffect(() => {
    load()
  }, [load])

  return { person, setPerson, loading, notFound, reload: load }
}
