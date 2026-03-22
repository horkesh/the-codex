import { supabase } from '@/lib/supabase'
import type { Vault } from '@/types/app'

export async function fetchVaults(gentId: string): Promise<Vault[]> {
  const { data, error } = await supabase
    .from('vaults' as any)
    .select('*')
    .eq('created_by', gentId)
    .order('opens_at', { ascending: true })
  if (error) throw error
  return (data ?? []) as unknown as Vault[]
}

export async function createVault(gentId: string, message: string, opensAt: string): Promise<Vault> {
  const { data, error } = await supabase
    .from('vaults' as any)
    .insert({ created_by: gentId, message, opens_at: opensAt })
    .select()
    .single()
  if (error) throw error
  return data as unknown as Vault
}

export async function openVault(id: string): Promise<void> {
  const { error } = await supabase
    .from('vaults' as any)
    .update({ opened: true, opened_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

export async function deleteVault(id: string): Promise<void> {
  const { error } = await supabase
    .from('vaults' as any)
    .delete()
    .eq('id', id)
  if (error) throw error
}
