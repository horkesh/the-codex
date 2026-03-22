import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

export interface SpotifyTrack {
  name: string
  artist: string
  album: string
  spotify_url: string
  album_art: string
}

export function useSpotifySearch() {
  const [results, setResults] = useState<SpotifyTrack[]>([])
  const [searching, setSearching] = useState(false)

  const search = useCallback(async (query: string) => {
    if (!query.trim()) { setResults([]); return }
    setSearching(true)
    try {
      const { data, error } = await supabase.functions.invoke('spotify-search', {
        body: { query, limit: 8 },
      })
      if (error) throw error
      setResults(data?.tracks ?? [])
    } catch (err) {
      console.error('spotify-search failed:', err)
      setResults([])
    } finally {
      setSearching(false)
    }
  }, [])

  const clear = useCallback(() => setResults([]), [])

  return { results, searching, search, clear }
}
