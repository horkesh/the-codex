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
  met_at_entry: string | null
  met_date: string | null
  met_location: string | null
  notes: string | null
  labels: string[]
  added_by: string
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
