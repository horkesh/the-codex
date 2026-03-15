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
  created_at: string
  updated_at: string
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
