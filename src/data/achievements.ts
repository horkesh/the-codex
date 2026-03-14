import { supabase } from '@/lib/supabase'

// Seed achievement definitions (call once)
// Achievements are milestones earned automatically
export const ACHIEVEMENT_DEFINITIONS = [
  { type: 'first_mission', name: 'First Mission', description: 'The journey begins.', criteria: { missions: 1 } },
  { type: 'five_missions', name: 'World Traveller', description: '5 missions completed.', criteria: { missions: 5 } },
  { type: 'ten_missions', name: 'Seasoned Explorer', description: '10 missions in the chronicle.', criteria: { missions: 10 } },
  { type: 'ten_nights', name: 'Night Owl', description: '10 nights out logged.', criteria: { nights_out: 10 } },
  { type: 'five_countries', name: 'Passport Full', description: 'Visited 5 countries.', criteria: { countries: 5 } },
  { type: 'ten_steaks', name: 'The Carnivore', description: '10 tables visited.', criteria: { steaks: 10 } },
  { type: 'ps5_100', name: 'Century Club', description: '100 PS5 matches played.', criteria: { ps5_matches: 100 } },
]

// Check if a gent has earned any new achievements based on their current stats
// Called after publishing any entry
export async function checkAndAwardAchievements(gentId: string): Promise<void> {
  // Get current gent stats from gent_stats view
  const { data: stats } = await supabase
    .from('gent_stats')
    .select('*')
    .eq('gent_id', gentId)
    .single()

  if (!stats) return

  // Get already earned achievements
  const { data: earned } = await supabase
    .from('achievements')
    .select('type')
    .eq('earned_by', gentId)

  const earnedTypes = new Set(earned?.map(a => a.type) ?? [])

  const toAward = ACHIEVEMENT_DEFINITIONS.filter(def => {
    if (earnedTypes.has(def.type)) return false
    const c = def.criteria
    if (c.missions && (stats.missions ?? 0) < c.missions) return false
    if (c.nights_out && (stats.nights_out ?? 0) < c.nights_out) return false
    if (c.steaks && (stats.steaks ?? 0) < c.steaks) return false
    if (c.countries && (stats.countries_visited ?? 0) < c.countries) return false
    if (c.ps5_matches && (stats.ps5_sessions ?? 0) < c.ps5_matches) return false
    return true
  })

  if (toAward.length === 0) return

  await supabase.from('achievements').insert(
    toAward.map(def => ({
      type: def.type,
      name: def.name,
      description: def.description,
      criteria: def.criteria,
      earned_by: gentId,
      earned_at: new Date().toISOString(),
    }))
  )
}
