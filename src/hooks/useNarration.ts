import { useState, useCallback, useRef, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { setGlobalAudio, stopGlobalAudio } from '@/lib/audioManager'

/** @param cacheKey — unique key for storage caching (e.g. entryId, entryId-day-0, entryId-debrief) */
export function useNarration(cacheKey: string) {
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [playing, setPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Stop audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.onended = null
        audioRef.current.onerror = null
        audioRef.current = null
      }
    }
  }, [])

  function startPlaying(audio: HTMLAudioElement) {
    audioRef.current = audio
    audio.onended = () => setPlaying(false)
    audio.onerror = () => setPlaying(false)
    // Register globally — stops any other narration
    setGlobalAudio(audio, () => setPlaying(false))
    audio.play()
    setPlaying(true)
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
        const audio = new Audio(data.audio_url)
        startPlaying(audio)
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
      stopGlobalAudio()
      setPlaying(false)
    } else {
      const audio = new Audio(audioUrl)
      startPlaying(audio)
    }
  }, [audioUrl, playing])

  const stop = useCallback(() => {
    stopGlobalAudio()
    setPlaying(false)
  }, [])

  return { audioUrl, generating, playing, generate, play, stop }
}
