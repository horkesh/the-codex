import { supabase } from '@/lib/supabase'
import type {
  ToastSession,
  ToastCocktail,
  ToastConfession,
  ToastWrapped,
  ToastGentStats,
  ToastSessionFull,
} from '@/types/app'

export async function fetchToastSession(entryId: string): Promise<ToastSessionFull | null> {
  const { data: session } = await supabase
    .from('toast_sessions')
    .select('*')
    .eq('entry_id', entryId)
    .single()

  if (!session) return null

  const [cocktailsRes, confessionsRes, wrappedRes] = await Promise.all([
    supabase
      .from('toast_cocktails')
      .select('*')
      .eq('session_id', session.id)
      .order('round_number'),
    supabase
      .from('toast_confessions')
      .select('*')
      .eq('session_id', session.id)
      .order('reaction_count', { ascending: false }),
    supabase
      .from('toast_wrapped')
      .select('*')
      .eq('session_id', session.id),
  ])

  return {
    session: session as ToastSession,
    cocktails: (cocktailsRes.data || []) as ToastCocktail[],
    confessions: (confessionsRes.data || []) as ToastConfession[],
    wrapped: (wrappedRes.data || []) as ToastWrapped[],
  }
}

export async function fetchToastGentStats(gentId: string): Promise<ToastGentStats[]> {
  const { data } = await supabase
    .from('toast_gent_stats')
    .select('*')
    .eq('gent_id', gentId)

  return (data || []) as ToastGentStats[]
}

export async function fetchAllToastStats(): Promise<ToastGentStats[]> {
  const { data } = await supabase
    .from('toast_gent_stats')
    .select('*')

  return (data || []) as ToastGentStats[]
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
  updates: { title?: string; location?: string; guest_matches?: unknown[] },
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
      metadata,
    })
    .eq('id', entryId)

  if (error) throw new Error(`Publish draft: ${error.message}`)
}
