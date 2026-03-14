import { supabase } from '@/lib/supabase'
import type { Entry, GatheringRsvp, GuestBookMessage, GatheringMetadata } from '@/types/app'

// Fetch all gathering entries, ordered by date desc
export async function fetchGatherings(): Promise<Entry[]> {
  const { data, error } = await supabase
    .from('entries')
    .select('*')
    .eq('type', 'gathering')
    .order('date', { ascending: false })

  if (error) throw error
  return (data ?? []) as unknown as Entry[]
}

// Fetch a single gathering entry by entry ID
export async function fetchGathering(entryId: string): Promise<Entry | null> {
  const { data, error } = await supabase
    .from('entries')
    .select('*')
    .eq('id', entryId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }
  if (!data) return null
  return data as unknown as Entry
}

// Update gathering metadata (partial update, merged with existing metadata)
export async function updateGatheringMetadata(
  entryId: string,
  metadata: Partial<GatheringMetadata>
): Promise<void> {
  const { data: current, error: fetchError } = await supabase
    .from('entries')
    .select('metadata')
    .eq('id', entryId)
    .single()

  if (fetchError) throw fetchError

  const merged = { ...(current?.metadata as object ?? {}), ...metadata }

  const { error: updateError } = await supabase
    .from('entries')
    .update({ metadata: merged })
    .eq('id', entryId)

  if (updateError) throw updateError
}

// Fetch RSVPs for a gathering
export async function fetchRsvps(entryId: string): Promise<GatheringRsvp[]> {
  const { data, error } = await supabase
    .from('gathering_rsvps')
    .select('*')
    .eq('entry_id', entryId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return (data ?? []) as GatheringRsvp[]
}

// Fetch guest book messages for a gathering
export async function fetchGuestBookMessages(entryId: string): Promise<GuestBookMessage[]> {
  const { data, error } = await supabase
    .from('guest_book_messages')
    .select('*')
    .eq('entry_id', entryId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return (data ?? []) as GuestBookMessage[]
}

// Mark gathering as post-event (update status to 'gathering_post' and phase in metadata)
export async function markGatheringComplete(entryId: string): Promise<void> {
  const { data: current, error: fetchError } = await supabase
    .from('entries')
    .select('metadata')
    .eq('id', entryId)
    .single()

  if (fetchError) throw fetchError

  const merged = { ...(current?.metadata as object ?? {}), phase: 'post' }

  const { error: updateError } = await supabase
    .from('entries')
    .update({ status: 'gathering_post', metadata: merged })
    .eq('id', entryId)

  if (updateError) throw updateError
}
