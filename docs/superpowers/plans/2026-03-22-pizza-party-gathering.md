# Pizza Party Gathering Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add pizza party flavour to gatherings with procedural pizza SVGs, 4 Studio templates (1080x1920), location upgrade with Google Maps, RSVP push notifications, and auto-add attending guests to Circle.

**Architecture:** Flavour-based conditional rendering (same pattern as Night Out `live_music`/`movie_night`). Pizza menu stored in JSONB metadata. Procedural SVG pizza component renders from topping registry. Minimal push-only service worker for RSVP notifications. Vercel Edge Middleware for OG meta tags.

**Tech Stack:** React 19, TypeScript, Tailwind v4, Google Maps Static API, Google Places API, Web Push API, Supabase (Postgres + Edge Functions + Realtime), Vercel Edge Middleware.

---

## File Structure

### New files
| File | Responsibility |
|------|---------------|
| `src/lib/pizzaSvg.tsx` | Procedural pizza SVG component + topping registry |
| `src/components/gathering/PizzaMenuBuilder.tsx` | Pizza menu form (name + topping grid per pizza) |
| `src/export/templates/PizzaPartyCarta.tsx` | Template 1: La Carta (menu card) |
| `src/export/templates/PizzaPartyInvite.tsx` | Template 2: The Invitation (classic invite) |
| `src/export/templates/PizzaPartyForno.tsx` | Template 3: Il Forno (hero pizza) |
| `src/export/templates/PizzaPartyCountdown.tsx` | Template 4: Slice & Dice (countdown) |
| `public/sw-push.js` | Notification-only service worker (zero fetch interception) |
| `src/lib/pushSubscription.ts` | Web push subscribe/unsubscribe helpers |
| `middleware.ts` | Vercel Edge Middleware for OG meta on `/g/:slug` |
| `supabase/migrations/XXXXXX_push_subscriptions.sql` | Push subscriptions table |

### Modified files
| File | Changes |
|------|---------|
| `src/types/app.ts:141-151` | Add `PizzaMenuItem`, extend `GatheringMetadata` |
| `src/lib/geo.ts:5-21` | Add `address?` to `LocationFill` |
| `src/components/places/LocationSearchModal.tsx:195` | Map `formattedAddress` to `LocationFill.address` |
| `src/export/templates/shared/utils.ts` | Add `buildStaticMapUrl()` helper |
| `src/pages/GatheringNew.tsx` | Flavour selector, pizza menu builder, location upgrade |
| `src/pages/GatheringDetail.tsx` | Pizza menu display, map, push subscribe, unseen reset |
| `src/pages/public/PublicInvite.tsx` | Pizza party skin, map, hide email |
| `src/pages/Studio.tsx:55-76,128-132,361-365` | Register 4 templates, extend TemplateId |
| `src/components/chronicle/EntryCard.tsx` | RSVP badge + attending count |
| `supabase/functions/submit-rsvp/index.ts` | Circle auto-add, push notification, unseen count |
| `src/pages/Profile.tsx` | Push notification toggle |

---

## Chunk 1: Data Model + Procedural Pizza SVG

### Task 1: Extend types and interfaces

**Files:**
- Modify: `src/types/app.ts:141-151`
- Modify: `src/lib/geo.ts:5-21`

- [ ] **Step 1: Add PizzaMenuItem and extend GatheringMetadata**

In `src/types/app.ts`, add before `GatheringMetadata`:
```typescript
export interface PizzaMenuItem {
  name: string
  toppings: string[]
}
```

Extend `GatheringMetadata` (add after `phase`):
```typescript
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
  flavour?: 'pizza_party'
  pizza_menu?: PizzaMenuItem[]
  venue?: string
  address?: string
  lat?: number
  lng?: number
  rsvp_unseen_count?: number
}
```

- [ ] **Step 2: Add `address` to LocationFill**

In `src/lib/geo.ts`, add to the `LocationFill` interface (after `matchedPlaceName`):
```typescript
  /** Full street address from Google Places formattedAddress */
  address?: string
```

- [ ] **Step 3: Verify types compile**

Run: `npx tsc -b`
Expected: PASS (no errors — all new fields are optional)

- [ ] **Step 4: Commit**
```bash
git add src/types/app.ts src/lib/geo.ts
git commit -m "feat: add PizzaMenuItem type, extend GatheringMetadata + LocationFill"
```

### Task 2: Build procedural pizza SVG component

**Files:**
- Create: `src/lib/pizzaSvg.tsx`

- [ ] **Step 1: Create the topping registry and PizzaSvg component**

Create `src/lib/pizzaSvg.tsx`:

```tsx
type ToppingShape = 'blob' | 'circle' | 'halfmoon' | 'leaf' | 'ring' | 'strip' | 'square' | 'chunk' | 'shred'

interface ToppingDef {
  shape: ToppingShape
  color: string
  label: string
}

export const TOPPING_REGISTRY: Record<string, ToppingDef> = {
  mozzarella:  { shape: 'blob',     color: '#FFF8DC', label: 'Mozzarella' },
  pepperoni:   { shape: 'circle',   color: '#C41E3A', label: 'Pepperoni' },
  mushroom:    { shape: 'halfmoon', color: '#C4A882', label: 'Mushroom' },
  basil:       { shape: 'leaf',     color: '#4A7C59', label: 'Basil' },
  olive:       { shape: 'ring',     color: '#2D2D2D', label: 'Olive' },
  tomato:      { shape: 'circle',   color: '#E74C3C', label: 'Tomato' },
  onion:       { shape: 'ring',     color: '#DDA0DD', label: 'Onion' },
  pepper:      { shape: 'strip',    color: '#FFD700', label: 'Pepper' },
  ham:         { shape: 'square',   color: '#E8919A', label: 'Ham' },
  pineapple:   { shape: 'chunk',    color: '#F4D03F', label: 'Pineapple' },
  chilli:      { shape: 'strip',    color: '#FF4500', label: 'Chilli' },
  gorgonzola:  { shape: 'blob',     color: '#B8C9D6', label: 'Gorgonzola' },
  parmesan:    { shape: 'shred',    color: '#F5DEB3', label: 'Parmesan' },
  ricotta:     { shape: 'blob',     color: '#FFFAF0', label: 'Ricotta' },
  prosciutto:  { shape: 'strip',    color: '#D4756B', label: 'Prosciutto' },
  nduja:       { shape: 'blob',     color: '#CC4422', label: 'Nduja' },
  artichoke:   { shape: 'leaf',     color: '#8FBC8F', label: 'Artichoke' },
  anchovy:     { shape: 'strip',    color: '#8B7355', label: 'Anchovy' },
  egg:         { shape: 'circle',   color: '#FFEFD5', label: 'Egg' },
}

export const TOPPING_KEYS = Object.keys(TOPPING_REGISTRY)

/** Simple seeded PRNG for deterministic topping placement */
function seededRandom(seed: string): () => number {
  let h = 0
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(31, h) + seed.charCodeAt(i) | 0
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 0x45d9f3b)
    h = Math.imul(h ^ (h >>> 13), 0x45d9f3b)
    h = (h ^ (h >>> 16)) >>> 0
    return h / 0x100000000
  }
}

interface PizzaSvgProps {
  toppings: string[]
  size: number
  seed?: string
  className?: string
}

export function PizzaSvg({ toppings, size, seed = 'pizza', className }: PizzaSvgProps) {
  const r = size / 2
  const crustWidth = r * 0.12
  const sauceR = r - crustWidth - r * 0.04
  const toppingZone = sauceR * 0.82 // keep toppings inside cheese area
  const rand = seededRandom(seed)

  // Generate topping positions using grid-based placement to avoid overlap
  const toppingElements: React.ReactNode[] = []
  const placed: Array<{ x: number; y: number }> = []
  const minDist = size * 0.08

  for (const key of toppings) {
    const def = TOPPING_REGISTRY[key]
    if (!def) continue

    // Try placing 2-4 instances of each topping
    const count = Math.floor(rand() * 3) + 2
    for (let i = 0; i < count; i++) {
      let x = 0, y = 0, attempts = 0
      do {
        const angle = rand() * Math.PI * 2
        const dist = rand() * toppingZone
        x = r + Math.cos(angle) * dist
        y = r + Math.sin(angle) * dist
        attempts++
      } while (attempts < 20 && placed.some(p => Math.hypot(p.x - x, p.y - y) < minDist))

      if (attempts < 20) {
        placed.push({ x, y })
        const idx = toppingElements.length
        toppingElements.push(renderTopping(def, x, y, size * 0.05, rand(), idx))
      }
    }
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <radialGradient id={`crust-${seed}`} cx="50%" cy="50%" r="50%">
          <stop offset="78%" stopColor="#D4A843" />
          <stop offset="90%" stopColor="#C49332" />
          <stop offset="100%" stopColor="#A67B28" />
        </radialGradient>
        <radialGradient id={`cheese-${seed}`} cx="50%" cy="45%" r="55%">
          <stop offset="0%" stopColor="#FFF5D6" />
          <stop offset="100%" stopColor="#F0E0A0" />
        </radialGradient>
      </defs>
      {/* Crust */}
      <circle cx={r} cy={r} r={r - 1} fill={`url(#crust-${seed})`} />
      {/* Sauce */}
      <circle cx={r} cy={r} r={sauceR} fill="#C41E3A" />
      {/* Cheese */}
      <circle cx={r} cy={r} r={sauceR - 2} fill={`url(#cheese-${seed})`} opacity={0.7} />
      {/* Toppings */}
      {toppingElements}
    </svg>
  )
}

function renderTopping(def: ToppingDef, x: number, y: number, baseSize: number, rotation: number, key: number): React.ReactNode {
  const rot = rotation * 360
  const s = baseSize

  switch (def.shape) {
    case 'circle':
      return <circle key={key} cx={x} cy={y} r={s} fill={def.color} opacity={0.9} />
    case 'blob':
      return <ellipse key={key} cx={x} cy={y} rx={s * 1.2} ry={s * 0.8} fill={def.color} opacity={0.85} transform={`rotate(${rot} ${x} ${y})`} />
    case 'ring':
      return <circle key={key} cx={x} cy={y} r={s} fill="none" stroke={def.color} strokeWidth={s * 0.4} opacity={0.85} />
    case 'leaf':
      return <ellipse key={key} cx={x} cy={y} rx={s * 0.5} ry={s * 1.3} fill={def.color} opacity={0.9} transform={`rotate(${rot} ${x} ${y})`} />
    case 'strip':
      return <rect key={key} x={x - s * 0.3} y={y - s * 1.2} width={s * 0.6} height={s * 2.4} rx={s * 0.3} fill={def.color} opacity={0.85} transform={`rotate(${rot} ${x} ${y})`} />
    case 'square':
      return <rect key={key} x={x - s * 0.7} y={y - s * 0.7} width={s * 1.4} height={s * 1.4} rx={s * 0.2} fill={def.color} opacity={0.85} transform={`rotate(${rot} ${x} ${y})`} />
    case 'halfmoon':
      return <path key={key} d={`M ${x - s} ${y} A ${s} ${s} 0 0 1 ${x + s} ${y} Z`} fill={def.color} opacity={0.85} transform={`rotate(${rot} ${x} ${y})`} />
    case 'chunk':
      return (
        <polygon
          key={key}
          points={`${x},${y - s} ${x + s * 0.8},${y + s * 0.5} ${x - s * 0.8},${y + s * 0.5}`}
          fill={def.color}
          opacity={0.85}
          transform={`rotate(${rot} ${x} ${y})`}
        />
      )
    case 'shred':
      return <rect key={key} x={x - s * 0.15} y={y - s * 1} width={s * 0.3} height={s * 2} rx={s * 0.1} fill={def.color} opacity={0.7} transform={`rotate(${rot} ${x} ${y})`} />
    default:
      return <circle key={key} cx={x} cy={y} r={s} fill={def.color} opacity={0.8} />
  }
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc -b`
Expected: PASS

- [ ] **Step 3: Commit**
```bash
git add src/lib/pizzaSvg.tsx
git commit -m "feat: procedural pizza SVG component with topping registry"
```

### Task 3: Add static map URL helper + LocationSearchModal address extraction

**Files:**
- Modify: `src/export/templates/shared/utils.ts`
- Modify: `src/components/places/LocationSearchModal.tsx:195`

- [ ] **Step 1: Add `buildStaticMapUrl` helper**

In `src/export/templates/shared/utils.ts`, add at the end of the file:

```typescript
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
```

- [ ] **Step 2: Extract `formattedAddress` in LocationSearchModal**

In `src/components/places/LocationSearchModal.tsx`, find the `onSelect({` call at ~line 195. Add `address: detail.formattedAddress ?? undefined` to the object:

```typescript
onSelect({
  location: detail.displayName?.text ?? place.name,
  city,
  country,
  country_code: countryCode,
  lat: detail.location?.latitude,
  lng: detail.location?.longitude,
  address: detail.formattedAddress ?? undefined,
  overwrite: true,
})
```

- [ ] **Step 3: Verify types compile**

Run: `npx tsc -b`
Expected: PASS

- [ ] **Step 4: Commit**
```bash
git add src/export/templates/shared/utils.ts src/components/places/LocationSearchModal.tsx
git commit -m "feat: static map URL helper + address extraction from LocationSearchModal"
```

- [ ] **Chunk 1 Checkpoint: Run /simplify**

---

## Chunk 2: Gathering Form + Pizza Menu Builder

### Task 4: Build PizzaMenuBuilder component

**Files:**
- Create: `src/components/gathering/PizzaMenuBuilder.tsx`

- [ ] **Step 1: Create PizzaMenuBuilder**

```tsx
import { useState } from 'react'
import { X, Plus } from 'lucide-react'
import { TOPPING_REGISTRY, TOPPING_KEYS, PizzaSvg } from '@/lib/pizzaSvg'
import type { PizzaMenuItem } from '@/types/app'

interface PizzaMenuBuilderProps {
  pizzas: PizzaMenuItem[]
  onChange: (pizzas: PizzaMenuItem[]) => void
  max?: number
}

export function PizzaMenuBuilder({ pizzas, onChange, max = 8 }: PizzaMenuBuilderProps) {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null)

  function addPizza() {
    if (pizzas.length >= max) return
    const newPizzas = [...pizzas, { name: '', toppings: [] }]
    onChange(newPizzas)
    setExpandedIdx(newPizzas.length - 1)
  }

  function removePizza(idx: number) {
    onChange(pizzas.filter((_, i) => i !== idx))
    if (expandedIdx === idx) setExpandedIdx(null)
  }

  function updateName(idx: number, name: string) {
    const updated = [...pizzas]
    updated[idx] = { ...updated[idx], name }
    onChange(updated)
  }

  function toggleTopping(idx: number, key: string) {
    const updated = [...pizzas]
    const current = updated[idx].toppings
    updated[idx] = {
      ...updated[idx],
      toppings: current.includes(key)
        ? current.filter(t => t !== key)
        : [...current, key],
    }
    onChange(updated)
  }

  return (
    <div className="flex flex-col gap-3">
      <label className="text-xs font-body text-ivory-dim uppercase tracking-wider">Pizza Menu</label>

      {pizzas.map((pizza, idx) => (
        <div key={idx} className="bg-white/5 border border-white/10 rounded-xl p-3 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            {pizza.toppings.length > 0 && (
              <PizzaSvg toppings={pizza.toppings} size={48} seed={pizza.name || `pizza-${idx}`} />
            )}
            <input
              type="text"
              value={pizza.name}
              onChange={e => updateName(idx, e.target.value)}
              placeholder="Pizza name..."
              className="flex-1 bg-transparent text-sm text-ivory font-body placeholder:text-ivory-dim/40 focus:outline-none"
            />
            <button type="button" onClick={() => removePizza(idx)} className="p-1 text-ivory-dim/50 hover:text-ivory transition-colors">
              <X size={14} />
            </button>
          </div>

          {/* Topping pills */}
          <button
            type="button"
            onClick={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
            className="text-[10px] text-gold/60 font-body text-left hover:text-gold transition-colors"
          >
            {pizza.toppings.length > 0
              ? pizza.toppings.map(t => TOPPING_REGISTRY[t]?.label ?? t).join(' · ')
              : '+ add toppings'}
          </button>

          {expandedIdx === idx && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {TOPPING_KEYS.map(key => {
                const def = TOPPING_REGISTRY[key]
                const selected = pizza.toppings.includes(key)
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => toggleTopping(idx, key)}
                    className={[
                      'px-2.5 py-1 rounded-full text-[11px] font-body transition-all border',
                      selected
                        ? 'bg-gold/20 border-gold/50 text-gold'
                        : 'bg-white/3 border-white/10 text-ivory-dim/60 hover:border-white/20',
                    ].join(' ')}
                  >
                    {def.label}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      ))}

      {pizzas.length < max && (
        <button
          type="button"
          onClick={addPizza}
          className="flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-gold/20 text-xs text-ivory-dim font-body hover:border-gold/40 transition-colors"
        >
          <Plus size={14} className="text-gold/40" />
          Add pizza
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc -b`
Expected: PASS

- [ ] **Step 3: Commit**
```bash
git add src/components/gathering/PizzaMenuBuilder.tsx
git commit -m "feat: PizzaMenuBuilder component with topping grid"
```

### Task 5: Upgrade GatheringNew form with flavour selector + location

**Files:**
- Modify: `src/pages/GatheringNew.tsx`

- [ ] **Step 1: Read the current file fully**

Read `src/pages/GatheringNew.tsx` to understand the complete form structure before modifying.

- [ ] **Step 2: Add flavour selector, pizza menu state, location upgrade**

Add imports at top:
```typescript
import { PizzaMenuBuilder } from '@/components/gathering/PizzaMenuBuilder'
import { LocationSearchModal } from '@/components/places/LocationSearchModal'
import { buildStaticMapUrl } from '@/export/templates/shared/utils'
import type { PizzaMenuItem, LocationFill } from '@/types/app'
```

Add new state variables after existing ones:
```typescript
const [flavour, setFlavour] = useState<'pizza_party' | undefined>(undefined)
const [pizzaMenu, setPizzaMenu] = useState<PizzaMenuItem[]>([])
const [showLocationModal, setShowLocationModal] = useState(false)
const [venue, setVenue] = useState('')
const [address, setAddress] = useState('')
const [lat, setLat] = useState<number | undefined>()
const [lng, setLng] = useState<number | undefined>()
```

Add location handler:
```typescript
function handleLocationSelect(fill: LocationFill) {
  if (fill.location) { setLocation(fill.location); setVenue(fill.location) }
  if (fill.address) setAddress(fill.address)
  if (fill.city) setCity(fill.city)
  if (fill.lat) setLat(fill.lat)
  if (fill.lng) setLng(fill.lng)
  setShowLocationModal(false)
}
```

In `handleSubmit`, update the metadata object — add flavour-conditional menu logic:
```typescript
const metadata = {
  event_date: eventDate,
  location: venue || location,
  guest_list: guests.map(name => ({ name, person_id: null, rsvp_status: 'pending' as const })),
  cocktail_menu: flavour === 'pizza_party' ? [] : cocktails,
  invite_image_url: null,
  rsvp_link: null,
  qr_code_url: null,
  guest_book_count: 0,
  phase: 'pre' as const,
  flavour,
  pizza_menu: flavour === 'pizza_party' ? pizzaMenu : undefined,
  venue: venue || undefined,
  address: address || undefined,
  lat,
  lng,
}
```

- [ ] **Step 3: Add flavour pill toggle to form UI**

After the title field, add:
```tsx
{/* Flavour selector */}
<div className="flex gap-2">
  {([undefined, 'pizza_party'] as const).map(f => (
    <button
      key={f ?? 'regular'}
      type="button"
      onClick={() => { setFlavour(f); if (f !== 'pizza_party') setPizzaMenu([]) }}
      className={[
        'flex-1 py-2 rounded-lg text-xs font-body transition-all border',
        flavour === f
          ? 'bg-gold/15 border-gold/50 text-gold'
          : 'bg-white/5 border-white/10 text-ivory-dim hover:border-white/20',
      ].join(' ')}
    >
      {f === 'pizza_party' ? 'Pizza Party' : 'Regular'}
    </button>
  ))}
</div>
```

- [ ] **Step 4: Replace location text input with Places search**

Replace the location `<input>` with:
```tsx
{/* Location */}
<div className="flex flex-col gap-1.5">
  <label className="text-xs font-body text-ivory-dim uppercase tracking-wider">Location</label>
  <button
    type="button"
    onClick={() => setShowLocationModal(true)}
    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-left text-sm font-body transition-colors hover:border-white/20"
  >
    {venue ? (
      <span className="text-ivory">{venue}</span>
    ) : (
      <span className="text-ivory-dim/40">Search for a place...</span>
    )}
  </button>
  {address && <p className="text-[11px] text-ivory-dim/60 font-body px-1">{address}</p>}
  {lat && lng && (
    <img
      src={buildStaticMapUrl(lat, lng, { width: 400, height: 160 })}
      alt="Map"
      className="w-full h-24 object-cover rounded-lg mt-1"
    />
  )}
</div>
```

- [ ] **Step 5: Conditionally show pizza menu OR cocktail menu**

Wrap the existing cocktail menu section in `{flavour !== 'pizza_party' && ( ... )}`.

Below it, add:
```tsx
{flavour === 'pizza_party' && (
  <PizzaMenuBuilder pizzas={pizzaMenu} onChange={setPizzaMenu} />
)}
```

- [ ] **Step 6: Add LocationSearchModal at bottom of JSX**

Before the closing fragment:
```tsx
<LocationSearchModal
  isOpen={showLocationModal}
  onClose={() => setShowLocationModal(false)}
  onSelect={handleLocationSelect}
/>
```

- [ ] **Step 7: Verify it compiles**

Run: `npx tsc -b`
Expected: PASS

- [ ] **Step 8: Commit**
```bash
git add src/pages/GatheringNew.tsx
git commit -m "feat: gathering form with pizza party flavour, pizza menu builder, location upgrade"
```

### Task 6: Update GatheringDetail with pizza menu display + map

**Files:**
- Modify: `src/pages/GatheringDetail.tsx`

- [ ] **Step 1: Read the current file fully**

Read `src/pages/GatheringDetail.tsx`.

- [ ] **Step 2: Add imports**

```typescript
import { PizzaSvg } from '@/lib/pizzaSvg'
import { TOPPING_REGISTRY } from '@/lib/pizzaSvg'
import { buildStaticMapUrl } from '@/export/templates/shared/utils'
```

- [ ] **Step 3: Add static map below location display**

After the location display line (with MapPin icon), add:
```tsx
{meta.lat && meta.lng && (
  <a
    href={`https://www.google.com/maps/dir/?api=1&destination=${meta.lat},${meta.lng}`}
    target="_blank"
    rel="noopener noreferrer"
    className="block rounded-lg overflow-hidden mt-2"
  >
    <img
      src={buildStaticMapUrl(meta.lat, meta.lng, { width: 400, height: 160 })}
      alt="Map"
      className="w-full h-28 object-cover"
    />
  </a>
)}
{meta.address && (
  <p className="text-[11px] text-ivory-dim/60 font-body mt-1">{meta.address}</p>
)}
```

- [ ] **Step 4: Add pizza menu section (conditional on flavour)**

Before the cocktail menu section, add:
```tsx
{meta.flavour === 'pizza_party' && meta.pizza_menu && meta.pizza_menu.length > 0 && (
  <motion.div variants={staggerItem} className="flex flex-col gap-3">
    <h3 className="text-[10px] font-body text-ivory-dim uppercase tracking-widest">The Menu</h3>
    {meta.pizza_menu.map((pizza, i) => (
      <div key={i} className="flex items-center gap-3 bg-white/5 rounded-xl p-3">
        <PizzaSvg toppings={pizza.toppings} size={64} seed={pizza.name || `p-${i}`} />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gold font-display">{pizza.name}</p>
          <p className="text-[10px] text-ivory-dim/60 font-body mt-0.5">
            {pizza.toppings.map(t => TOPPING_REGISTRY[t]?.label ?? t).join(' · ')}
          </p>
        </div>
      </div>
    ))}
  </motion.div>
)}
```

- [ ] **Step 5: Hide cocktail menu when pizza party**

Wrap the existing cocktail menu section in:
```tsx
{meta.flavour !== 'pizza_party' && meta.cocktail_menu && meta.cocktail_menu.length > 0 && (
  ...existing cocktail rendering...
)}
```

- [ ] **Step 6: Reset unseen count on mount (for creator)**

Add effect after existing data loading (needs `gent` from auth store):
```typescript
useEffect(() => {
  if (!id || !entry || !gent) return
  if (entry.created_by !== gent.id) return
  const meta = entry.metadata as Record<string, unknown>
  if (meta?.rsvp_unseen_count && (meta.rsvp_unseen_count as number) > 0) {
    updateGatheringMetadata(id, { rsvp_unseen_count: 0 }).catch(() => {})
  }
}, [id, entry, gent])
```

- [ ] **Step 7: Verify it compiles**

Run: `npx tsc -b`
Expected: PASS

- [ ] **Step 8: Commit**
```bash
git add src/pages/GatheringDetail.tsx
git commit -m "feat: pizza menu display, static map, unseen count reset on GatheringDetail"
```

- [ ] **Chunk 2 Checkpoint: Run /simplify**

---

## Chunk 3: Studio Templates (4 pizza party templates)

### Task 7: Create PizzaPartyCarta template (La Carta)

**Files:**
- Create: `src/export/templates/PizzaPartyCarta.tsx`

- [ ] **Step 1: Create the menu card template**

Reference `GatheringInviteCard.tsx` for structure. This template uses cream/parchment background, NOT dark. 1080x1920.

```tsx
import { forwardRef } from 'react'
import { BrandMark } from './shared/BrandMark'
import { PizzaSvg, TOPPING_REGISTRY } from '@/lib/pizzaSvg'
import { buildStaticMapUrl } from './shared/utils'
import type { EntryWithParticipants, GatheringMetadata } from '@/types/app'

const ROOT: React.CSSProperties = {
  width: 1080,
  height: 1920,
  position: 'relative',
  overflow: 'hidden',
  background: 'linear-gradient(180deg, #F5F0E1 0%, #EDE5D0 100%)',
  fontFamily: 'Playfair Display, serif',
  display: 'flex',
  flexDirection: 'column',
  padding: 80,
}

const ACCENT = '#D4843A'

export const PizzaPartyCarta = forwardRef<HTMLDivElement, { entry: EntryWithParticipants }>(
  function PizzaPartyCarta({ entry }, ref) {
    const meta = entry.metadata as GatheringMetadata
    const pizzas = meta.pizza_menu ?? []
    const visible = pizzas.slice(0, 6)
    const overflow = pizzas.length - 6

    return (
      <div ref={ref} style={ROOT}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{ fontSize: 18, letterSpacing: 8, color: ACCENT, textTransform: 'uppercase', fontFamily: 'Instrument Sans, sans-serif', marginBottom: 16 }}>
            {entry.title || 'Pizza Night'}
          </div>
          <div style={{ fontSize: 64, color: '#1a1a1a', lineHeight: 1 }}>LA CARTA</div>
          <div style={{ width: 80, height: 2, background: ACCENT, margin: '24px auto 0' }} />
        </div>

        {/* Pizza items */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 32 }}>
          {visible.map((pizza, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
              <PizzaSvg toppings={pizza.toppings} size={80} seed={pizza.name || `p-${i}`} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 28, color: '#1a1a1a' }}>{pizza.name}</div>
                <div style={{ fontSize: 16, color: '#8B7355', fontFamily: 'Instrument Sans, sans-serif', marginTop: 4 }}>
                  {pizza.toppings.map(t => TOPPING_REGISTRY[t]?.label ?? t).join(' · ')}
                </div>
              </div>
            </div>
          ))}
          {overflow > 0 && (
            <div style={{ fontSize: 16, color: '#8B7355', fontFamily: 'Instrument Sans, sans-serif', textAlign: 'center' }}>
              +{overflow} more
            </div>
          )}
        </div>

        {/* Footer: map + details */}
        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, paddingTop: 32 }}>
          {meta.lat && meta.lng && (
            <img
              src={buildStaticMapUrl(meta.lat, meta.lng, { width: 400, height: 160 })}
              alt="Map"
              style={{ width: '100%', height: 160, objectFit: 'cover', borderRadius: 12 }}
            />
          )}
          <div style={{ fontSize: 18, color: '#8B7355', fontFamily: 'Instrument Sans, sans-serif', textAlign: 'center' }}>
            {meta.venue ?? meta.location} · {meta.event_date}
          </div>
          <BrandMark size="sm" />
        </div>
      </div>
    )
  },
)
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc -b`
Expected: PASS

- [ ] **Step 3: Commit**
```bash
git add src/export/templates/PizzaPartyCarta.tsx
git commit -m "feat: La Carta pizza menu Studio template (1080x1920)"
```

### Task 8: Create PizzaPartyInvite template (The Invitation)

**Files:**
- Create: `src/export/templates/PizzaPartyInvite.tsx`

- [ ] **Step 1: Create the invite template**

Dark background, warm orange accent. 1080x1920. Uses BackgroundLayer + InsetFrame.

```tsx
import { forwardRef } from 'react'
import { BackgroundLayer } from './shared/BackgroundLayer'
import { InsetFrame } from './shared/InsetFrame'
import { BrandMark } from './shared/BrandMark'
import { buildStaticMapUrl } from './shared/utils'
import type { EntryWithParticipants, GatheringMetadata } from '@/types/app'

const ROOT: React.CSSProperties = {
  width: 1080,
  height: 1920,
  position: 'relative',
  overflow: 'hidden',
  background: '#0a0a0f',
  fontFamily: 'Playfair Display, serif',
}

const ACCENT = '#D4843A'

export const PizzaPartyInvite = forwardRef<HTMLDivElement, { entry: EntryWithParticipants; backgroundUrl?: string }>(
  function PizzaPartyInvite({ entry, backgroundUrl }, ref) {
    const meta = entry.metadata as GatheringMetadata

    return (
      <div ref={ref} style={ROOT}>
        <BackgroundLayer url={backgroundUrl} />
        <InsetFrame />

        <div style={{ position: 'relative', zIndex: 5, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: '100%', padding: 80 }}>
          {/* Top label */}
          <div style={{ position: 'absolute', top: 80, left: 0, right: 0, textAlign: 'center' }}>
            <div style={{ fontSize: 16, letterSpacing: 10, color: ACCENT, textTransform: 'uppercase', fontFamily: 'Instrument Sans, sans-serif' }}>
              You're Invited
            </div>
          </div>

          {/* Main content */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24, textAlign: 'center' }}>
            <div style={{ fontSize: 56, color: '#f5f0e8', lineHeight: 1.1, textShadow: '0 2px 20px rgba(0,0,0,0.8)' }}>
              {entry.title || 'Pizza Night'}
            </div>
            {meta.venue && (
              <div style={{ fontSize: 22, color: ACCENT, fontFamily: 'Instrument Sans, sans-serif' }}>
                at {meta.venue}
              </div>
            )}
            <div style={{ width: 60, height: 2, background: ACCENT }} />
            <div style={{ fontSize: 20, color: '#f5f0e8', fontFamily: 'Instrument Sans, sans-serif', opacity: 0.8 }}>
              {meta.event_date}
            </div>
            {meta.address && (
              <div style={{ fontSize: 16, color: '#f5f0e8', fontFamily: 'Instrument Sans, sans-serif', opacity: 0.5 }}>
                {meta.address}
              </div>
            )}

            {/* Mini map */}
            {meta.lat && meta.lng && (
              <img
                src={buildStaticMapUrl(meta.lat, meta.lng, { width: 360, height: 140 })}
                alt="Map"
                style={{ width: 360, height: 140, objectFit: 'cover', borderRadius: 12, marginTop: 16, border: `1px solid ${ACCENT}33` }}
              />
            )}

            <div style={{ marginTop: 16 }}>
              <BrandMark size="sm" />
            </div>
          </div>
        </div>
      </div>
    )
  },
)
```

- [ ] **Step 2: Verify + Commit**

Run: `npx tsc -b`

```bash
git add src/export/templates/PizzaPartyInvite.tsx
git commit -m "feat: The Invitation pizza party Studio template (1080x1920)"
```

### Task 9: Create PizzaPartyForno template (Il Forno)

**Files:**
- Create: `src/export/templates/PizzaPartyForno.tsx`

- [ ] **Step 1: Create the hero pizza template**

Dark background, one large procedural pizza as centrepiece. 1080x1920.

```tsx
import { forwardRef } from 'react'
import { BrandMark } from './shared/BrandMark'
import { PizzaSvg } from '@/lib/pizzaSvg'
import type { EntryWithParticipants, GatheringMetadata } from '@/types/app'

const ROOT: React.CSSProperties = {
  width: 1080,
  height: 1920,
  position: 'relative',
  overflow: 'hidden',
  background: 'radial-gradient(ellipse at 50% 40%, #1a1510 0%, #0a0a0f 70%)',
  fontFamily: 'Playfair Display, serif',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
}

const ACCENT = '#D4843A'

export const PizzaPartyForno = forwardRef<HTMLDivElement, { entry: EntryWithParticipants }>(
  function PizzaPartyForno({ entry }, ref) {
    const meta = entry.metadata as GatheringMetadata
    const heroPizza = meta.pizza_menu?.[0]

    return (
      <div ref={ref} style={ROOT}>
        {/* Hero pizza */}
        <div style={{ marginBottom: 48 }}>
          <PizzaSvg
            toppings={heroPizza?.toppings ?? ['mozzarella', 'basil', 'tomato']}
            size={400}
            seed={heroPizza?.name ?? entry.title ?? 'forno'}
          />
        </div>

        {/* Minimal text */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, textAlign: 'center', padding: '0 80px' }}>
          <div style={{ width: 60, height: 2, background: ACCENT }} />
          <div style={{ fontSize: 48, color: '#f5f0e8', lineHeight: 1.1, textShadow: '0 2px 20px rgba(0,0,0,0.8)' }}>
            {entry.title || 'Pizza Night'}
          </div>
          <div style={{ fontSize: 18, color: ACCENT, fontFamily: 'Instrument Sans, sans-serif' }}>
            {meta.event_date} · {meta.venue ?? meta.location}
          </div>
          <div style={{ marginTop: 24 }}>
            <BrandMark size="sm" />
          </div>
        </div>
      </div>
    )
  },
)
```

- [ ] **Step 2: Verify + Commit**

Run: `npx tsc -b`

```bash
git add src/export/templates/PizzaPartyForno.tsx
git commit -m "feat: Il Forno hero pizza Studio template (1080x1920)"
```

### Task 10: Create PizzaPartyCountdown template (Slice & Dice)

**Files:**
- Create: `src/export/templates/PizzaPartyCountdown.tsx`

- [ ] **Step 1: Create the countdown template**

```tsx
import { forwardRef } from 'react'
import { BrandMark } from './shared/BrandMark'
import type { EntryWithParticipants, GatheringMetadata } from '@/types/app'

const ROOT: React.CSSProperties = {
  width: 1080,
  height: 1920,
  position: 'relative',
  overflow: 'hidden',
  background: 'linear-gradient(180deg, #0a0a0f 0%, #1a1510 100%)',
  fontFamily: 'Playfair Display, serif',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 80,
}

const ACCENT = '#D4843A'

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr + 'T00:00:00')
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return Math.ceil((target.getTime() - now.getTime()) / 86400000)
}

export const PizzaPartyCountdown = forwardRef<HTMLDivElement, { entry: EntryWithParticipants }>(
  function PizzaPartyCountdown({ entry }, ref) {
    const meta = entry.metadata as GatheringMetadata
    const days = daysUntil(meta.event_date)
    const pizzas = meta.pizza_menu ?? []

    const countDisplay = days === 0 ? 'TODAY' : days < 0 ? 'PAST' : String(days)
    const subtitle = days === 0 ? '' : days < 0 ? '' : days === 1 ? 'DAY' : 'DAYS'

    return (
      <div ref={ref} style={ROOT}>
        {/* Label */}
        <div style={{ fontSize: 16, letterSpacing: 10, color: ACCENT, textTransform: 'uppercase', fontFamily: 'Instrument Sans, sans-serif', marginBottom: 32 }}>
          Incoming
        </div>

        {/* Giant count */}
        <div style={{ fontSize: 180, color: '#f5f0e8', lineHeight: 1, fontWeight: 700 }}>
          {countDisplay}
        </div>
        {subtitle && (
          <div style={{ fontSize: 36, color: '#f5f0e8', letterSpacing: 8, opacity: 0.6, marginTop: 8 }}>
            {subtitle}
          </div>
        )}

        {/* Event name */}
        <div style={{ fontSize: 24, color: ACCENT, fontFamily: 'Instrument Sans, sans-serif', marginTop: 40, textAlign: 'center' }}>
          until pizza night at {meta.venue ?? meta.location}
        </div>

        {/* Pizza name pills */}
        {pizzas.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginTop: 32, maxWidth: 800 }}>
            {pizzas.map((p, i) => (
              <span key={i} style={{
                padding: '8px 20px',
                borderRadius: 24,
                border: `1px solid ${ACCENT}66`,
                color: '#f5f0e8',
                fontSize: 16,
                fontFamily: 'Instrument Sans, sans-serif',
              }}>
                {p.name}
              </span>
            ))}
          </div>
        )}

        {/* Date + city */}
        <div style={{ fontSize: 16, color: '#f5f0e8', fontFamily: 'Instrument Sans, sans-serif', opacity: 0.5, marginTop: 40 }}>
          {meta.event_date} · {meta.venue ?? meta.location}
        </div>

        <div style={{ marginTop: 32 }}>
          <BrandMark size="sm" />
        </div>
      </div>
    )
  },
)
```

- [ ] **Step 2: Verify + Commit**

Run: `npx tsc -b`

```bash
git add src/export/templates/PizzaPartyCountdown.tsx
git commit -m "feat: Slice & Dice countdown Studio template (1080x1920)"
```

### Task 11: Register all 4 templates in Studio.tsx

**Files:**
- Modify: `src/pages/Studio.tsx:55-76,128-132,361-365`

- [ ] **Step 1: Read Studio.tsx for exact current state**

Read lines 55-76 (TemplateId), 128-132 (TEMPLATES_BY_TYPE gathering), 361-365 (TemplateRenderer).

- [ ] **Step 2: Extend TemplateId union**

Add to the `TemplateId` union type (after `gathering_recap`):
```typescript
  | 'pizza_party_carta'
  | 'pizza_party_invite'
  | 'pizza_party_forno'
  | 'pizza_party_countdown'
```

- [ ] **Step 3: Add to TEMPLATES_BY_TYPE**

In the `gathering` array, add after `gathering_recap`:
```typescript
  { id: 'pizza_party_carta',     label: 'La Carta',      dims: '1080×1920', bgAspect: '9:16', requiresFlavour: 'pizza_party' },
  { id: 'pizza_party_invite',    label: 'The Invitation', dims: '1080×1920', bgAspect: '9:16', requiresFlavour: 'pizza_party' },
  { id: 'pizza_party_forno',     label: 'Il Forno',      dims: '1080×1920', bgAspect: '9:16', requiresFlavour: 'pizza_party' },
  { id: 'pizza_party_countdown', label: 'Slice & Dice',  dims: '1080×1920', bgAspect: '9:16', requiresFlavour: 'pizza_party' },
```

- [ ] **Step 4: Add import and TemplateRenderer cases**

Import at top of Studio.tsx:
```typescript
import { PizzaPartyCarta } from '@/export/templates/PizzaPartyCarta'
import { PizzaPartyInvite } from '@/export/templates/PizzaPartyInvite'
import { PizzaPartyForno } from '@/export/templates/PizzaPartyForno'
import { PizzaPartyCountdown } from '@/export/templates/PizzaPartyCountdown'
```

Add switch cases in `TemplateRenderer` (after `gathering_recap`):
```typescript
case 'pizza_party_carta':
  return <PizzaPartyCarta ref={innerRef} entry={entry} />
case 'pizza_party_invite':
  return <PizzaPartyInvite ref={innerRef} entry={entry} backgroundUrl={backgroundUrl} />
case 'pizza_party_forno':
  return <PizzaPartyForno ref={innerRef} entry={entry} />
case 'pizza_party_countdown':
  return <PizzaPartyCountdown ref={innerRef} entry={entry} />
```

- [ ] **Step 5: Verify it compiles**

Run: `npx tsc -b`
Expected: PASS

- [ ] **Step 6: Commit**
```bash
git add src/pages/Studio.tsx
git commit -m "feat: register 4 pizza party templates in Studio (1080x1920)"
```

- [ ] **Chunk 3 Checkpoint: Run /simplify**

---

## Chunk 4: Public Invite Page + OG Meta

### Task 12: Pizza party skin on PublicInvite

**Files:**
- Modify: `src/pages/public/PublicInvite.tsx`

- [ ] **Step 1: Read the current file fully**

Read `src/pages/public/PublicInvite.tsx`.

- [ ] **Step 2: Add imports**

```typescript
import { PizzaSvg, TOPPING_REGISTRY } from '@/lib/pizzaSvg'
import { buildStaticMapUrl } from '@/export/templates/shared/utils'
```

- [ ] **Step 3: Detect pizza party flavour**

After metadata extraction at the top of the component:
```typescript
const isPizzaParty = (metadata as Record<string, unknown>)?.flavour === 'pizza_party'
const pizzaMenu = isPizzaParty ? ((metadata as Record<string, unknown>)?.pizza_menu as Array<{ name: string; toppings: string[] }>) ?? [] : []
const lat = (metadata as Record<string, unknown>)?.lat as number | undefined
const lng = (metadata as Record<string, unknown>)?.lng as number | undefined
const venue = (metadata as Record<string, unknown>)?.venue as string | undefined
const address = (metadata as Record<string, unknown>)?.address as string | undefined
```

- [ ] **Step 4: Apply warm gradient for pizza party**

On the outermost container, conditionally apply background:
```tsx
style={{ background: isPizzaParty ? 'linear-gradient(180deg, #0a0a0f 0%, #1a1510 60%, #0a0a0f 100%)' : undefined }}
```

- [ ] **Step 5: Add pizza menu section after event details**

After date/location display, before RSVP form:
```tsx
{/* Pizza menu */}
{isPizzaParty && pizzaMenu.length > 0 && (
  <div className="flex flex-col gap-3 mt-6">
    <h3 className="text-xs font-body text-[#D4843A] uppercase tracking-widest text-center">The Menu</h3>
    {pizzaMenu.map((pizza, i) => (
      <div key={i} className="flex items-center gap-3 bg-white/5 rounded-xl p-3">
        <PizzaSvg toppings={pizza.toppings} size={48} seed={pizza.name || `p-${i}`} />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-ivory font-display">{pizza.name}</p>
          <p className="text-[10px] text-ivory-dim/60 font-body mt-0.5">
            {pizza.toppings.map(t => TOPPING_REGISTRY[t]?.label ?? t).join(' · ')}
          </p>
        </div>
      </div>
    ))}
  </div>
)}
```

- [ ] **Step 6: Add tappable map section**

After pizza menu (or after location display if not pizza party):
```tsx
{/* Map */}
{lat && lng && (
  <a
    href={`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`}
    target="_blank"
    rel="noopener noreferrer"
    className="block rounded-lg overflow-hidden mt-4"
  >
    <img
      src={buildStaticMapUrl(lat, lng, { width: 400, height: 160 })}
      alt="Map"
      className="w-full h-28 object-cover"
    />
  </a>
)}
{venue && <p className="text-xs text-ivory-dim/60 font-body mt-1 text-center">{venue}{address ? ` · ${address}` : ''}</p>}
```

- [ ] **Step 7: Hide email field for pizza party**

Wrap the email input in:
```tsx
{!isPizzaParty && (
  ...existing email input...
)}
```

- [ ] **Step 8: Verify + Commit**

Run: `npx tsc -b`

```bash
git add src/pages/public/PublicInvite.tsx
git commit -m "feat: pizza party skin on public invite page with menu, map, no email"
```

### Task 13: Vercel Edge Middleware for OG meta tags

**Files:**
- Create: `middleware.ts` (project root)

- [ ] **Step 1: Create middleware**

```typescript
import { next } from '@vercel/edge'

const BOT_PATTERNS = /facebookexternalhit|Viber|WhatsApp|Twitterbot|LinkedInBot|Slackbot|TelegramBot|Discordbot|Googlebot/i

const SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
const APP_URL = 'https://the-codex-sepia.vercel.app'

export default async function middleware(request: Request) {
  const ua = request.headers.get('user-agent') ?? ''
  if (!BOT_PATTERNS.test(ua)) return next()

  const url = new URL(request.url)
  const slug = url.pathname.split('/g/')[1]?.split('/')[0]
  if (!slug) return next()

  let title = 'The Gents Chronicles'
  let description = 'You are invited'
  let image = `${APP_URL}/logo-gold.webp`

  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/entries?id=eq.${slug}&select=title,metadata,cover_image_url`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
      },
    )
    if (res.ok) {
      const [entry] = await res.json()
      if (entry) {
        const meta = entry.metadata ?? {}
        title = entry.title ?? title
        if (meta.venue) title += ` at ${meta.venue}`
        if (meta.event_date) description = meta.event_date
        if (meta.flavour === 'pizza_party' && meta.pizza_menu?.length) {
          description += ` · ${meta.pizza_menu.length} pizzas on the menu`
        }
        if (entry.cover_image_url) image = entry.cover_image_url
      }
    }
  } catch {
    // fall through to defaults
  }

  const html = `<!DOCTYPE html>
<html><head>
<meta property="og:title" content="${escapeHtml(title)}" />
<meta property="og:description" content="${escapeHtml(description)}" />
<meta property="og:image" content="${escapeHtml(image)}" />
<meta property="og:type" content="website" />
<meta property="og:url" content="${APP_URL}${url.pathname}" />
</head><body></body></html>`

  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
}

export const config = {
  matcher: '/g/:slug*',
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
```

- [ ] **Step 2: Check if Vercel middleware needs any config**

Read `vercel.json` or `vite.config.ts` to ensure middleware is picked up. Vercel auto-detects `middleware.ts` at root for Edge Middleware. For a Vite SPA (not Next.js), we may need a Vercel rewrite config instead. If so, use `vercel.json`:

```json
{
  "rewrites": [{ "source": "/g/:slug*", "destination": "/g/:slug*" }]
}
```

Note: This needs verification during implementation — if Vercel Edge Middleware doesn't work with a plain Vite SPA, fall back to an API route at `api/og.ts` that returns HTML for bot UAs, and point a rewrite to it.

- [ ] **Step 3: Add RLS policy for anon access to gathering entries**

Create migration `supabase/migrations/XXXXXX_anon_gathering_access.sql`:
```sql
-- Allow anon to read gathering entries by ID (for OG meta + public invite)
CREATE POLICY "anon can read gathering entries by id"
  ON public.entries FOR SELECT TO anon
  USING (status IN ('gathering_pre', 'gathering_post'));
```

- [ ] **Step 4: Commit**
```bash
git add middleware.ts supabase/migrations/
git commit -m "feat: Vercel Edge Middleware for OG meta tags on /g/ routes"
```

- [ ] **Chunk 4 Checkpoint: Run /simplify**

---

## Chunk 5: Push Notifications + RSVP Enhancements

### Task 14: Push subscription infrastructure

**Files:**
- Create: `supabase/migrations/XXXXXX_push_subscriptions.sql`
- Create: `public/sw-push.js`
- Create: `src/lib/pushSubscription.ts`

- [ ] **Step 1: Create push subscriptions migration**

```sql
CREATE TABLE public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gent_id uuid NOT NULL REFERENCES public.gents(id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(gent_id, endpoint)
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gents can manage own push subscriptions"
  ON public.push_subscriptions FOR ALL TO authenticated
  USING (gent_id = auth.uid())
  WITH CHECK (gent_id = auth.uid());
```

- [ ] **Step 2: Create notification-only service worker**

Create `public/sw-push.js`:
```javascript
// Notification-only service worker.
// Does NOT intercept fetch — avoids the Supabase caching deadlock.
self.addEventListener('push', (e) => {
  const data = e.data ? e.data.json() : {}
  e.waitUntil(
    self.registration.showNotification(data.title || 'The Gents Chronicles', {
      body: data.body || '',
      icon: '/logo-gold.webp',
      badge: '/logo-gold.webp',
      data: { url: data.url || '/' },
    })
  )
})

self.addEventListener('notificationclick', (e) => {
  e.notification.close()
  const url = e.notification.data?.url || '/'
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(url) && 'focus' in client) return client.focus()
      }
      return clients.openWindow(url)
    })
  )
})
```

- [ ] **Step 3: Create push subscription helpers**

Create `src/lib/pushSubscription.ts`:
```typescript
import { supabase } from '@/lib/supabase'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY ?? ''

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  return Uint8Array.from(raw, (c) => c.charCodeAt(0))
}

export async function subscribeToPush(gentId: string): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false
  if (!VAPID_PUBLIC_KEY) return false

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return false

  const registration = await navigator.serviceWorker.register('/sw-push.js', { scope: '/' })
  await navigator.serviceWorker.ready

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
  })

  const json = subscription.toJSON()
  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      gent_id: gentId,
      endpoint: json.endpoint!,
      p256dh: json.keys!.p256dh,
      auth: json.keys!.auth,
    },
    { onConflict: 'gent_id,endpoint' },
  )

  return !error
}

export async function unsubscribeFromPush(gentId: string): Promise<void> {
  if (!('serviceWorker' in navigator)) return

  const registration = await navigator.serviceWorker.getRegistration('/')
  if (registration) {
    const subscription = await registration.pushManager.getSubscription()
    if (subscription) {
      await subscription.unsubscribe()
      const endpoint = subscription.endpoint
      await supabase.from('push_subscriptions').delete().eq('gent_id', gentId).eq('endpoint', endpoint)
    }
  }
}

export async function isPushSubscribed(): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false
  const registration = await navigator.serviceWorker.getRegistration('/')
  if (!registration) return false
  const subscription = await registration.pushManager.getSubscription()
  return !!subscription
}
```

- [ ] **Step 4: Verify + Commit**

Run: `npx tsc -b`

```bash
git add supabase/migrations/ public/sw-push.js src/lib/pushSubscription.ts
git commit -m "feat: push notification infrastructure (SW, subscriptions table, helpers)"
```

### Task 15: Update submit-rsvp edge function (push + Circle auto-add + unseen count)

**Files:**
- Modify: `supabase/functions/submit-rsvp/index.ts`

- [ ] **Step 1: Read the current file**

Read `supabase/functions/submit-rsvp/index.ts`.

- [ ] **Step 2: Rewrite with Circle auto-add, push notification, unseen count**

Replace entire file with:

```typescript
import { createClient } from 'npm:@supabase/supabase-js'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { entry_id, name, email, response } = await req.json()

    if (!entry_id || !name) {
      return new Response(JSON.stringify({ error: 'entry_id and name are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const validResponses = ['attending', 'not_attending', 'maybe']
    if (!validResponses.includes(response)) {
      return new Response(JSON.stringify({ error: 'Invalid response value' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // Insert RSVP
    const { data, error } = await supabase
      .from('gathering_rsvps')
      .insert({ entry_id, name, email: email ?? null, response })
      .select('id')
      .single()

    if (error) throw error

    // Fire-and-forget: Circle auto-add, push notification, unseen count
    const bgWork = async () => {
      // Fetch entry for creator ID and metadata
      const { data: entry } = await supabase
        .from('entries')
        .select('created_by, title, metadata')
        .eq('id', entry_id)
        .single()

      if (!entry) return
      const creatorId = entry.created_by

      // Increment unseen count
      const meta = (entry.metadata ?? {}) as Record<string, unknown>
      const unseenCount = ((meta.rsvp_unseen_count as number) ?? 0) + 1
      await supabase
        .from('entries')
        .update({ metadata: { ...meta, rsvp_unseen_count: unseenCount } })
        .eq('id', entry_id)

      // Circle auto-add for attending guests
      if (response === 'attending') {
        try {
          // Check for existing person with same name from same creator
          const { data: existing } = await supabase
            .from('people')
            .select('id')
            .eq('added_by', creatorId)
            .ilike('name', name)
            .limit(1)

          let personId: string

          if (existing && existing.length > 0) {
            personId = existing[0].id
          } else {
            // Create new POI contact
            const { data: newPerson } = await supabase
              .from('people')
              .insert({ name, category: 'poi', added_by: creatorId })
              .select('id')
              .single()

            if (!newPerson) return
            personId = newPerson.id

            // Link to creator gent
            await supabase
              .from('person_gents')
              .insert({ person_id: personId, gent_id: creatorId })
          }

          // Add appearance for this gathering
          await supabase
            .from('person_appearances')
            .upsert(
              { entry_id, person_id: personId, added_by: creatorId },
              { onConflict: 'entry_id,person_id' },
            )
        } catch (e) {
          console.error('Circle auto-add failed:', e)
        }
      }

      // Push notification to creator
      try {
        const { data: subs } = await supabase
          .from('push_subscriptions')
          .select('endpoint, p256dh, auth')
          .eq('gent_id', creatorId)

        if (subs && subs.length > 0) {
          const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')
          const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')

          if (vapidPrivateKey && vapidPublicKey) {
            const bodyText = response === 'attending'
              ? `${name} is attending!`
              : response === 'maybe'
                ? `${name} might come`
                : `${name} can't make it`

            const payload = JSON.stringify({
              title: entry.title ?? 'Gathering',
              body: bodyText,
              url: `/gathering/${entry_id}`,
            })

            // Send web push to each subscription
            for (const sub of subs) {
              try {
                await sendWebPush(sub.endpoint, sub.p256dh, sub.auth, payload, vapidPublicKey, vapidPrivateKey)
              } catch (pushErr) {
                // If subscription is expired (410 Gone), remove it
                if (pushErr instanceof Response && pushErr.status === 410) {
                  await supabase
                    .from('push_subscriptions')
                    .delete()
                    .eq('endpoint', sub.endpoint)
                }
              }
            }
          }
        }
      } catch (e) {
        console.error('Push notification failed:', e)
      }
    }

    // Don't await background work — RSVP response is immediate
    bgWork().catch(e => console.error('Background RSVP work failed:', e))

    return new Response(JSON.stringify({ success: true, id: data.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

// Minimal Web Push implementation using Web Crypto
// Note: For a production implementation, consider using a web-push library.
// This is a simplified version that may need the `web-push` npm package instead.
async function sendWebPush(
  endpoint: string,
  p256dh: string,
  auth: string,
  payload: string,
  vapidPublicKey: string,
  vapidPrivateKey: string,
): Promise<Response> {
  // Web Push requires VAPID JWT + encrypted payload
  // For Deno, the simplest approach is the `web-push` npm package:
  // import webpush from 'npm:web-push'
  // webpush.setVapidDetails('mailto:...',  vapidPublicKey, vapidPrivateKey)
  // await webpush.sendNotification({ endpoint, keys: { p256dh, auth } }, payload)
  //
  // Implementation note for the implementing agent:
  // Use `import webpush from 'npm:web-push'` in Deno.
  // Call webpush.setVapidDetails once, then webpush.sendNotification per sub.
  // If web-push doesn't work in Deno, fall back to raw fetch with VAPID JWT.

  // Placeholder — implementing agent should replace with actual web-push call
  const webpush = await import('npm:web-push')
  webpush.default.setVapidDetails(
    'mailto:noreply@the-codex-sepia.vercel.app',
    vapidPublicKey,
    vapidPrivateKey,
  )
  return await webpush.default.sendNotification(
    { endpoint, keys: { p256dh, auth } },
    payload,
  )
}
```

- [ ] **Step 3: Commit**
```bash
git add supabase/functions/submit-rsvp/index.ts
git commit -m "feat: submit-rsvp with Circle auto-add, push notifications, unseen count"
```

### Task 16: RSVP badge on EntryCard + attending count

**Files:**
- Modify: `src/components/chronicle/EntryCard.tsx`

- [ ] **Step 1: Read EntryCard.tsx**

Read the file to understand how entry cards render.

- [ ] **Step 2: Add RSVP badge and attending count for gathering cards**

After reading the file, add:

1. Import needed: check how `gent` is accessed (likely from auth store).
2. For gathering-type entries, extract metadata:
```typescript
const isGathering = entry.type === 'gathering'
const gatheringMeta = isGathering ? (entry.metadata as Record<string, unknown>) : null
const unseenCount = (gatheringMeta?.rsvp_unseen_count as number) ?? 0
const isCreator = gent?.id === entry.created_by
```

3. Add an RSVP attending count line below the title/date (visible to all):
```tsx
{isGathering && (
  <p className="text-[10px] text-gold/70 font-body mt-0.5">
    {/* Attending count will be derived — for now show phase */}
    {(gatheringMeta?.phase as string) === 'pre' ? 'Upcoming gathering' : 'Past gathering'}
  </p>
)}
```

4. Add unseen badge (visible only to creator when count > 0):
```tsx
{isGathering && isCreator && unseenCount > 0 && (
  <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-gold flex items-center justify-center text-[10px] font-body text-obsidian font-bold">
    {unseenCount > 9 ? '9+' : unseenCount}
  </span>
)}
```

- [ ] **Step 3: Verify + Commit**

Run: `npx tsc -b`

```bash
git add src/components/chronicle/EntryCard.tsx
git commit -m "feat: RSVP unseen badge + gathering label on EntryCard"
```

### Task 17: Push notification toggle on Profile + subscribe prompt on GatheringDetail

**Files:**
- Modify: `src/pages/Profile.tsx`
- Modify: `src/pages/GatheringDetail.tsx`

- [ ] **Step 1: Add push toggle to Profile page**

Read `src/pages/Profile.tsx` to find where Comfort Mode toggle is (the spec says push toggle goes near it).

Add:
```typescript
import { subscribeToPush, unsubscribeFromPush, isPushSubscribed } from '@/lib/pushSubscription'

// In the component:
const [pushEnabled, setPushEnabled] = useState(false)

useEffect(() => {
  isPushSubscribed().then(setPushEnabled).catch(() => {})
}, [])

async function togglePush() {
  if (!gent) return
  if (pushEnabled) {
    await unsubscribeFromPush(gent.id)
    setPushEnabled(false)
  } else {
    const ok = await subscribeToPush(gent.id)
    setPushEnabled(ok)
  }
}
```

Add toggle UI near the comfort mode toggle:
```tsx
<div className="flex items-center justify-between py-3">
  <div className="flex items-center gap-3">
    <Bell size={16} className="text-gold" />
    <span className="text-sm font-body text-ivory">Push Notifications</span>
  </div>
  <button
    type="button"
    onClick={togglePush}
    className={`w-10 h-6 rounded-full transition-colors ${pushEnabled ? 'bg-gold' : 'bg-white/10'}`}
  >
    <div className={`w-4 h-4 rounded-full bg-white transition-transform mx-1 ${pushEnabled ? 'translate-x-4' : ''}`} />
  </button>
</div>
```

- [ ] **Step 2: Add push subscribe prompt on GatheringDetail**

In `GatheringDetail.tsx`, when the creator views their pre-event gathering and push is not yet subscribed, show a subtle prompt:

```typescript
import { subscribeToPush, isPushSubscribed } from '@/lib/pushSubscription'

// In component:
const [pushPromptShown, setPushPromptShown] = useState(false)
const [pushSubscribing, setPushSubscribing] = useState(false)

useEffect(() => {
  if (!entry || !gent || entry.created_by !== gent.id) return
  isPushSubscribed().then(subscribed => {
    if (!subscribed) setPushPromptShown(true)
  }).catch(() => {})
}, [entry, gent])

async function handleEnablePush() {
  if (!gent) return
  setPushSubscribing(true)
  const ok = await subscribeToPush(gent.id)
  setPushSubscribing(false)
  if (ok) {
    setPushPromptShown(false)
    addToast('Push notifications enabled', 'success')
  }
}
```

UI — a gold banner at the top of the detail view:
```tsx
{pushPromptShown && (
  <div className="flex items-center justify-between bg-gold/10 border border-gold/20 rounded-xl px-4 py-3 mb-4">
    <span className="text-xs text-ivory font-body">Get notified when guests RSVP?</span>
    <button
      type="button"
      onClick={handleEnablePush}
      disabled={pushSubscribing}
      className="text-xs text-gold font-body font-semibold"
    >
      {pushSubscribing ? 'Enabling...' : 'Enable'}
    </button>
  </div>
)}
```

- [ ] **Step 3: Verify + Commit**

Run: `npx tsc -b`

```bash
git add src/pages/Profile.tsx src/pages/GatheringDetail.tsx
git commit -m "feat: push notification toggle on Profile + subscribe prompt on GatheringDetail"
```

- [ ] **Chunk 5 Checkpoint: Run /simplify**

---

## Chunk 6: Final Integration + VAPID Setup

### Task 18: Generate VAPID keys and document setup

**Files:**
- Modify: `.env.example`

- [ ] **Step 1: Document VAPID key setup in .env.example**

Add to `.env.example`:
```
# Web Push (VAPID keys) — generate with: npx web-push generate-vapid-keys
VITE_VAPID_PUBLIC_KEY=
# VAPID_PRIVATE_KEY goes in Supabase secrets, NOT in .env
```

- [ ] **Step 2: Generate VAPID keys**

Run: `npx web-push generate-vapid-keys`

Save public key to `.env` as `VITE_VAPID_PUBLIC_KEY`.
Save private key to Supabase secrets:
```bash
npx supabase secrets set VAPID_PRIVATE_KEY=<private_key> VAPID_PUBLIC_KEY=<public_key>
```

Also add to GitHub Actions secrets for deploy: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`.

- [ ] **Step 3: Commit .env.example**
```bash
git add .env.example
git commit -m "docs: add VAPID key env vars to .env.example"
```

### Task 19: Full integration test + type check

- [ ] **Step 1: Full type check**

Run: `npx tsc -b`
Expected: PASS with zero errors.

- [ ] **Step 2: Build check**

Run: `npx vite build`
Expected: PASS — all imports resolve, no missing modules.

- [ ] **Step 3: Visual smoke test checklist**

Manually verify in browser:
1. Go to `/gathering/new` — flavour toggle visible, switching shows/hides pizza menu builder
2. Add 3 pizzas with toppings — SVG pizzas render correctly with toppings
3. Search and select a location — address + mini map appear
4. Submit — gathering created with correct metadata
5. View gathering detail — pizza menu + map visible, cocktail menu hidden
6. Open Studio → select gathering → pizza party templates appear (1080x1920 preview)
7. Export "La Carta" — correct 1080x1920 image with pizza SVGs
8. Open public invite link `/g/{id}` — pizza themed, menu visible, map tappable, no email field
9. Submit RSVP as "attending" — check Circle for new POI contact
10. Check EntryCard in Chronicle — unseen badge appears for creator

- [ ] **Step 4: Final commit with any fixups**
```bash
git add -A
git commit -m "fix: integration fixups for pizza party gathering"
```

- [ ] **Step 5: Push and verify deployment**
```bash
git push
gh run list --limit 1
# Wait for completion
gh run view <id> --json status,conclusion
```
Expected: `{ "conclusion": "success", "status": "completed" }`
