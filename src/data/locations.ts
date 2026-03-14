import { supabase } from '@/lib/supabase'
import type { SavedLocation, LocationType } from '@/types/app'

const locs = () => supabase.from('locations')

const COLUMNS = 'id, name, type, city, country, country_code, lat, lng, address, created_by, created_at'

export async function fetchLocations(): Promise<SavedLocation[]> {
  const { data, error } = await locs().select(COLUMNS).order('name', { ascending: true })
  if (error || !data) return []
  return data as SavedLocation[]
}

export async function createLocation(input: {
  name: string
  type: LocationType
  city: string
  country: string
  country_code: string
  lat?: number | null
  lng?: number | null
  address?: string | null
  created_by: string
}): Promise<SavedLocation> {
  const { data, error } = await locs().insert(input).select(COLUMNS).single()
  if (error) throw error
  return data as SavedLocation
}

export async function updateLocation(
  id: string,
  updates: Partial<Omit<SavedLocation, 'id' | 'created_by' | 'created_at'>>,
): Promise<SavedLocation> {
  const { data, error } = await locs().update(updates).eq('id', id).select(COLUMNS).single()
  if (error) throw error
  return data as SavedLocation
}

export async function deleteLocation(id: string): Promise<void> {
  const { error } = await locs().delete().eq('id', id)
  if (error) throw error
}
