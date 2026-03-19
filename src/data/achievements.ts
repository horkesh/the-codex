import { supabase } from '@/lib/supabase'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EarnedAchievement {
  type: string
  name: string
  description: string
  earned_at: string
}

export async function fetchEarnedAchievements(gentId: string): Promise<EarnedAchievement[]> {
  const { data, error } = await supabase
    .from('achievements')
    .select('type, name, description, earned_at')
    .eq('earned_by', gentId)
    .order('earned_at', { ascending: true })
  if (error) throw error
  return (data ?? []) as EarnedAchievement[]
}

// Emoji icon for each achievement/threshold type
export const ACHIEVEMENT_ICONS: Record<string, string> = {
  first_mission: '🎯',
  five_missions: '🌍',
  ten_missions: '🗺️',
  ten_nights: '🌙',
  five_countries: '🛂',
  ten_steaks: '🥩',
  ps5_100: '🎮',
  threshold_veteran: '🎖️',
  threshold_explorer: '🧭',
  threshold_connoisseur: '🍷',
  threshold_host: '🥂',
  first_pour: '🍸',
  bartender: '🍹',
  confessor: '🗣️',
  chronicler_toast: '📸',
  regular: '🥃',
  legendary_host: '👑',
  fifty_cocktails: '🍸',
}

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
  // Toast achievements
  { type: 'first_pour', name: 'First Pour', description: 'Host your first Toast session.', criteria: { toast_sessions: 1 } },
  { type: 'bartender', name: 'Bartender', description: 'Craft 10 cocktails as Keys & Cocktails.', criteria: { toast_cocktails: 10 } },
  { type: 'confessor', name: 'Confessor', description: 'Draw 10 confessions as Beard & Bass.', criteria: { toast_confessions: 10 } },
  { type: 'chronicler_toast', name: 'Chronicler', description: 'Take 20 group snaps as Lorekeeper.', criteria: { toast_photos: 20 } },
  { type: 'regular', name: 'Regular', description: 'Host 10 Toast sessions.', criteria: { toast_sessions: 10 } },
  { type: 'legendary_host', name: 'Legendary Host', description: 'Host 25 Toast sessions.', criteria: { toast_sessions: 25 } },
  { type: 'fifty_cocktails', name: '50 Cocktails', description: 'Craft 50 cocktails across all sessions.', criteria: { toast_cocktails: 50 } },
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

/**
 * Check and award toast-specific achievements based on toast_gent_stats.
 * Called after publishing a toast draft.
 */
export async function checkToastAchievements(gentId: string): Promise<void> {
  const { data: stats } = await supabase
    .from('toast_gent_stats' as any)
    .select('*')
    .eq('gent_id', gentId)

  if (!stats || stats.length === 0) return

  const totalSessions = stats.reduce((sum: number, s: any) => sum + (s.sessions_hosted || 0), 0)
  const totalCocktails = stats.reduce((sum: number, s: any) => sum + (s.cocktails_crafted || 0), 0)
  const totalConfessions = stats.reduce((sum: number, s: any) => sum + (s.confessions_drawn || 0), 0)
  const totalPhotos = stats.reduce((sum: number, s: any) => sum + (s.photos_taken || 0), 0)

  const candidates: Array<{ type: string; threshold: number; actual: number }> = [
    { type: 'first_pour', threshold: 1, actual: totalSessions },
    { type: 'regular', threshold: 10, actual: totalSessions },
    { type: 'legendary_host', threshold: 25, actual: totalSessions },
    { type: 'bartender', threshold: 10, actual: totalCocktails },
    { type: 'fifty_cocktails', threshold: 50, actual: totalCocktails },
    { type: 'confessor', threshold: 10, actual: totalConfessions },
    { type: 'chronicler_toast', threshold: 20, actual: totalPhotos },
  ]

  const earned = candidates.filter(c => c.actual >= c.threshold).map(c => c.type)
  if (earned.length === 0) return

  // Get already earned achievements
  const { data: existing } = await supabase
    .from('achievements')
    .select('type')
    .eq('earned_by', gentId)
    .in('type', earned)

  const existingTypes = new Set(existing?.map(a => a.type) ?? [])
  const newTypes = earned.filter(t => !existingTypes.has(t))
  if (newTypes.length === 0) return

  const defs = ACHIEVEMENT_DEFINITIONS.filter(d => newTypes.includes(d.type))

  await supabase.from('achievements').insert(
    defs.map(def => ({
      type: def.type,
      name: def.name,
      description: def.description,
      criteria: def.criteria,
      earned_by: gentId,
      earned_at: new Date().toISOString(),
    }))
  )
}
