import { useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useWhereaboutsStore } from '@/store/whereabouts'
import { useAuthStore } from '@/store/auth'
import { reverseGeocodeNeighborhood } from '@/lib/geo'
import type { GentWhereabouts } from '@/types/app'

const CHANNEL_NAME = 'whereabouts'
const BROADCAST_INTERVAL_MS = 60_000  // broadcast every 60s when sharing

export function useWhereabouts() {
  const gent = useAuthStore(s => s.gent)
  const { setLocation, removeLocation, setSharing, pruneStale, sharing, shareExpiresAt } = useWhereaboutsStore()
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  // Subscribe to broadcast channel on mount
  useEffect(() => {
    const channel = supabase.channel(CHANNEL_NAME)
    channelRef.current = channel

    channel.on('broadcast', { event: 'location' }, ({ payload }: { payload: GentWhereabouts }) => {
      if (!gent || payload.gent_id === gent.id) return  // ignore own broadcasts
      if (Date.now() > payload.expires_at) return  // ignore expired
      setLocation(payload.gent_id, payload)
    })

    channel.on('broadcast', { event: 'offline' }, ({ payload }: { payload: { gent_id: string } }) => {
      removeLocation(payload.gent_id)
    })

    channel.subscribe()

    // Prune stale locations every 2 minutes
    const pruneInterval = setInterval(pruneStale, 2 * 60_000)

    return () => {
      channel.unsubscribe()
      supabase.removeChannel(channel)
      channelRef.current = null
      clearInterval(pruneInterval)
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
    }
  }, [gent?.id])

  const broadcastLocation = useCallback(async (expiresAt: number) => {
    if (!gent || !channelRef.current) return
    return new Promise<void>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude: lat, longitude: lng } = pos.coords
          const neighborhood = await reverseGeocodeNeighborhood(lat, lng)
          const payload: GentWhereabouts = {
            gent_id: gent.id,
            lat,
            lng,
            neighborhood,
            shared_at: Date.now(),
            expires_at: expiresAt,
          }
          await channelRef.current!.send({ type: 'broadcast', event: 'location', payload })
          resolve()
        },
        reject,
        { timeout: 10_000, maximumAge: 30_000 }
      )
    })
  }, [gent?.id])

  const startSharing = useCallback(async (hours: 1 | 4 | 24) => {
    const expiresAt = Date.now() + hours * 3_600_000
    setSharing(true, expiresAt)
    await broadcastLocation(expiresAt)

    // Broadcast on interval
    intervalRef.current = setInterval(() => {
      if (Date.now() > expiresAt) {
        stopSharing()
        return
      }
      broadcastLocation(expiresAt)
    }, BROADCAST_INTERVAL_MS)
  }, [broadcastLocation])

  const stopSharing = useCallback(() => {
    setSharing(false, null)
    if (intervalRef.current) clearInterval(intervalRef.current)
    // Broadcast offline event
    channelRef.current?.send({ type: 'broadcast', event: 'offline', payload: { gent_id: gent?.id } })
  }, [gent?.id])

  // Auto-stop when expiry is reached
  useEffect(() => {
    if (!sharing || !shareExpiresAt) return
    const remaining = shareExpiresAt - Date.now()
    if (remaining <= 0) { stopSharing(); return }
    const t = setTimeout(stopSharing, remaining)
    return () => clearTimeout(t)
  }, [sharing, shareExpiresAt])

  return { startSharing, stopSharing }
}
