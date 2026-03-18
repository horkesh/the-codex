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

/* ── Country-specific visa data ── */

export interface CountryVisaInfo {
  /** Multi-language visa header (local scripts + Latin) */
  header: string
  /** Official motto or national slogan */
  motto: string
  /** Port of entry label in local language */
  portLabel: string
  /** Coat of arms / national emblem SVG path (simplified) */
  emblemPath: string
  /** Accent color for country-specific styling */
  accent: string
}

const COUNTRY_VISA_INFO: Record<string, CountryVisaInfo> = {
  HR: {
    header: 'VIZA \u00B7 VISA \u00B7 VISUM',
    motto: 'Republika Hrvatska',
    portLabel: 'Ulazna to\u010Dka',
    emblemPath: 'M20 4 L24 8 L20 16 L16 8 Z M14 10 L20 20 L26 10 M12 18 C12 24 20 28 20 28 C20 28 28 24 28 18 L20 22 Z',
    accent: '#003DA5',
  },
  RS: {
    header: '\u0412\u0418\u0417\u0410 \u00B7 VIZA \u00B7 VISA',
    motto: '\u0420\u0435\u043F\u0443\u0431\u043B\u0438\u043A\u0430 \u0421\u0440\u0431\u0438\u0458\u0430',
    portLabel: '\u0413\u0440\u0430\u043D\u0438\u0447\u043D\u0438 \u043F\u0440\u0435\u043B\u0430\u0437',
    emblemPath: 'M20 6 L24 10 L20 18 L16 10 Z M14 12 L20 22 L26 12 M16 20 L20 26 L24 20 M18 24 L20 28 L22 24',
    accent: '#C6363C',
  },
  BA: {
    header: 'VIZA \u00B7 \u0412\u0418\u0417\u0410 \u00B7 VISA',
    motto: 'Bosna i Hercegovina',
    portLabel: 'Grani\u010Dni prijelaz',
    emblemPath: 'M14 8 L20 4 L26 8 L26 24 L20 28 L14 24 Z M17 12 L20 8 L23 12 L23 20 L20 24 L17 20 Z',
    accent: '#002395',
  },
  HU: {
    header: 'V\u00CDZUM \u00B7 VISA \u00B7 VISUM',
    motto: 'Magyarorsz\u00E1g',
    portLabel: 'Bel\u00E9p\u00E9si pont',
    emblemPath: 'M20 4 L20 8 M16 8 L24 8 M16 8 L16 16 L20 20 L24 16 L24 8 M14 20 C14 26 20 28 20 28 C20 28 26 26 26 20',
    accent: '#477050',
  },
  ME: {
    header: 'VIZA \u00B7 VISA \u00B7 VISUM',
    motto: 'Crna Gora',
    portLabel: 'Grani\u010Dni prelaz',
    emblemPath: 'M20 4 L26 10 L24 18 L20 22 L16 18 L14 10 Z M18 10 L20 6 L22 10 L20 14 Z M16 20 L20 26 L24 20',
    accent: '#D4AF37',
  },
  SI: {
    header: 'VIZUM \u00B7 VISA \u00B7 VISUM',
    motto: 'Republika Slovenija',
    portLabel: 'Mej ni prehod',
    emblemPath: 'M16 16 L20 8 L24 16 M14 18 L20 18 L26 18 M18 18 L18 24 M22 18 L22 24 M16 24 L24 24',
    accent: '#003DA5',
  },
  IT: {
    header: 'VISTO \u00B7 VISA \u00B7 VISUM',
    motto: 'Repubblica Italiana',
    portLabel: 'Punto d\'ingresso',
    emblemPath: 'M20 4 L20 28 M14 10 C14 6 26 6 26 10 M14 10 L14 22 M26 10 L26 22 M14 22 C14 26 26 26 26 22',
    accent: '#008C45',
  },
  AT: {
    header: 'VISUM \u00B7 VISA \u00B7 VISTO',
    motto: '\u00D6sterreich',
    portLabel: 'Einreisestelle',
    emblemPath: 'M20 4 L24 10 L22 14 L26 18 L22 22 L24 26 L20 28 L16 26 L18 22 L14 18 L18 14 L16 10 Z',
    accent: '#EF3340',
  },
  DE: {
    header: 'VISUM \u00B7 VISA \u00B7 VISTO',
    motto: 'Bundesrepublik Deutschland',
    portLabel: 'Einreisestelle',
    emblemPath: 'M20 4 L26 8 L26 12 L24 14 L26 16 L26 24 L20 28 L14 24 L14 16 L16 14 L14 12 L14 8 Z',
    accent: '#DD0000',
  },
  FR: {
    header: 'VISA \u00B7 VISUM \u00B7 VISTO',
    motto: 'R\u00E9publique Fran\u00E7aise',
    portLabel: 'Point d\'entr\u00E9e',
    emblemPath: 'M20 4 L20 28 M14 8 L26 8 M14 16 L24 16 M14 8 L14 24',
    accent: '#002654',
  },
  ES: {
    header: 'VISADO \u00B7 VISA \u00B7 VISUM',
    motto: 'Reino de Espa\u00F1a',
    portLabel: 'Punto de entrada',
    emblemPath: 'M14 8 L20 4 L26 8 L26 12 L20 16 L14 12 Z M14 16 L20 20 L26 16 L26 24 L20 28 L14 24 Z',
    accent: '#AA151B',
  },
  GB: {
    header: 'VISA \u00B7 VISUM \u00B7 VISTO',
    motto: 'United Kingdom',
    portLabel: 'Port of entry',
    emblemPath: 'M14 4 L26 28 M26 4 L14 28 M14 16 L26 16 M20 4 L20 28',
    accent: '#012169',
  },
  GR: {
    header: 'B\u0399ZA \u00B7 VISA \u00B7 VISUM',
    motto: '\u0395\u03BB\u03BB\u03B7\u03BD\u03B9\u03BA\u03AE \u0394\u03B7\u03BC\u03BF\u03BA\u03C1\u03B1\u03C4\u03AF\u03B1',
    portLabel: '\u03A3\u03B7\u03BC\u03B5\u03AF\u03BF \u03B5\u03B9\u03C3\u03CC\u03B4\u03BF\u03C5',
    emblemPath: 'M14 4 L26 4 M14 8 L26 8 M14 12 L26 12 M14 16 L26 16 M14 20 L26 20 M14 24 L20 28 L26 24',
    accent: '#0D5EAF',
  },
  TR: {
    header: 'V\u0130ZE \u00B7 VISA \u00B7 VISUM',
    motto: 'T\u00FCrkiye Cumhuriyeti',
    portLabel: 'Giri\u015F noktas\u0131',
    emblemPath: 'M16 16 A8 8 0 1 1 16 16.01 Z M22 10 L28 16 L22 22',
    accent: '#E30A17',
  },
  CZ: {
    header: 'V\u00CDZUM \u00B7 VISA \u00B7 VISUM',
    motto: '\u010Cesk\u00E1 republika',
    portLabel: 'M\u00EDsto vstupu',
    emblemPath: 'M14 16 L20 4 L26 16 M14 16 L14 28 M26 16 L26 28 M14 28 L26 28',
    accent: '#11457E',
  },
  PT: {
    header: 'VISTO \u00B7 VISA \u00B7 VISUM',
    motto: 'Rep\u00FAblica Portuguesa',
    portLabel: 'Ponto de entrada',
    emblemPath: 'M20 4 A10 10 0 1 1 20 4.01 Z M16 12 L20 8 L24 12 L24 20 L20 24 L16 20 Z',
    accent: '#006600',
  },
}

/** Get country-specific visa page info. Falls back to generic. */
export function getCountryVisaInfo(cc: string | null): CountryVisaInfo {
  if (cc && COUNTRY_VISA_INFO[cc.toUpperCase()]) return COUNTRY_VISA_INFO[cc.toUpperCase()]
  return {
    header: 'VISA \u00B7 VISUM \u00B7 VISTO',
    motto: '',
    portLabel: 'Port of entry',
    emblemPath: 'M20 4 L24 8 L20 16 L16 8 Z M14 12 L20 22 L26 12',
    accent: '#1B3A5C',
  }
}

/** Generate a deterministic visa number from entry ID + country code */
export function visaNumber(entryId: string, cc: string | null): string {
  const prefix = cc?.toUpperCase().slice(0, 2) ?? 'XX'
  const hash = entryId.replace(/-/g, '').slice(0, 8).toUpperCase()
  return `${prefix}-${hash.slice(0, 4)}-${hash.slice(4, 8)}`
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
