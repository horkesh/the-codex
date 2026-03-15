import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from(rawData, (c) => c.charCodeAt(0))
}

// Static browser capability check — computed once at module load
const isPushSupported = typeof window !== 'undefined'
  && 'serviceWorker' in navigator
  && 'PushManager' in window

export function usePushNotifications() {
  const gent = useAuthStore((s) => s.gent)
  const [subscribed, setSubscribed] = useState(false)

  // Register push SW and check existing subscription on mount
  useEffect(() => {
    if (!isPushSupported) return
    navigator.serviceWorker.register('/sw.js').then(() =>
      navigator.serviceWorker.ready
    ).then((reg) =>
      reg.pushManager.getSubscription()
    ).then((sub) => {
      setSubscribed(sub !== null)
    }).catch(() => {})
  }, [])

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!isPushSupported || !gent || !VAPID_PUBLIC_KEY) return false

    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') return false

      const reg = await navigator.serviceWorker.ready
      const existing = await reg.pushManager.getSubscription()
      if (existing) await existing.unsubscribe()

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      })

      const json = sub.toJSON()
      const { error } = await db.from('push_subscriptions').upsert(
        {
          gent_id:    gent.id,
          endpoint:   sub.endpoint,
          keys_p256dh: json.keys?.p256dh ?? '',
          keys_auth:  json.keys?.auth ?? '',
        },
        { onConflict: 'endpoint' },
      )
      if (error) throw error

      setSubscribed(true)
      return true
    } catch {
      return false
    }
  }, [gent])

  const unsubscribe = useCallback(async (): Promise<void> => {
    if (!isPushSupported) return
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (!sub) return
      await db.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
      await sub.unsubscribe()
      setSubscribed(false)
    } catch {
      // silent
    }
  }, [])

  return { supported: isPushSupported, subscribed, subscribe, unsubscribe }
}

// Fire-and-forget helper — call after entry creation or comment posting
export async function notifyOthers(params: {
  title: string
  body: string
  url?: string
  tag?: string
  senderGentId: string
}): Promise<void> {
  supabase.functions.invoke('send-push', { body: params }).catch(() => {})
}
