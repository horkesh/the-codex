import { supabase } from '@/lib/supabase'
import type { EntryComment } from '@/types/app'

const GENT_FIELDS = 'id, alias, display_name, full_alias, avatar_url'

export async function fetchComments(entryId: string): Promise<EntryComment[]> {
  const { data, error } = await supabase
    .from('entry_comments')
    .select(`*, gent:gents(${GENT_FIELDS})`)
    .eq('entry_id', entryId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data ?? []) as unknown as EntryComment[]
}

export async function addComment(entryId: string, gentId: string, body: string): Promise<EntryComment> {
  const { data, error } = await supabase
    .from('entry_comments')
    .insert({ entry_id: entryId, gent_id: gentId, body })
    .select(`*, gent:gents(${GENT_FIELDS})`)
    .single()
  if (error) throw error
  return data as unknown as EntryComment
}

export async function fetchCommentById(id: string): Promise<EntryComment | null> {
  const { data, error } = await supabase
    .from('entry_comments')
    .select(`*, gent:gents(${GENT_FIELDS})`)
    .eq('id', id)
    .single()
  if (error) return null
  return data as unknown as EntryComment
}

export async function deleteComment(id: string): Promise<void> {
  const { error } = await supabase.from('entry_comments').delete().eq('id', id)
  if (error) throw error
}
