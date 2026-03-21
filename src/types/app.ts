export type EntryType = 'mission' | 'night_out' | 'steak' | 'playstation' | 'toast' | 'gathering' | 'interlude'
export type LocationType = 'restaurant' | 'bar' | 'home' | 'venue' | 'other'

export interface SavedLocation {
  id: string
  name: string
  type: LocationType
  city: string
  country: string
  country_code: string
  lat: number | null
  lng: number | null
  address: string | null
  created_by: string
  created_at: string
}
export type EntryStatus = 'draft' | 'published' | 'gathering_pre' | 'gathering_post'
export type GentAlias = 'keys' | 'bass' | 'lorekeeper'

export interface Gent {
  id: string
  alias: GentAlias
  display_name: string
  full_alias: string
  avatar_url: string | null
  bio: string | null
  portrait_url: string | null
  status: string | null
  status_expires_at: string | null
}

export interface Entry {
  id: string
  type: EntryType
  title: string
  date: string
  location: string | null
  city: string | null
  country: string | null
  country_code: string | null
  description: string | null
  lore: string | null
  lore_generated_at: string | null
  cover_image_url: string | null
  scene_url: string | null
  status: EntryStatus
  pinned: boolean
  visibility: 'shared' | 'private'
  metadata: Record<string, unknown>
  created_by: string
  created_at: string
  updated_at: string
}

export interface EntryWithParticipants extends Entry {
  participants: Gent[]
}

export interface PassportStamp {
  id: string
  entry_id: string | null
  type: 'mission' | 'achievement' | 'diplomatic'
  name: string
  city: string | null
  country: string | null
  country_code: string | null
  image_url: string | null
  description: string | null
  date_earned: string
}

export interface Person {
  id: string
  name: string
  instagram: string | null
  photo_url: string | null
  portrait_url: string | null
  instagram_source_url: string | null
  met_at_entry: string | null
  met_date: string | null
  met_location: string | null
  notes: string | null
  labels: string[]
  added_by: string
  tier: PersonTier
  category: PersonCategory
  poi_source_url: string | null
  poi_intel: string | null
  poi_source_gent: string | null
  poi_visibility: POIVisibility
  birthday: string | null
}

export interface PersonWithPrivateNote extends Person {
  private_note: string | null
}

export interface GatheringRsvp {
  id: string
  entry_id: string
  name: string
  email: string | null
  response: 'attending' | 'not_attending' | 'maybe'
  created_at: string
}

export interface GuestBookMessage {
  id: string
  entry_id: string
  guest_name: string
  cocktail_chosen: string | null
  message: string | null
  created_at: string
}

export interface GentStats {
  gent_id: string
  alias: GentAlias
  missions: number
  nights_out: number
  steaks: number
  ps5_sessions: number
  toasts: number
  gatherings: number
  people_met: number
  countries_visited: number
  cities_visited: number
  stamps_collected: number
}

// PlayStation match
export interface PS5Match {
  match_number: number
  p1: GentAlias
  p2: GentAlias
  score: string
  winner: GentAlias | null
}

// Gathering metadata
export interface GatheringMetadata {
  event_date: string
  location: string
  guest_list: Array<{ name: string; person_id: string | null; rsvp_status: 'confirmed' | 'pending' | 'not_attending' }>
  cocktail_menu: string[]
  invite_image_url: string | null
  rsvp_link: string | null
  qr_code_url: string | null
  guest_book_count: number
  phase: 'pre' | 'post'
}

// Person tiers for mind map
export type PersonTier = 'inner_circle' | 'outer_circle' | 'acquaintance'

// Person of Interest (subcategory of people)
export type PersonCategory = 'contact' | 'person_of_interest'
export type POIVisibility = 'private' | 'circle'

// Person appearance in an entry (for mind map edges)
export interface PersonAppearance {
  id: string
  person_id: string
  entry_id: string
  noted_by: string
  created_at: string
}

// Prospect (possible future event scouted from Instagram)
export interface Prospect {
  id: string
  created_by: string
  source_url: string | null
  source_thumbnail_url: string | null
  event_name: string | null
  venue_name: string | null
  location: string | null
  city: string | null
  country: string | null
  event_date: string | null
  estimated_price: string | null
  vibe: string | null
  dress_code: string | null
  notes: string | null
  status: 'prospect' | 'passed' | 'converted'
  converted_entry_id: string | null
  visibility: 'private' | 'shared'
  created_at: string
}

// Prospect vote
export interface ProspectVote {
  id: string
  prospect_id: string
  gent_id: string
  vote: 'in' | 'pass'
  created_at: string
}

// Story day episode (for mission day-by-day breakdown)
export interface StoryDayEpisode {
  day: string       // YYYY-MM-DD (logical day, 3am boundary)
  label: string     // "Day 1 — Friday, 14 March"
  photoIds: string[]
  lore?: string     // per-day narrative (optional)
  oneliner?: string // per-day one-liner for carousel export (optional)
  selectedPhotoIds?: string[] // AI-selected photos for carousel export
}

/** Photo stored in entry_photos with GPS and AI analysis */
export interface EntryPhoto {
  id: string
  entry_id: string
  url: string
  caption: string | null
  taken_by: string | null
  sort_order: number
  exif_taken_at: string | null
  gps_lat: number | null
  gps_lng: number | null
  ai_analysis: PhotoAnalysis | null
  created_at: string
}

/** Per-photo AI analysis from Gemini Flash vision */
export interface PhotoAnalysis {
  scene_type: 'restaurant' | 'bar' | 'street' | 'landmark' | 'transport' | 'hotel' | 'market' | 'nature' | 'interior' | 'group_shot' | 'food' | 'selfie' | 'other'
  venue_name: string | null
  description: string
  gents_present: string[]
  food_drinks: string[]
  ephemera: Ephemera[]
  mood: 'energetic' | 'relaxed' | 'chaotic' | 'intimate' | 'adventurous' | 'festive' | 'contemplative'
  time_of_day_visual: 'morning' | 'afternoon' | 'golden_hour' | 'evening' | 'night'
  quality_score: number
  highlight_reason: string | null
  unnamed_characters?: UnnamedCharacter[]
  audio_intel?: AudioIntelligence
}

/** Text artifact detected in a photo */
export interface Ephemera {
  type: 'menu' | 'sign' | 'ticket' | 'receipt' | 'boarding_pass' | 'label' | 'other'
  text: string
  context: string
}

/** Unnamed person detected in a photo */
export interface UnnamedCharacter {
  description: string
  role: string
  approximate_age?: string
  distinguishing: string
}

/** Audio analysis from video clips */
export interface AudioIntelligence {
  has_music: boolean
  music_genre?: string
  music_description?: string
  ambient_noise: 'quiet' | 'moderate' | 'loud' | 'very_loud'
  languages_detected?: string[]
  description: string
}

/** A cluster of photos from the same place/time during a mission */
export interface Scene {
  id: string
  day: string
  dayIndex: number
  sceneIndex: number
  title: string | null
  startTime: string | null
  endTime: string | null
  centroid: { lat: number; lng: number } | null
  photoIds: string[]
  heroPhotoId: string | null
  mood: string | null
  narrative: string | null
}

/** Full mission intelligence stored in entry.metadata.mission_intel */
export interface MissionIntel {
  version: number
  scenes: Scene[]
  days: DayChapter[]
  route: DayRoute[]
  highlights: string[]
  ephemera: Ephemera[]
  tripArc: string | null
  verdict: MissionVerdict | null
  crossMissionRefs: CrossMissionRef[]
  tempo: TempoPoint[]
  gent_scene_notes?: GentSceneNote[]
  processed_at: string
}

/** Per-day chapter summary */
export interface DayChapter {
  day: string
  dayIndex: number
  label: string
  briefing: string | null
  debrief: string | null
  narrative: string | null
  sceneIds: string[]
  photoIds: string[]
  route: DayRoute | null
  stats: DayStats
}

export interface DayRoute {
  day: string
  points: Array<{ lat: number; lng: number; time?: string; label?: string | null; photoId?: string }>
}

export interface DayStats {
  photoCount: number
  sceneCount: number
  venuesVisited: string[]
  foodDrinks: string[]
  firstPhotoTime: string | null
  lastPhotoTime: string | null
}

export interface MissionVerdict {
  best_meal: string | null
  best_venue: string | null
  most_chaotic_moment: string | null
  mvp_scene: string | null
  would_return: string | null
  trip_rating: number | null
}

export interface CrossMissionRef {
  entryId: string
  title: string
  date: string
  lore: string | null
}

export interface TempoPoint {
  time: string
  intensity: number
  day: string
}

export interface GentSceneNote {
  sceneId: string
  gentId: string
  gentAlias: string
  note: string
  addedAt: string
}

export interface MissionSoundtrack {
  overall_mood?: string
  per_day?: Record<string, string>
  playlist_name?: string
}

export interface StoryMetadata {
  source?: 'mission' | 'manual'
  mission_entry_id?: string
  day_episodes?: StoryDayEpisode[]
}

// Story (curated multi-entry narrative arc for Passport)
export interface Story {
  id: string
  title: string
  subtitle: string | null
  cover_url: string | null
  lore: string | null
  stamp_url: string | null
  created_by: string
  entry_ids: string[]
  status: 'draft' | 'published'
  metadata: StoryMetadata
  created_at: string
  updated_at: string
}

// ─── Mission Intelligence ────────────────────────────────────────────────────

/** Photo stored in entry_photos with GPS and AI analysis */
export interface EntryPhoto {
  id: string
  entry_id: string
  url: string
  caption: string | null
  taken_by: string | null
  sort_order: number
  exif_taken_at: string | null
  gps_lat: number | null
  gps_lng: number | null
  ai_analysis: PhotoAnalysis | null
  created_at: string
}

/** Per-photo AI analysis from Gemini Flash vision */
export interface PhotoAnalysis {
  scene_type: 'restaurant' | 'bar' | 'street' | 'landmark' | 'transport' | 'hotel' | 'market' | 'nature' | 'interior' | 'group_shot' | 'food' | 'selfie' | 'other'
  venue_name: string | null
  description: string
  gents_present: string[]
  food_drinks: string[]
  ephemera: Ephemera[]
  mood: 'energetic' | 'relaxed' | 'chaotic' | 'intimate' | 'adventurous' | 'festive' | 'contemplative'
  time_of_day_visual: 'morning' | 'afternoon' | 'golden_hour' | 'evening' | 'night'
  quality_score: number
  highlight_reason: string | null
  unnamed_characters?: UnnamedCharacter[]
  audio_intel?: AudioIntelligence
}

/** Text artifact detected in a photo */
export interface Ephemera {
  type: 'menu' | 'sign' | 'ticket' | 'receipt' | 'boarding_pass' | 'label' | 'other'
  text: string
  context: string
}

/** Unnamed person detected in a photo */
export interface UnnamedCharacter {
  description: string
  role: string
  approximate_age?: string
  distinguishing: string
}

/** Audio analysis from video clips */
export interface AudioIntelligence {
  has_music: boolean
  music_genre?: string
  music_description?: string
  ambient_noise: 'quiet' | 'moderate' | 'loud' | 'very_loud'
  languages_detected?: string[]
  description: string
}

// Reaction (gent reaction to an entry)
export type ReactionType = 'legendary' | 'classic' | 'ruthless' | 'noted'
export interface Reaction {
  id: string
  entry_id: string
  gent_id: string
  reaction_type: ReactionType
  created_at: string
}

// Entry comment
export interface EntryComment {
  id: string
  entry_id: string
  gent_id: string
  body: string
  created_at: string
  gent?: Gent
}

// Bucket list item
export interface BucketListItem {
  id: string
  title: string
  category: EntryType | 'other' | null
  city: string | null
  country: string | null
  notes: string | null
  added_by: string
  status: 'open' | 'done' | 'passed'
  converted_entry_id: string | null
  created_at: string
}

// Gent status (live status, set manually)
export interface GentStatus {
  status: string | null
  status_expires_at: string | null
}

// Whereabouts (ephemeral, not persisted)
export interface GentWhereabouts {
  gent_id: string
  lat: number
  lng: number
  neighborhood: string
  shared_at: number
  expires_at: number
}

// ─── Verdict & Dossier ───────────────────────────────────────────────────────

export type VerdictSourceType = 'photo' | 'instagram_screenshot'
export type ScanStatus = 'draft' | 'confirmed' | 'discarded'
export type VerdictLabel = 'Immediate Interest' | 'Circle Material' | 'On the Radar' | 'Observe Further'

export interface PersonVerdict {
  eligible: true
  appearance: string
  trait_words: string[]
  score: number
  verdict_label: VerdictLabel
  confidence: number
  vibe: string
  style_read: string
  why_interesting: string
  best_opener: string
  green_flags: string[]
  watchouts: string[]
  display_name?: string | null
  instagram_handle?: string | null
}

export interface PersonScan {
  id: string
  created_by: string
  person_id: string | null
  source_type: VerdictSourceType
  source_photo_url: string | null
  instagram_handle: string | null
  instagram_source_url: string | null
  generated_avatar_url: string | null
  appearance_description: string | null
  trait_words: string[] | null
  score: number | null
  verdict_label: string | null
  confidence: number | null
  recommended_category: PersonCategory | null
  display_name: string | null
  bio: string | null
  why_interesting: string | null
  best_opener: string | null
  green_flags: string[] | null
  watchouts: string[] | null
  review_payload: Record<string, unknown> | null
  status: ScanStatus
  created_at: string | null
  updated_at: string | null
}

export interface DossierDraft {
  display_name: string
  instagram: string
  bio: string
  why_interesting: string
  best_opener: string
  green_flags: string[]
  watchouts: string[]
  category: PersonCategory
  visibility: POIVisibility
}

// Instagram analysis result
export interface InstagramAnalysis {
  // Event/venue mode
  event_name?: string
  venue_name?: string
  image_url?: string
  location?: string
  city?: string
  country?: string
  event_date?: string | null
  estimated_price?: string
  dress_code?: string
  vibe?: string
  confidence?: number
  // Profile mode
  display_name?: string
  username?: string
  bio?: string
  apparent_location?: string
  apparent_interests?: string
  suggested_approach?: string
  notable_details?: string
  // Screenshot specific
  post_count?: string
  follower_count?: string
  following_count?: string
  recent_post_themes?: string[]
}

// ─── Toast Session ──────────────────────────────────────────────────────────

export interface ToastSession {
  id: string
  entry_id: string
  hosted_by: string
  session_code: string
  duration_seconds: number
  act_count: number
  guest_count: number
  vibe_timeline: Array<{ act: number; vibe: string; timestamp: string }>
  created_at: string
}

export interface ToastCocktail {
  id: string
  session_id: string
  name: string
  story: string | null
  image_url: string | null
  round_number: number
  act: number
  crafted_for: string | null
}

export interface ToastConfession {
  id: string
  session_id: string
  prompt: string
  confessor_id: string | null
  confessor_is_gent: boolean
  ai_commentary: string | null
  act: number
  reaction_count: number
}

export interface ToastWrapped {
  id: string
  session_id: string
  participant_id: string
  is_gent: boolean
  stats: Record<string, number>
  ai_note: string | null
  ai_title: string | null
}

export interface ToastGentStats {
  id: string
  gent_id: string
  role: 'lorekeeper' | 'keys' | 'bass'
  sessions_hosted: number
  photos_taken: number
  cocktails_crafted: number
  confessions_drawn: number
  spotlights_given: number
  vibe_shifts_called: number
  reactions_sparked: number
  top_guest_id: string | null
  updated_at: string
}

export interface ToastTrack {
  id: string
  session_id: string
  name: string
  artist: string
  album_art_url: string | null
  spotify_url: string | null
  act: number | null
  play_order: number
  is_track_of_night: boolean
}

export interface ToastSessionFull {
  session: ToastSession
  cocktails: ToastCocktail[]
  confessions: ToastConfession[]
  wrapped: ToastWrapped[]
  tracks: ToastTrack[]
}
