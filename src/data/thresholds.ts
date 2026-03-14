import { supabase } from '@/lib/supabase'

export interface ThresholdDefinition {
  type: string
  name: string
  description: string
  reward_key: string
  criteria: Record<string, number>
}

export const THRESHOLD_DEFINITIONS: ThresholdDefinition[] = [
  {
    type: 'threshold_veteran',
    name: 'The Veteran',
    description: '5 missions completed.',
    reward_key: 'veteran_stamp',
    criteria: { missions: 5 },
  },
  {
    type: 'threshold_explorer',
    name: 'The Explorer',
    description: 'Visited 3 countries.',
    reward_key: 'explorer_palette',
    criteria: { countries: 3 },
  },
  {
    type: 'threshold_connoisseur',
    name: 'The Connoisseur',
    description: '10 steaks rated.',
    reward_key: 'connoisseur_badge',
    criteria: { steaks: 10 },
  },
  {
    type: 'threshold_host',
    name: 'The Host',
    description: '5 gatherings hosted.',
    reward_key: 'host_seal',
    criteria: { gatherings: 5 },
  },
]

export async function fetchEarnedThresholds(gentId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('achievements')
    .select('criteria')
    .eq('earned_by', gentId)
    .eq('type', 'threshold')
  if (error) throw error
  return (data ?? [])
    .map((row) => ((row.criteria as Record<string, unknown>).reward_key as string) ?? '')
    .filter(Boolean)
}

export async function checkAndAwardThresholds(gentId: string): Promise<void> {
  const { data: stats } = await supabase
    .from('gent_stats')
    .select('missions, steaks, gatherings, countries_visited')
    .eq('gent_id', gentId)
    .single()
  if (!stats) return

  const { data: earned } = await supabase
    .from('achievements')
    .select('type')
    .eq('earned_by', gentId)
    .eq('type', 'threshold')
  const earnedTypes = new Set(earned?.map((a) => a.type) ?? [])

  const toAward = THRESHOLD_DEFINITIONS.filter((def) => {
    if (earnedTypes.has(def.type)) return false
    const c = def.criteria
    if (c.missions && (stats.missions ?? 0) < c.missions) return false
    if (c.countries && (stats.countries_visited ?? 0) < c.countries) return false
    if (c.steaks && (stats.steaks ?? 0) < c.steaks) return false
    if (c.gatherings && (stats.gatherings ?? 0) < c.gatherings) return false
    return true
  })

  if (toAward.length === 0) return

  await supabase.from('achievements').insert(
    toAward.map((def) => ({
      type: def.type,
      name: def.name,
      description: def.description,
      criteria: { ...def.criteria, reward_key: def.reward_key },
      earned_by: gentId,
      earned_at: new Date().toISOString(),
    }))
  )
}
