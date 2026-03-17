import type React from 'react'
import type { Entry } from '@/types/app'

/** Extract lore one-liner from metadata, falling back to first sentence of lore */
export function getOneliner(entry: Entry): string | null {
  const meta = entry.metadata as Record<string, unknown> | undefined
  const oneliner = meta?.lore_oneliner as string | undefined
  if (oneliner) return oneliner
  // Fallback: first sentence of lore
  if (entry.lore) {
    const first = entry.lore.split(/(?<=[.!?])\s+/)[0]
    return first || entry.lore
  }
  return null
}

/** Inner layout for variant template children (fills parent ROOT container) */
export const VARIANT_INNER: React.CSSProperties = {
  width: '100%', height: '100%', display: 'flex', flexDirection: 'column', position: 'relative',
}

/** Format date as "MONTH YEAR" uppercase */
export function monthYear(date: string): string {
  return new Date(date + 'T12:00:00Z')
    .toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' })
    .toUpperCase()
}

/** Calculate trip duration string from start/end dates */
export function calcDuration(start: string, end?: string): string | null {
  if (!end) return null
  const s = new Date(start + 'T12:00:00Z')
  const e = new Date(end + 'T12:00:00Z')
  const days = Math.round((e.getTime() - s.getTime()) / 86400000) + 1
  return days <= 0 ? null : days === 1 ? '1 DAY' : `${days} DAYS`
}

const VISA_MAP: Record<string, string> = {
  HR: 'VIZA', RS: '\u0412\u0418\u0417\u0410', BA: 'VIZA', HU: 'VIZA', ME: 'VIZA', SI: 'VIZUM',
}

/** Get localized visa word for a country code */
export function visaWord(cc: string | null): string {
  if (!cc) return 'ENTRY VISA'
  return VISA_MAP[cc.toUpperCase()] ?? 'ENTRY VISA'
}

const ALIAS_DISPLAY: Record<string, string> = {
  lorekeeper: 'Lorekeeper',
  bass: 'Beard & Bass',
  keys: 'Keys & Cocktails',
}

/** Resolve gent alias to display name */
export function aliasDisplay(alias: string, fullAlias?: string | null): string {
  return ALIAS_DISPLAY[alias] ?? fullAlias ?? alias
}
