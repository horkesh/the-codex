import type { EntryType } from '@/types/app'
import type { LucideIcon } from 'lucide-react'
import { Plane, Moon, Utensils, Gamepad2, Wine, Users, BookOpen } from 'lucide-react'

export interface EntryTypeMeta {
  label: string
  Icon: LucideIcon
  bg: string
  borderColor: string
}

export const ENTRY_TYPE_META: Record<EntryType, EntryTypeMeta> = {
  mission:     { label: 'Mission',    Icon: Plane,     bg: 'bg-mission',     borderColor: '#3d2b6b' },
  night_out:   { label: 'Night Out',  Icon: Moon,      bg: 'bg-night-out',   borderColor: '#0f2038' },
  steak:       { label: 'The Table',  Icon: Utensils,  bg: 'bg-steak',       borderColor: '#3d1a0a' },
  playstation: { label: 'The Pitch',  Icon: Gamepad2,  bg: 'bg-playstation', borderColor: '#0a2420' },
  toast:       { label: 'The Toast',  Icon: Wine,      bg: 'bg-toast',       borderColor: '#3d2010' },
  gathering:   { label: 'Gathering',  Icon: Users,     bg: 'bg-gathering',   borderColor: '#1a2a1a' },
  interlude:   { label: 'Interlude',  Icon: BookOpen,  bg: 'bg-interlude',   borderColor: '#1a1a2e' },
}

/** Tailwind badge classes for entry-type pills in story timeline / selection UI. */
export const STORY_TYPE_COLORS: Record<string, string> = {
  mission:     'bg-blue-500/20 text-blue-300 border-blue-500/30',
  night_out:   'bg-purple-500/20 text-purple-300 border-purple-500/30',
  steak:       'bg-red-500/20 text-red-300 border-red-500/30',
  playstation: 'bg-green-500/20 text-green-300 border-green-500/30',
  toast:       'bg-amber-500/20 text-amber-300 border-amber-500/30',
  gathering:   'bg-gold/20 text-gold border-gold/30',
  interlude:   'bg-slate-light text-ivory-dim border-white/10',
}

/** Short labels used in story timeline / selection badges. */
export const STORY_TYPE_LABELS: Record<string, string> = {
  mission:     'Mission',
  night_out:   'Night Out',
  steak:       'Steak',
  playstation: 'PlayStation',
  toast:       'Toast',
  gathering:   'Gathering',
  interlude:   'Interlude',
}

/** Entry-type category images (public/entry-types/), WebP for smaller size. Used in selector, card and hero when no cover. */
export const ENTRY_TYPE_IMAGES: Record<EntryType, string> = {
  mission:     '/entry-types/01-mission.webp',
  night_out:   '/entry-types/02-night-out.webp',
  steak:       '/entry-types/03-the-table.webp',
  playstation: '/entry-types/04-the-pitch.webp',
  toast:       '/entry-types/05-the-toast.webp',
  gathering:   '/entry-types/06-gathering.webp',
  interlude:   '/entry-types/07-interlude.webp',
}
