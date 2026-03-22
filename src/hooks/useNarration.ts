import { useState, useCallback, useRef, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

/** @param cacheKey — unique key for storage caching (e.g. entryId, entryId-day-0, entryId-debrief) */
export function useNarration(cacheKey: string) {
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [playing, setPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.currentTime = 0
        audioRef.current.onended = null
        audioRef.current.onerror = null
        audioRef.current = null
      }
    }
  }, [])

  const generate = useCallback(async (text: string) => {
    setGenerating(true)
    try {
      const { data, error } = await supabase.functions.invoke('generate-narration', {
        body: { text, entry_id: cacheKey },
      })
      if (error) throw error
      if (data?.audio_url) {
        setAudioUrl(data.audio_url)
        // Auto-play after generation
        const audio = new Audio(data.audio_url)
        audio.onended = () => setPlaying(false)
        audio.onerror = () => setPlaying(false)
        audioRef.current = audio
        audio.play()
        setPlaying(true)
      }
    } catch (err) {
      console.error('Narration generation failed:', err)
    } finally {
      setGenerating(false)
    }
  }, [cacheKey])

  const play = useCallback(() => {
    if (!audioUrl) return
    if (!audioRef.current) {
      audioRef.current = new Audio(audioUrl)
      audioRef.current.onended = () => setPlaying(false)
      audioRef.current.onerror = () => setPlaying(false)
    }
    if (playing) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      setPlaying(false)
    } else {
      audioRef.current.play()
      setPlaying(true)
    }
  }, [audioUrl, playing])

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      setPlaying(false)
    }
  }, [])

  return { audioUrl, generating, playing, generate, play, stop }
}
