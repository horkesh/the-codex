# Public Showcase Page Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Public-facing showcase at `/` for Instagram link-in-bio — gent profiles, pinned entries, and a travel map. No auth required.

**Architecture:** New Supabase migration adds `anon` SELECT policies so public queries work without login. A `Showcase.tsx` page replaces `Landing.tsx` at `/`. Data fetched via dedicated `src/data/public.ts` module. Login moves into the showcase as "The Gents Lounge" pill that links to `/lounge` (redirects to `/chronicle`). Page is five sections: Hero, Gent profiles, Featured Chronicle (pinned entries), Travel Map (static SVG), Footer.

**Tech Stack:** React 19, TypeScript, Tailwind v4, Framer Motion, Supabase (anon RLS policies), static SVG world map

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `supabase/migrations/2026XXXX_public_showcase.sql` | Create | Anon SELECT policies for gents, entries, entry_participants, gent_stats |
| `src/data/public.ts` | Create | Public data fetching: pinned entries, gent profiles + stats, mission cities |
| `src/pages/Showcase.tsx` | Create | Public showcase page — orchestrates all sections |
| `src/components/showcase/ShowcaseHero.tsx` | Create | Hero section: logo, title, tagline, Lounge pill |
| `src/components/showcase/GentCards.tsx` | Create | Three gent profile cards with stats |
| `src/components/showcase/FeaturedChronicle.tsx` | Create | Pinned entry cards in cream passport style |
| `src/components/showcase/TravelMap.tsx` | Create | Static SVG world map with gold pins |
| `src/components/showcase/ShowcaseFooter.tsx` | Create | Footer with tagline and Lounge link |
| `src/App.tsx` | Modify | Replace Landing route, add `/lounge` redirect |
| `src/pages/Landing.tsx` | Modify | Becomes login-only page at `/login` |
| `CLAUDE.md` | Modify | Document public showcase |

---

## Chunk 1: Database + Data Layer

### Task 1: Add anon SELECT policies for public data

**Files:**
- Create: `supabase/migrations/20260317200000_public_showcase.sql`

- [ ] **Step 1: Create the migration**

```sql
-- Public showcase: allow anonymous reads on gents, published+pinned+shared entries, participants, stats

-- Gents profiles are public
CREATE POLICY "gents_anon_select" ON public.gents
  FOR SELECT TO anon USING (true);

-- Only published, shared, pinned entries visible publicly
CREATE POLICY "entries_anon_select" ON public.entries
  FOR SELECT TO anon USING (
    status IN ('published', 'gathering_post')
    AND visibility = 'shared'
    AND pinned = true
  );

-- Participants for publicly visible entries
CREATE POLICY "ep_anon_select" ON public.entry_participants
  FOR SELECT TO anon USING (
    EXISTS (
      SELECT 1 FROM public.entries e
      WHERE e.id = entry_id
        AND e.status IN ('published', 'gathering_post')
        AND e.visibility = 'shared'
        AND e.pinned = true
    )
  );

-- Grant anon access to gent_stats view
GRANT SELECT ON public.gent_stats TO anon;
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/20260317200000_public_showcase.sql
git commit -m "feat(db): anon SELECT policies for public showcase"
```

### Task 2: Create public data fetching module

**Files:**
- Create: `src/data/public.ts`

- [ ] **Step 1: Create the module with all public queries**

```typescript
import { supabase } from '@/lib/supabase'
import type { Entry, EntryWithParticipants, Gent, GentStats, GentAlias } from '@/types/app'

const ENTRY_COLUMNS = 'id, type, title, date, location, city, country, country_code, description, lore, cover_image_url, metadata, pinned, created_at'
const GENT_COLUMNS = 'id, alias, display_name, full_alias, avatar_url, portrait_url'

/** Fetch pinned+shared+published entries (no auth needed) */
export async function fetchPublicEntries(): Promise<EntryWithParticipants[]> {
  const { data: rawEntries, error } = await supabase
    .from('entries')
    .select(ENTRY_COLUMNS)
    .eq('pinned', true)
    .eq('visibility', 'shared')
    .in('status', ['published', 'gathering_post'])
    .order('date', { ascending: false })

  if (error || !rawEntries?.length) return []
  const entries = rawEntries as unknown as Entry[]
  const entryIds = entries.map(e => e.id)

  const { data: participantRows } = await supabase
    .from('entry_participants')
    .select(`gent_id, entry_id, gents:gent_id (${GENT_COLUMNS})`)
    .in('entry_id', entryIds)

  const participantMap: Record<string, Gent[]> = {}
  for (const row of participantRows ?? []) {
    const r = row as unknown as { entry_id: string; gents: Gent | null }
    if (!participantMap[r.entry_id]) participantMap[r.entry_id] = []
    if (r.gents) participantMap[r.entry_id].push(r.gents)
  }

  return entries.map(entry => ({ ...entry, participants: participantMap[entry.id] ?? [] }))
}

/** Fetch all gent profiles (no auth needed) */
export async function fetchPublicGents(): Promise<Gent[]> {
  const { data, error } = await supabase
    .from('gents')
    .select(GENT_COLUMNS)
    .order('alias')
  if (error || !data) return []
  return data as Gent[]
}

/** Fetch gent stats from the gent_stats view (no auth needed) */
export async function fetchPublicStats(): Promise<GentStats[]> {
  const { data, error } = await supabase
    .from('gent_stats')
    .select('gent_id, alias, missions, nights_out, steaks, ps5_sessions, toasts, gatherings, people_met, countries_visited, cities_visited, stamps_collected')

  if (error || !data) return []
  return data.map(row => ({
    gent_id: row.gent_id ?? '',
    alias: (row.alias ?? 'keys') as GentAlias,
    missions: row.missions ?? 0,
    nights_out: row.nights_out ?? 0,
    steaks: row.steaks ?? 0,
    ps5_sessions: row.ps5_sessions ?? 0,
    toasts: row.toasts ?? 0,
    gatherings: row.gatherings ?? 0,
    people_met: row.people_met ?? 0,
    countries_visited: row.countries_visited ?? 0,
    cities_visited: row.cities_visited ?? 0,
    stamps_collected: row.stamps_collected ?? 0,
  }))
}

/** Extract unique mission cities from entries for the travel map */
export function extractMissionCities(entries: EntryWithParticipants[]): Array<{ city: string; country: string; countryCode: string }> {
  const seen = new Set<string>()
  const cities: Array<{ city: string; country: string; countryCode: string }> = []
  for (const e of entries) {
    if (e.type !== 'mission' || !e.city || !e.country) continue
    const key = `${e.city}|${e.country}`
    if (seen.has(key)) continue
    seen.add(key)
    cities.push({ city: e.city, country: e.country, countryCode: e.country_code ?? '' })
  }
  return cities
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: Clean

- [ ] **Step 3: Commit**

```bash
git add src/data/public.ts
git commit -m "feat: public data fetching module (entries, gents, stats)"
```

---

## Chunk 2: Showcase Components

### Task 3: Create ShowcaseHero component

**Files:**
- Create: `src/components/showcase/ShowcaseHero.tsx`

- [ ] **Step 1: Create the hero section**

```tsx
import { motion } from 'framer-motion'
import { Link } from 'react-router'
import { staggerContainer, staggerItem } from '@/lib/animations'
import { useAuthStore } from '@/store/auth'

export function ShowcaseHero() {
  const gent = useAuthStore(s => s.gent)

  return (
    <section className="relative bg-obsidian flex flex-col items-center px-6 pt-20 pb-16 overflow-hidden">
      {/* Ambient glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(ellipse 70% 50% at 50% 20%, rgba(201,168,76,0.07) 0%, transparent 65%)' }}
        aria-hidden
      />

      <motion.div
        className="relative z-10 flex flex-col items-center max-w-lg"
        variants={staggerContainer}
        initial="initial"
        animate="animate"
      >
        {/* Logo */}
        <motion.div variants={staggerItem} className="mb-6 relative">
          <div
            className="absolute inset-0 rounded-full"
            style={{ boxShadow: '0 0 60px rgba(201,168,76,0.22), 0 0 120px rgba(201,168,76,0.08)' }}
            aria-hidden
          />
          <img
            src="/logo.png"
            alt="The Gents Chronicles"
            className="w-24 h-24 rounded-full border border-gold/30"
          />
        </motion.div>

        {/* Title */}
        <motion.h1 variants={staggerItem} className="font-display text-4xl text-ivory tracking-tight text-center leading-none">
          The Gents Chronicles
        </motion.h1>

        {/* Tagline */}
        <motion.p variants={staggerItem} className="mt-3 text-[11px] tracking-[0.3em] uppercase text-gold/70 font-body text-center">
          Three friends. One chronicle.
        </motion.p>

        {/* Divider */}
        <motion.div variants={staggerItem} className="mt-8 w-full flex items-center gap-3">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gold/40 to-transparent" />
          <div className="flex gap-1.5 items-center">
            <div className="w-1 h-1 rounded-full bg-gold/50" />
            <div className="w-1.5 h-1.5 rounded-full border border-gold/40" />
            <div className="w-1 h-1 rounded-full bg-gold/50" />
          </div>
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gold/40 to-transparent" />
        </motion.div>

        {/* Lounge pill */}
        <motion.div variants={staggerItem} className="mt-8">
          <Link
            to={gent ? '/home' : '/login'}
            className="px-5 py-2 rounded-full border border-gold/40 text-gold text-xs font-body tracking-widest uppercase hover:bg-gold/10 transition-all"
          >
            The Gents Lounge
          </Link>
        </motion.div>
      </motion.div>
    </section>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/showcase/ShowcaseHero.tsx
git commit -m "feat(showcase): hero section with logo, title, lounge pill"
```

### Task 4: Create GentCards component

**Files:**
- Create: `src/components/showcase/GentCards.tsx`

- [ ] **Step 1: Create gent profile cards**

```tsx
import { motion } from 'framer-motion'
import { fadeUp } from '@/lib/animations'
import type { Gent, GentStats } from '@/types/app'

const SIGNATURE_DRINKS: Record<string, string> = {
  keys: 'Cocktails',
  bass: 'Beer',
  lorekeeper: 'Beer',
}

const STAT_RULES: Array<{ field: keyof GentStats; threshold: number; label: string }> = [
  { field: 'steaks', threshold: 10, label: 'Connoisseur' },
  { field: 'countries_visited', threshold: 5, label: 'Globetrotter' },
  { field: 'missions', threshold: 8, label: 'Expeditionary' },
  { field: 'nights_out', threshold: 15, label: 'Nighthawk' },
]

function deriveLabel(stats: GentStats): string {
  for (const rule of STAT_RULES) {
    if ((stats[rule.field] as number) >= rule.threshold) return rule.label
  }
  return 'Chronicle Member'
}

interface GentCardsProps {
  gents: Gent[]
  stats: GentStats[]
}

export function GentCards({ gents, stats }: GentCardsProps) {
  const statsMap = Object.fromEntries(stats.map(s => [s.gent_id, s]))

  return (
    <section className="bg-obsidian px-6 pb-16">
      <p className="text-[10px] font-body tracking-[0.3em] uppercase text-gold/50 text-center mb-8">
        The Gents
      </p>
      <div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory max-w-lg mx-auto">
        {gents.map(g => {
          const s = statsMap[g.id]
          const drink = SIGNATURE_DRINKS[g.alias] ?? null
          const label = s ? deriveLabel(s) : null
          return (
            <motion.div
              key={g.id}
              variants={fadeUp}
              initial="initial"
              whileInView="animate"
              viewport={{ once: true }}
              className="min-w-[200px] snap-center flex flex-col items-center gap-3 bg-white/[0.03] border border-white/[0.06] rounded-xl px-5 py-6"
            >
              {/* Portrait */}
              <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-gold/20 bg-slate-dark">
                {(g.portrait_url ?? g.avatar_url) ? (
                  <img src={g.portrait_url ?? g.avatar_url!} alt={g.display_name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl font-display text-gold/50">
                    {g.display_name.charAt(0)}
                  </div>
                )}
              </div>
              {/* Name + alias */}
              <div className="text-center">
                <p className="font-display text-lg text-ivory">{g.display_name}</p>
                <p className="text-[10px] font-body tracking-[0.2em] uppercase text-gold/60 mt-0.5">{g.full_alias}</p>
              </div>
              {/* Stats */}
              {s && (
                <div className="flex gap-4 text-center mt-1">
                  <div>
                    <p className="font-display text-lg text-ivory">{s.missions}</p>
                    <p className="text-[9px] font-body tracking-widest uppercase text-ivory-dim">Missions</p>
                  </div>
                  <div>
                    <p className="font-display text-lg text-ivory">{s.countries_visited}</p>
                    <p className="text-[9px] font-body tracking-widest uppercase text-ivory-dim">Countries</p>
                  </div>
                </div>
              )}
              {/* Signature drink + label */}
              <div className="flex flex-col items-center gap-1 mt-1">
                {drink && (
                  <span className="text-[9px] font-body tracking-widest uppercase text-gold/50">{drink}</span>
                )}
                {label && (
                  <span className="text-[9px] font-body tracking-[0.2em] uppercase border border-gold/30 text-gold/70 px-2.5 py-0.5 rounded-full">{label}</span>
                )}
              </div>
            </motion.div>
          )
        })}
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/showcase/GentCards.tsx
git commit -m "feat(showcase): gent profile cards with stats + signature labels"
```

### Task 5: Create FeaturedChronicle component

**Files:**
- Create: `src/components/showcase/FeaturedChronicle.tsx`

- [ ] **Step 1: Create featured entry cards**

```tsx
import { motion } from 'framer-motion'
import { fadeUp } from '@/lib/animations'
import { formatDate } from '@/lib/utils'
import { getOneliner } from '@/export/templates/shared/utils'
import { ENTRY_TYPE_META } from '@/lib/entryTypes'
import type { EntryWithParticipants } from '@/types/app'

interface FeaturedChronicleProps {
  entries: EntryWithParticipants[]
}

export function FeaturedChronicle({ entries }: FeaturedChronicleProps) {
  if (entries.length === 0) return null

  return (
    <section className="px-6 py-16" style={{ backgroundColor: '#F5F0E1' }}>
      <p className="text-[10px] font-body tracking-[0.3em] uppercase text-[#8B7355] text-center mb-8">
        From the Chronicle
      </p>

      <div className="flex flex-col gap-5 max-w-lg mx-auto">
        {entries.map(entry => {
          const typeMeta = ENTRY_TYPE_META[entry.type]
          const oneliner = getOneliner(entry)
          const location = [entry.city, entry.country].filter(Boolean).join(', ') || entry.location

          return (
            <motion.article
              key={entry.id}
              variants={fadeUp}
              initial="initial"
              whileInView="animate"
              viewport={{ once: true }}
              className="rounded-xl overflow-hidden"
              style={{
                backgroundColor: '#FDFBF6',
                border: '1px solid rgba(139,115,85,0.15)',
                boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
              }}
            >
              {/* Cover photo — polaroid style */}
              {entry.cover_image_url && (
                <div className="px-4 pt-4">
                  <div
                    style={{
                      background: '#fff',
                      padding: '8px 8px 28px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                      transform: 'rotate(-0.5deg)',
                    }}
                  >
                    <img
                      src={entry.cover_image_url}
                      alt=""
                      className="w-full aspect-[16/10] object-cover block"
                      draggable={false}
                    />
                  </div>
                </div>
              )}

              {/* Card body */}
              <div className="px-5 py-4">
                {/* Type badge */}
                {typeMeta && (
                  <span
                    className="text-[9px] font-body tracking-[0.25em] uppercase font-semibold"
                    style={{ color: '#8B7355' }}
                  >
                    {typeMeta.label}
                  </span>
                )}

                {/* Title */}
                <h3
                  className="font-display text-xl font-bold mt-1 leading-tight"
                  style={{ color: '#1B3A5C' }}
                >
                  {entry.title}
                </h3>

                {/* Location + date */}
                <div className="flex items-center gap-2 mt-1.5">
                  {location && (
                    <span className="text-xs font-body" style={{ color: '#5A6B7A' }}>{location}</span>
                  )}
                  <span className="text-xs font-body" style={{ color: '#8B7355' }}>{formatDate(entry.date)}</span>
                </div>

                {/* Oneliner */}
                {oneliner && (
                  <p
                    className="mt-3 font-display italic text-sm leading-relaxed"
                    style={{ color: '#5A6B7A' }}
                  >
                    &ldquo;{oneliner}&rdquo;
                  </p>
                )}

                {/* Participants */}
                {entry.participants.length > 0 && (
                  <div className="flex gap-2 mt-3">
                    {entry.participants.map(p => (
                      <div key={p.id} className="w-7 h-7 rounded-full overflow-hidden border border-[#d4cfc4]">
                        {p.avatar_url ? (
                          <img src={p.avatar_url} alt={p.display_name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs font-bold" style={{ color: '#1B3A5C', backgroundColor: '#d4cfc4' }}>
                            {p.display_name.charAt(0)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.article>
          )
        })}
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/showcase/FeaturedChronicle.tsx
git commit -m "feat(showcase): featured chronicle — cream entry cards with polaroid photos"
```

### Task 6: Create TravelMap component

**Files:**
- Create: `src/components/showcase/TravelMap.tsx`

The map uses a simplified SVG world map outline with gold pins plotted using approximate lat/lng → SVG coordinate conversion. A lookup table maps known cities to coordinates. Unknown cities are skipped (no geocoding API needed).

- [ ] **Step 1: Create the travel map**

```tsx
import { motion } from 'framer-motion'
import { fadeUp } from '@/lib/animations'

// Approximate city → SVG coordinates (x: 0-1000, y: 0-500 on a simple world projection)
// Add more cities as missions grow
const CITY_COORDS: Record<string, { x: number; y: number }> = {
  // Europe
  'London': { x: 470, y: 148 },
  'Paris': { x: 480, y: 160 },
  'Berlin': { x: 505, y: 148 },
  'Rome': { x: 505, y: 175 },
  'Barcelona': { x: 475, y: 175 },
  'Amsterdam': { x: 488, y: 145 },
  'Prague': { x: 510, y: 155 },
  'Vienna': { x: 515, y: 158 },
  'Budapest': { x: 520, y: 160 },
  'Zagreb': { x: 515, y: 165 },
  'Belgrade': { x: 525, y: 168 },
  'Sarajevo': { x: 520, y: 170 },
  'Mostar': { x: 518, y: 172 },
  'Dubrovnik': { x: 518, y: 174 },
  'Ljubljana': { x: 510, y: 163 },
  'Munich': { x: 500, y: 155 },
  'Istanbul': { x: 545, y: 175 },
  'Athens': { x: 530, y: 185 },
  'Lisbon': { x: 450, y: 180 },
  'Madrid': { x: 460, y: 178 },
  'Stockholm': { x: 510, y: 125 },
  'Copenhagen': { x: 500, y: 135 },
  'Oslo': { x: 498, y: 122 },
  'Podgorica': { x: 522, y: 174 },
  'Tirana': { x: 525, y: 178 },
  'Skopje': { x: 528, y: 175 },
  // Middle East / Africa
  'Dubai': { x: 610, y: 218 },
  'Marrakech': { x: 455, y: 198 },
  'Cairo': { x: 555, y: 205 },
  // Americas
  'New York': { x: 275, y: 175 },
  'Miami': { x: 260, y: 210 },
  'Los Angeles': { x: 175, y: 195 },
  // Asia
  'Tokyo': { x: 835, y: 185 },
  'Bangkok': { x: 745, y: 235 },
  'Singapore': { x: 750, y: 270 },
}

interface TravelMapProps {
  cities: Array<{ city: string; country: string; countryCode: string }>
}

export function TravelMap({ cities }: TravelMapProps) {
  const pins = cities
    .map(c => ({ ...c, coords: CITY_COORDS[c.city] }))
    .filter((c): c is typeof c & { coords: { x: number; y: number } } => !!c.coords)

  if (pins.length === 0) return null

  return (
    <section className="bg-obsidian px-6 py-16">
      <p className="text-[10px] font-body tracking-[0.3em] uppercase text-gold/50 text-center mb-8">
        Missions Abroad
      </p>

      <motion.div
        variants={fadeUp}
        initial="initial"
        whileInView="animate"
        viewport={{ once: true }}
        className="max-w-2xl mx-auto"
      >
        <svg viewBox="0 0 1000 500" className="w-full" style={{ opacity: 0.9 }}>
          {/* Simplified world outline — Europe/Africa/Asia region */}
          <rect x={0} y={0} width={1000} height={500} fill="transparent" />

          {/* Continental outlines (simplified) */}
          {/* Europe */}
          <ellipse cx={500} cy={160} rx={80} ry={50} fill="none" stroke="rgba(201,168,76,0.08)" strokeWidth={1} />
          {/* Africa */}
          <ellipse cx={510} cy={280} rx={60} ry={90} fill="none" stroke="rgba(201,168,76,0.06)" strokeWidth={1} />
          {/* Asia */}
          <ellipse cx={700} cy={200} rx={150} ry={80} fill="none" stroke="rgba(201,168,76,0.06)" strokeWidth={1} />
          {/* Americas */}
          <ellipse cx={250} cy={230} rx={100} ry={120} fill="none" stroke="rgba(201,168,76,0.06)" strokeWidth={1} />

          {/* Grid lines */}
          {Array.from({ length: 5 }, (_, i) => (
            <line key={`h${i}`} x1={0} y1={100 + i * 80} x2={1000} y2={100 + i * 80} stroke="rgba(201,168,76,0.04)" strokeWidth={0.5} />
          ))}
          {Array.from({ length: 9 }, (_, i) => (
            <line key={`v${i}`} x1={100 + i * 100} y1={0} x2={100 + i * 100} y2={500} stroke="rgba(201,168,76,0.04)" strokeWidth={0.5} />
          ))}

          {/* Pins */}
          {pins.map((pin, i) => (
            <g key={`${pin.city}-${i}`}>
              {/* Glow */}
              <circle cx={pin.coords.x} cy={pin.coords.y} r={8} fill="rgba(201,168,76,0.15)" />
              {/* Pin */}
              <circle cx={pin.coords.x} cy={pin.coords.y} r={3.5} fill="#C9A84C" />
              <circle cx={pin.coords.x} cy={pin.coords.y} r={1.5} fill="#0a0a0f" />
              {/* Label */}
              <text
                x={pin.coords.x}
                y={pin.coords.y - 12}
                textAnchor="middle"
                fill="rgba(201,168,76,0.6)"
                fontSize={9}
                fontFamily="var(--font-body)"
                letterSpacing="0.08em"
              >
                {pin.city.toUpperCase()}
              </text>
            </g>
          ))}
        </svg>
      </motion.div>
    </section>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/showcase/TravelMap.tsx
git commit -m "feat(showcase): static SVG travel map with gold city pins"
```

### Task 7: Create ShowcaseFooter component

**Files:**
- Create: `src/components/showcase/ShowcaseFooter.tsx`

- [ ] **Step 1: Create the footer**

```tsx
import { Link } from 'react-router'
import { useAuthStore } from '@/store/auth'

export function ShowcaseFooter() {
  const gent = useAuthStore(s => s.gent)

  return (
    <footer className="bg-obsidian border-t border-white/[0.04] px-6 py-10">
      <div className="flex flex-col items-center gap-4 max-w-lg mx-auto">
        <p className="text-ivory-dim/40 text-xs italic font-display text-center">
          "Private chronicle. Public highlights."
        </p>
        <Link
          to={gent ? '/home' : '/login'}
          className="text-[10px] font-body tracking-[0.25em] uppercase text-gold/40 hover:text-gold/70 transition-colors"
        >
          The Gents Lounge
        </Link>
        <p className="text-ivory-dim/20 text-[10px] font-body">
          {new Date().getFullYear()}
        </p>
      </div>
    </footer>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/showcase/ShowcaseFooter.tsx
git commit -m "feat(showcase): footer with tagline + lounge link"
```

---

## Chunk 3: Page Assembly + Routing

### Task 8: Create Showcase page

**Files:**
- Create: `src/pages/Showcase.tsx`

- [ ] **Step 1: Create the orchestrating page**

```tsx
import { useState, useEffect } from 'react'
import { fetchPublicEntries, fetchPublicGents, fetchPublicStats, extractMissionCities } from '@/data/public'
import { ShowcaseHero } from '@/components/showcase/ShowcaseHero'
import { GentCards } from '@/components/showcase/GentCards'
import { FeaturedChronicle } from '@/components/showcase/FeaturedChronicle'
import { TravelMap } from '@/components/showcase/TravelMap'
import { ShowcaseFooter } from '@/components/showcase/ShowcaseFooter'
import type { EntryWithParticipants, Gent, GentStats } from '@/types/app'

export default function Showcase() {
  const [entries, setEntries] = useState<EntryWithParticipants[]>([])
  const [gents, setGents] = useState<Gent[]>([])
  const [stats, setStats] = useState<GentStats[]>([])

  useEffect(() => {
    fetchPublicEntries().then(setEntries).catch(() => {})
    fetchPublicGents().then(setGents).catch(() => {})
    fetchPublicStats().then(setStats).catch(() => {})
  }, [])

  const missionCities = extractMissionCities(entries)

  return (
    <div className="min-h-dvh bg-obsidian">
      <ShowcaseHero />
      {gents.length > 0 && <GentCards gents={gents} stats={stats} />}
      <FeaturedChronicle entries={entries} />
      <TravelMap cities={missionCities} />
      <ShowcaseFooter />
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/Showcase.tsx
git commit -m "feat(showcase): assemble showcase page with all sections"
```

### Task 9: Update routing in App.tsx

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Add imports and update routes**

Add import:
```typescript
import Showcase from '@/pages/Showcase'
```

Change the root route from:
```tsx
<Route path="/" element={<Landing />} />
```
To:
```tsx
<Route path="/" element={<Showcase />} />
<Route path="/login" element={<Landing />} />
<Route path="/lounge" element={<ProtectedRoute><Navigate to="/home" replace /></ProtectedRoute>} />
```

- [ ] **Step 2: Update Landing.tsx redirect**

In `src/pages/Landing.tsx`, change line 23 from:
```typescript
if (gent) navigate('/home', { replace: true })
```
To:
```typescript
if (gent) navigate('/home', { replace: true })
```
(No change needed — Landing already redirects logged-in users to `/home`.)

- [ ] **Step 3: Type-check and build**

Run: `npx tsc --noEmit && npx vite build`
Expected: Clean build

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx
git commit -m "feat: showcase at root, login at /login, lounge redirect"
```

---

## Chunk 4: Documentation + Deploy

### Task 10: Update CLAUDE.md and deploy

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Add public showcase section**

Add after the existing sections:

```markdown
## Public showcase (`src/pages/Showcase.tsx`)
- Public-facing page at `/` — no auth required. Instagram link-in-bio destination.
- Five sections: Hero (logo, title, "The Gents Lounge" pill), Gent Cards (portrait, alias, stats, signature drink, threshold label), Featured Chronicle (pinned+shared entries as cream cards with polaroid photos), Travel Map (static SVG with gold pins on mission cities), Footer.
- Data: `src/data/public.ts` — public queries using anon RLS policies. Only pinned+shared+published entries visible.
- Login moved to `/login`. Logged-in gents see "Enter Lounge" pill linking to `/home`.
- `/lounge` redirects to `/home` (protected).
- Travel map: `CITY_COORDS` lookup in `TravelMap.tsx` maps city names to SVG coordinates. Add new cities as missions grow.
- Anon RLS policies: `gents` (full select), `entries` (pinned+shared+published only), `entry_participants` (for publicly visible entries), `gent_stats` view (granted to anon).
```

- [ ] **Step 2: Deploy the migration**

The migration needs to be applied to the Supabase database. Run via Supabase dashboard or CLI:
```bash
supabase db push
```
Or apply manually in the Supabase SQL editor.

- [ ] **Step 3: Commit and push**

```bash
git add CLAUDE.md
git commit -m "docs: add public showcase to CLAUDE.md"
git push
```

- [ ] **Step 4: Verify deploy**

Run: `gh run list --limit 1`
Expected: Deploy running or completed
