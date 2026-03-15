import { supabase } from '@/lib/supabase'
import type { ProspectVote } from '@/types/app'

export async function fetchVotesForProspects(prospectIds: string[]): Promise<ProspectVote[]> {
  if (prospectIds.length === 0) return []
  const { data, error } = await supabase
    .from('prospect_votes')
    .select('*')
    .in('prospect_id', prospectIds)
  if (error) throw error
  return (data ?? []) as ProspectVote[]
}

export async function upsertVote(prospectId: string, gentId: string, vote: 'in' | 'pass'): Promise<void> {
  const { error } = await supabase
    .from('prospect_votes')
    .upsert({ prospect_id: prospectId, gent_id: gentId, vote }, { onConflict: 'prospect_id,gent_id' })
  if (error) throw error
}

export async function removeVote(prospectId: string, gentId: string): Promise<void> {
  const { error } = await supabase
    .from('prospect_votes')
    .delete()
    .eq('prospect_id', prospectId)
    .eq('gent_id', gentId)
  if (error) throw error
}
