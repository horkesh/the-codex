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

  /** Replace the current Audio object, cleaning up the old one */
  function setAudio(url: string): HTMLAudioElement {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.onended = null
      audioRef.current.onerror = null
    }
    const audio = new Audio(url)
    audio.onended = () => setPlaying(false)
    audio.onerror = () => setPlaying(false)
    audioRef.current = audio
    return audio
  }

  const generate = useCallback(async (text: string) => {
    setGenerating(true)
    try {
      const { data, error } = await supabase.functions.invoke('generate-narration', {
        body: { text, entry_id: cacheKey },
      })
      if (error) throw error
      if (data?.audio_url) {
        setAudioUrl(data.audio_url)
        const audio = setAudio(data.audio_url)
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
    if (playing) {
      audioRef.current?.pause()
      setPlaying(false)
    } else {
      if (!audioRef.current) setAudio(audioUrl)
      audioRef.current!.play()
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
