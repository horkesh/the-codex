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
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // Resolve loading immediately — don't hold the auth lock
      if (event === 'INITIAL_SESSION') setLoading(false)

      if (session?.user) {
        // Defer the Supabase data fetch outside the auth lock to avoid deadlock
        const userId = session.user.id
        setTimeout(() => {
          fetchGentById(userId).then(setGent)
        }, 0)
      } else {
        setGent(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [setGent])

  return { loading }
}

/**
 * Send a 6-digit OTP sign-in email. Throws on error.
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
 * Verify the 6-digit OTP code the user received by email.
 * On success, onAuthStateChange fires and the session is established.
 * Throws on error.
 */
export async function verifyCode(email: string, token: string): Promise<void> {
  const { error } = await supabase.auth.verifyOtp({ email, token, type: 'email' })
  if (error) throw error
}

/**
 * Sign the current user out. The auth listener handles clearing the store.
 */
export async function signOut(): Promise<void> {
  await supabase.auth.signOut()
}
