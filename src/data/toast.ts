import { supabase } from '@/lib/supabase'
import type {
  ToastSession,
  ToastCocktail,
  ToastConfession,
  ToastWrapped,
  ToastTrack,
  ToastGentStats,
  ToastSessionFull,
} from '@/types/app'

export async function fetchToastSession(entryId: string): Promise<ToastSessionFull | null> {
  const { data: session } = await supabase
    .from('toast_sessions' as any)
    .select('*')
    .eq('entry_id', entryId)
    .single()

  if (!session) return null

  const sid = (session as any).id

  const [cocktailsRes, confessionsRes, wrappedRes, tracksRes] = await Promise.all([
    supabase
      .from('toast_cocktails' as any)
      .select('*')
      .eq('session_id', sid)
      .order('round_number'),
    supabase
      .from('toast_confessions' as any)
      .select('*')
      .eq('session_id', sid)
      .order('reaction_count', { ascending: false }),
    supabase
      .from('toast_wrapped' as any)
      .select('*')
      .eq('session_id', sid),
    supabase
      .from('toast_tracks' as any)
      .select('*')
      .eq('session_id', sid)
      .order('play_order'),
  ])

  return {
    session: session as unknown as ToastSession,
    cocktails: (cocktailsRes.data || []) as unknown as ToastCocktail[],
    confessions: (confessionsRes.data || []) as unknown as ToastConfession[],
    wrapped: (wrappedRes.data || []) as unknown as ToastWrapped[],
    tracks: (tracksRes.data || []) as unknown as ToastTrack[],
  }
}

export async function fetchToastGentStats(gentId: string): Promise<ToastGentStats[]> {
  const { data } = await supabase
    .from('toast_gent_stats' as any)
    .select('*')
    .eq('gent_id', gentId)

  return (data || []) as unknown as ToastGentStats[]
}

export async function fetchAllToastStats(): Promise<ToastGentStats[]> {
  const { data } = await supabase
    .from('toast_gent_stats' as any)
    .select('*')

  return (data || []) as unknown as ToastGentStats[]
}

export async function deleteToastDraft(entryId: string): Promise<void> {
  const { error } = await supabase
    .from('entries')
    .delete()
    .eq('id', entryId)
    .eq('status', 'draft')

  if (error) throw new Error(`Delete draft: ${error.message}`)
}

export async function publishToastDraft(
  entryId: string,
  updates: { title?: string; location?: string; guest_matches?: Record<string, unknown>[] },
): Promise<void> {
  const { data: entry } = await supabase
    .from('entries')
    .select('metadata')
    .eq('id', entryId)
    .single()

  const metadata = {
    ...((entry?.metadata || {}) as Record<string, unknown>),
    ...(updates.guest_matches ? { guest_matches: updates.guest_matches } : {}),
  }

  const { error } = await supabase
    .from('entries')
    .update({
      status: 'published',
      ...(updates.title ? { title: updates.title } : {}),
      ...(updates.location ? { location: updates.location } : {}),
      metadata: metadata as any,
    })
    .eq('id', entryId)

  if (error) throw new Error(`Publish draft: ${error.message}`)
}
