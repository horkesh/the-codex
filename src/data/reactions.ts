import { supabase } from '@/lib/supabase'
import type { Reaction, ReactionType } from '@/types/app'

export async function fetchReactions(entryId: string): Promise<Reaction[]> {
  const { data, error } = await supabase
    .from('reactions')
    .select('*')
    .eq('entry_id', entryId)
  if (error) throw error
  return (data ?? []) as unknown as Reaction[]
}

export async function upsertReaction(entryId: string, gentId: string, reactionType: ReactionType): Promise<void> {
  const { error } = await supabase
    .from('reactions')
    .upsert({ entry_id: entryId, gent_id: gentId, reaction_type: reactionType }, { onConflict: 'entry_id,gent_id' })
  if (error) throw error
}

export async function deleteReaction(entryId: string, gentId: string): Promise<void> {
  const { error } = await supabase
    .from('reactions')
    .delete()
    .eq('entry_id', entryId)
    .eq('gent_id', gentId)
  if (error) throw error
}
