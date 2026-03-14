import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth'
import { fetchGentById } from '@/data/gents'

/**
 * Sets up the single Supabase auth subscription for the app.
 * Call this ONCE at the root (App.tsx). All other components read
 * from useAuthStore() directly.
 *
 * Returns { loading } — true until the initial session check resolves.
 */
export function useAuthListener(): { loading: boolean } {
  const { setGent } = useAuthStore()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const gent = await fetchGentById(session.user.id)
        setGent(gent)
      } else {
        setGent(null)
      }
      // INITIAL_SESSION fires synchronously on mount — marks the initial check done
      if (event === 'INITIAL_SESSION') setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [setGent])

  return { loading }
}

/**
 * Send a magic-link sign-in email. Throws on error.
 * No new accounts created (shouldCreateUser: false).
 */
export async function signIn(email: string): Promise<void> {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: false },
  })
  if (error) throw error
}

/**
 * Sign the current user out. The auth listener handles clearing the store.
 */
export async function signOut(): Promise<void> {
  await supabase.auth.signOut()
}
