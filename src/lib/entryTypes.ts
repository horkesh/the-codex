import type { EntryType } from '@/types/app'

export interface EntryTypeMeta {
  label: string
  icon: string
  bg: string        // Tailwind bg utility
  borderColor: string  // hex — used for inline border-left styles
}

export const ENTRY_TYPE_META: Record<EntryType, EntryTypeMeta> = {
  mission:     { label: 'Mission',    icon: '✈️', bg: 'bg-mission',     borderColor: '#3d2b6b' },
  night_out:   { label: 'Night Out',  icon: '🌙', bg: 'bg-night-out',   borderColor: '#0f2038' },
  steak:       { label: 'The Table',  icon: '🥩', bg: 'bg-steak',       borderColor: '#3d1a0a' },
  playstation: { label: 'The Pitch',  icon: '🎮', bg: 'bg-playstation', borderColor: '#0a2420' },
  toast:       { label: 'The Toast',  icon: '🥂', bg: 'bg-toast',       borderColor: '#3d2010' },
  gathering:   { label: 'Gathering',  icon: '🎉', bg: 'bg-gathering',   borderColor: '#1a2a1a' },
  interlude:   { label: 'Interlude',  icon: '💭', bg: 'bg-interlude',   borderColor: '#1a1a2e' },
}
