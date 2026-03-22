import type React from 'react'
import type { Entry } from '@/types/app'

/* ── Export constants ── */

/** Hardcoded font stacks for html2canvas (CSS vars don't resolve in export context) */
export const FONT = {
  display: "'Playfair Display', Georgia, serif",
  body: "'Instrument Sans', 'Helvetica Neue', Arial, sans-serif",
  mono: "'JetBrains Mono', 'Courier New', monospace",
} as const

/** Canonical color palette for export templates */
export const COLOR = {
  obsidian: '#0D0B0F',
  gold: '#C9A84C',
  goldDim: 'rgba(201,168,76,0.5)',
  goldFaint: 'rgba(201,168,76,0.25)',
  ivory: '#F0EDE8',
  ivoryDim: 'rgba(240,237,232,0.7)',
  ivoryFaint: 'rgba(240,237,232,0.45)',
  white: '#FFFFFF',
  muted: 'rgba(255,255,255,0.5)',
  mutedLight: 'rgba(255,255,255,0.35)',
  // Pizza party theme
  brick: '#D4843A',
  brickDim: 'rgba(212,132,58,0.35)',
  cream: '#F5F0E1',
  ink: '#2A1F14',
  inkDim: 'rgba(42,31,20,0.55)',
} as const

/** Extract lore one-liner from metadata, falling back to first sentence of lore */
export function getOneliner(entry: Pick<Entry, 'lore' | 'metadata'>): string | null {
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

/* ── City-specific localisation ── */

export interface CityInfo {
  /** Rotating epithets / nicknames — picked deterministically per entry */
  epithets: string[]
  /** Local greeting in native language */
  greeting: string
  /** Specific port-of-entry name (airport, border crossing, etc.) */
  portName: string
}

const CITY_INFO: Record<string, CityInfo> = {
  /* ── Croatia ── */
  Split: {
    epithets: ['Diocletian\'s City', 'Pearl of the Adriatic', 'Heart of Dalmatia', 'City of Marble'],
    greeting: 'Dobrodošli u Split',
    portName: 'SPU — Resnik',
  },
  Zagreb: {
    epithets: ['City of a Million Hearts', 'The Northern Capital', 'Gornji Grad Gateway', 'Ban\'s City'],
    greeting: 'Dobrodošli u Zagreb',
    portName: 'ZAG — Pleso',
  },
  Dubrovnik: {
    epithets: ['Pearl of the Adriatic', 'King\'s Landing', 'The Walled City', 'Jewel of the Coast'],
    greeting: 'Dobrodošli u Dubrovnik',
    portName: 'DBV — Čilipi',
  },
  Zadar: {
    epithets: ['City of the Sea Organ', 'Sun Salutation City', 'The Ancient Harbour', 'Dalmatian Jewel'],
    greeting: 'Dobrodošli u Zadar',
    portName: 'ZAD — Zemunik',
  },
  Rijeka: {
    epithets: ['Gateway to the Islands', 'The Port City', 'Kvarner Capital', 'City of Flow'],
    greeting: 'Dobrodošli u Rijeku',
    portName: 'RJK — Omišalj',
  },
  Pula: {
    epithets: ['Arena City', 'Istrian Jewel', 'City of the Amphitheatre', 'Roman Pola'],
    greeting: 'Dobrodošli u Pulu',
    portName: 'PUY — Pula',
  },
  /* ── Serbia ── */
  Belgrade: {
    epithets: ['The White City', 'City at the Confluence', 'Balkan\'s Capital of Night', 'Singidunum'],
    greeting: 'Добро дошли у Београд',
    portName: 'BEG — Nikola Tesla',
  },
  'Novi Sad': {
    epithets: ['Serbian Athens', 'EXIT City', 'Danube Jewel', 'The Freedom City'],
    greeting: 'Добро дошли у Нови Сад',
    portName: 'QND — Novi Sad',
  },
  Niš: {
    epithets: ['Constantine\'s City', 'Southern Gateway', 'City of the Emperor', 'Crossroads of the Balkans'],
    greeting: 'Добро дошли у Ниш',
    portName: 'INI — Niš',
  },
  /* ── Bosnia ── */
  Sarajevo: {
    epithets: ['Jerusalem of Europe', 'City Where East Meets West', 'The Baščaršija City', 'Olympic City'],
    greeting: 'Dobro došli u Sarajevo',
    portName: 'SJJ — Butmir',
  },
  Mostar: {
    epithets: ['City of the Old Bridge', 'Neretva\'s Jewel', 'The Diving City', 'Herzegovina\'s Heart'],
    greeting: 'Dobro došli u Mostar',
    portName: 'OMO — Mostar',
  },
  /* ── Hungary ── */
  Budapest: {
    epithets: ['Pearl of the Danube', 'City of Spas', 'Paris of the East', 'The Twin City'],
    greeting: 'Üdvözöljük Budapesten',
    portName: 'BUD — Liszt Ferenc',
  },
  /* ── Montenegro ── */
  Kotor: {
    epithets: ['City of Cats', 'The Fjord City', 'Boka Jewel', 'Montenegro\'s Gem'],
    greeting: 'Dobrodošli u Kotor',
    portName: 'TIV — Tivat',
  },
  Budva: {
    epithets: ['Montenegrin Miami', 'The Riviera City', 'Old Town by the Sea', 'Adriatic\'s Party Capital'],
    greeting: 'Dobrodošli u Budvu',
    portName: 'TGD — Podgorica',
  },
  Podgorica: {
    epithets: ['The Capital', 'City on Five Rivers', 'Ribnica Crossroads', 'Montenegro\'s Heart'],
    greeting: 'Dobrodošli u Podgoricu',
    portName: 'TGD — Podgorica',
  },
  /* ── Slovenia ── */
  Ljubljana: {
    epithets: ['Dragon City', 'The Green Capital', 'Plečnik\'s City', 'City on the Ljubljanica'],
    greeting: 'Dobrodošli v Ljubljani',
    portName: 'LJU — Brnik',
  },
  /* ── Italy ── */
  Rome: {
    epithets: ['The Eternal City', 'Caput Mundi', 'City of Seven Hills', 'The Open-Air Museum'],
    greeting: 'Benvenuti a Roma',
    portName: 'FCO — Fiumicino',
  },
  Milan: {
    epithets: ['Fashion Capital', 'The Moral Capital', 'City of the Madonnina', 'La Scala\'s City'],
    greeting: 'Benvenuti a Milano',
    portName: 'MXP — Malpensa',
  },
  Venice: {
    epithets: ['La Serenissima', 'City of Bridges', 'The Floating City', 'Queen of the Adriatic'],
    greeting: 'Benvenuti a Venezia',
    portName: 'VCE — Marco Polo',
  },
  Naples: {
    epithets: ['City of the Sun', 'Partenope', 'Vesuvius\' Shadow', 'Pizza\'s Birthplace'],
    greeting: 'Benvenuti a Napoli',
    portName: 'NAP — Capodichino',
  },
  Florence: {
    epithets: ['Cradle of the Renaissance', 'The Lily City', 'City of Medici', 'Firenze la Bella'],
    greeting: 'Benvenuti a Firenze',
    portName: 'FLR — Peretola',
  },
  /* ── Austria ── */
  Vienna: {
    epithets: ['City of Music', 'The Imperial Capital', 'City of Dreams', 'Waltz Capital'],
    greeting: 'Willkommen in Wien',
    portName: 'VIE — Schwechat',
  },
  /* ── Germany ── */
  Berlin: {
    epithets: ['City of Freedom', 'The Reunited Capital', 'Bohemian Capital', 'Techno\'s Throne'],
    greeting: 'Willkommen in Berlin',
    portName: 'BER — Brandenburg',
  },
  Munich: {
    epithets: ['City of Beer', 'Bavarian Capital', 'Isar Metropolis', 'The Millionendorf'],
    greeting: 'Willkommen in München',
    portName: 'MUC — Franz Josef Strauss',
  },
  /* ── France ── */
  Paris: {
    epithets: ['City of Light', 'La Ville Lumière', 'The Capital of Fashion', 'City of Love'],
    greeting: 'Bienvenue à Paris',
    portName: 'CDG — Charles de Gaulle',
  },
  /* ── Spain ── */
  Barcelona: {
    epithets: ['City of Gaudí', 'The Catalan Capital', 'La Ciudad Condal', 'Mediterranean Jewel'],
    greeting: 'Bienvenidos a Barcelona',
    portName: 'BCN — El Prat',
  },
  Madrid: {
    epithets: ['The Bear and the Tree', 'Villa y Corte', 'City That Never Sleeps', 'Heart of Spain'],
    greeting: 'Bienvenidos a Madrid',
    portName: 'MAD — Barajas',
  },
  /* ── UK ── */
  London: {
    epithets: ['The Great Smoke', 'City on the Thames', 'The Old Smoke', 'The Square Mile & Beyond'],
    greeting: 'Welcome to London',
    portName: 'LHR — Heathrow',
  },
  /* ── Greece ── */
  Athens: {
    epithets: ['Cradle of Democracy', 'City of the Acropolis', 'The Violet Crown', 'Athena\'s City'],
    greeting: 'Καλώς ορίσατε στην Αθήνα',
    portName: 'ATH — Eleftherios Venizelos',
  },
  /* ── Turkey ── */
  Istanbul: {
    epithets: ['City on Two Continents', 'The Sultan\'s Capital', 'Constantinople Reborn', 'Gateway Between Worlds'],
    greeting: 'İstanbul\'a hoş geldiniz',
    portName: 'IST — İstanbul',
  },
  /* ── Czech Republic ── */
  Prague: {
    epithets: ['City of a Hundred Spires', 'The Golden City', 'Heart of Bohemia', 'The Mother of Cities'],
    greeting: 'Vítejte v Praze',
    portName: 'PRG — Václav Havel',
  },
  /* ── Portugal ── */
  Lisbon: {
    epithets: ['City of Seven Hills', 'The White City', 'City of Fado', 'Olisipo'],
    greeting: 'Bem-vindos a Lisboa',
    portName: 'LIS — Humberto Delgado',
  },
}

/** Deterministic index from entry ID — rotates through an array */
function hashIndex(entryId: string, len: number): number {
  let h = 0
  for (let i = 0; i < entryId.length; i++) h = ((h << 5) - h + entryId.charCodeAt(i)) | 0
  return ((h % len) + len) % len
}

/** Get city-specific info with a deterministic epithet rotation per entry.
 *  Returns null if the city isn't in our data. */
export function getCityInfo(city: string | null, entryId: string): { epithet: string; greeting: string; portName: string } | null {
  if (!city) return null
  const info = CITY_INFO[city]
  if (!info) return null
  return {
    epithet: info.epithets[hashIndex(entryId, info.epithets.length)],
    greeting: info.greeting,
    portName: info.portName,
  }
}

/* ── Roman numerals ── */

/** Convert a number (1–39) to Roman numerals */
export function toRoman(n: number): string {
  const vals = [10, 9, 5, 4, 1]
  const syms = ['X', 'IX', 'V', 'IV', 'I']
  let s = ''
  for (let i = 0; i < vals.length; i++) {
    while (n >= vals[i]) { s += syms[i]; n -= vals[i] }
  }
  return s
}

/* ── Season from date ── */

export type Season = 'spring' | 'summer' | 'autumn' | 'winter'

/** Derive season from a YYYY-MM-DD date string (Northern Hemisphere) */
export function getSeason(date: string): Season {
  const m = new Date(date + 'T12:00:00Z').getUTCMonth() // 0-indexed
  if (m >= 2 && m <= 4) return 'spring'
  if (m >= 5 && m <= 7) return 'summer'
  if (m >= 8 && m <= 10) return 'autumn'
  return 'winter'
}

/** CSS filter tint per season — subtle shift applied to photo bands */
export const SEASON_FILTER: Record<Season, string> = {
  spring: 'sepia(0.06) saturate(1.1) brightness(1.02)',
  summer: 'sepia(0.12) saturate(1.15) contrast(1.05) brightness(1.02)',
  autumn: 'sepia(0.15) saturate(0.9) contrast(1.08) hue-rotate(-5deg)',
  winter: 'sepia(0.04) saturate(0.85) contrast(1.1) brightness(0.96) hue-rotate(10deg)',
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

/** Google Static Maps dark-style URL with gold marker */
export function buildStaticMapUrl(lat: number, lng: number, opts?: { zoom?: number; width?: number; height?: number }): string {
  const zoom = opts?.zoom ?? 15
  const w = opts?.width ?? 600
  const h = opts?.height ?? 300
  const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? ''
  const style = [
    'style=element:geometry|color:0x1a1a2e',
    'style=element:labels.text.fill|color:0xc9a84c',
    'style=element:labels.text.stroke|color:0x0a0a0f',
    'style=feature:water|element:geometry|color:0x0d0d1a',
    'style=feature:road|element:geometry|color:0x2a2a3e',
    'style=feature:poi|visibility:off',
  ].join('&')
  return `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=${zoom}&size=${w}x${h}&scale=2&${style}&markers=color:0xC9A84C|${lat},${lng}&key=${key}`
}
