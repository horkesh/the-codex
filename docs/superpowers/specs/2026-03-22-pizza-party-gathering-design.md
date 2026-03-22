# Pizza Party Gathering Flavour — Design Spec

**Date**: 2026-03-22
**Status**: Review

## Overview

Add a `pizza_party` flavour to gatherings, following the established Night Out flavour pattern. Includes a pizza menu builder with tap-to-select ingredients, procedural SVG pizza illustrations, four 1080x1920 Studio export templates, an enhanced public invite page with pizza theme, and upgraded location handling with Google Maps for all gatherings.

## Data Model

### GatheringMetadata additions

All stored in the existing JSONB `metadata` column — no DB migration needed.

```typescript
export interface PizzaMenuItem {
  name: string        // custom name, e.g. "Keys' Special"
  toppings: string[]  // from fixed registry, e.g. ["mozzarella", "basil", "tomato"]
}

export interface GatheringMetadata {
  // ... existing fields unchanged ...
  flavour?: 'pizza_party'       // undefined = regular gathering
  pizza_menu?: PizzaMenuItem[]  // only when flavour is pizza_party

  // New for ALL gatherings (location upgrade)
  venue?: string                // place name, e.g. "Keys' Place"
  address?: string              // full street address
  lat?: number
  lng?: number
}
```

Existing fields (`location`, `cocktail_menu`, `guest_list`, etc.) remain unchanged. `location` stays as a display fallback / backwards compat for old gatherings.

### Topping Registry

Fixed set of ~18-20 common pizza toppings. Each topping maps to an SVG visual definition (shape + colour). No free text topping entry — users select from the grid only.

```typescript
// src/lib/pizzaSvg.ts
const TOPPING_REGISTRY: Record<string, { shape: ToppingShape; color: string; label: string }> = {
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
  nduja:       { shape: 'blob',     color: '#CC4422', label: "Nduja" },
  artichoke:   { shape: 'leaf',     color: '#8FBC8F', label: 'Artichoke' },
  anchovy:     { shape: 'strip',    color: '#8B7355', label: 'Anchovy' },
  egg:         { shape: 'circle',   color: '#FFEFD5', label: 'Egg' },
}
```

## Gathering Form Changes (GatheringNew.tsx)

### Flavour selector

Gold pill toggle at the top of the form, same pattern as Night Out:

```
[ Regular ]  [ Pizza Party ]
```

- Default: Regular (no flavour set)
- Pizza Party: sets `flavour: 'pizza_party'` in metadata

### Pizza menu builder (visible when Pizza Party selected)

Replaces the cocktail menu field. Each pizza is a card:

- **Pizza name**: free text input (custom names like "Keys' Special")
- **Topping grid**: all ~18-20 toppings displayed as tappable pills. Tap to toggle. Selected = gold fill, unselected = dim outline. No typing.
- **Remove**: X button to delete the whole pizza
- **Add pizza**: button below the list to add a new empty pizza card

Max ~8 pizzas (practical limit for templates).

### Location upgrade (ALL gatherings, not just pizza)

Replace the plain text location field with Google Places search:

- Tap "Search for a place..." opens `LocationSearchModal` (existing component from Momento)
- `LocationSearchModal.onSelect` returns a `LocationFill` which has `location` (place name), `city`, `country`, `country_code`, `lat`, `lng`. It does NOT have `address`.
- **Extracting the address**: Extend the modal's internal `handleSelect` to also capture `formattedAddress` from the Google Places detail response, and pass it through via a new optional `address` field on `LocationFill`. This is a minimal change — the address is already available in the Places API response, just not mapped.
- After selection, the gathering form maps: `LocationFill.location` → `venue`, `LocationFill.address` → `address`, plus `lat`, `lng`, `city`, `country` directly.
- After selection, form shows: venue name (large), full address (dim), static map preview
- Mini map: Google Static Maps API, dark style, gold marker, ~zoom 15
- Existing `location` field auto-populated from venue name for backwards compat

**LocationFill extension** (in `src/lib/geo.ts`):
```typescript
export interface LocationFill {
  // ... existing fields ...
  address?: string  // NEW: full street address from Google Places formattedAddress
}
```

This is backwards-compatible — `address` is optional. Existing consumers (Momento, EntryNew) ignore it.

Static map URL pattern:
```
https://maps.googleapis.com/maps/api/staticmap?
  center={lat},{lng}&zoom=15&size=600x300&scale=2
  &style=...dark_theme_params...
  &markers=color:0xC9A84C|{lat},{lng}
  &key={VITE_GOOGLE_MAPS_API_KEY}
```

**API key exposure note**: The Static Maps `<img>` URL exposes the API key in HTML source. The key must be restricted by HTTP referrer in Google Cloud Console (both the app domain and `localhost` for dev). This is already the expected setup per `.env.example`.

## Procedural Pizza SVG (src/lib/pizzaSvg.ts)

Pure SVG React component. Two sizes:

- **Small** (~80px): per-item illustrations on menu card and public invite page
- **Large** (~400px): hero element on Il Forno template

### Construction

1. **Crust**: outer circle with golden-brown gradient ring
2. **Sauce**: inner circle, red (#C41E3A) fill
3. **Cheese**: subtle cream layer with slight noise texture
4. **Toppings**: scattered within pizza radius using deterministic positioning (seeded from pizza name hash so same pizza always looks the same). Each topping type renders its registered shape at randomised positions, avoiding overlaps via simple grid-based placement.

### Component API

```typescript
interface PizzaSvgProps {
  toppings: string[]
  size: number        // diameter in px
  seed?: string       // pizza name, for deterministic layout
  className?: string
}

export function PizzaSvg({ toppings, size, seed, className }: PizzaSvgProps)
```

## Studio Export Templates

All 4 templates: **1080x1920** (9:16 portrait, full HD). Registered with `requiresFlavour: 'pizza_party'`. Warm accent colour: `#D4843A` (brick oven orange).

### Template 1 — "La Carta" (pizza_party_carta)

Menu card with procedural pizza illustrations.

- Cream/parchment background (like passport templates)
- "LA CARTA" header, elegant serif typography
- Each pizza: small SVG pizza (~80px) left-aligned, name + topping pills to the right
- Max 6 visible, "+N more" if overflow
- Bottom: mini static map + venue name + date
- BrandMark footer

### Template 2 — "The Invitation" (pizza_party_invite)

Classic event invite.

- Dark background with optional cover photo + gradient overlay
- "YOU'RE INVITED" header
- Event title large, centred
- Date + venue + address
- "Hosted by [gent alias]"
- Mini static map
- Warm orange accent (`#D4843A`) instead of standard gold
- BrandMark footer

### Template 3 — "Il Forno" (pizza_party_forno)

Bold hero visual.

- Dark background
- One large procedural pizza (~400px) as centrepiece, rendered from first menu item
- Minimal text below: event title, date, venue + city
- BrandMark footer
- No map — pure visual impact

### Template 4 — "Slice & Dice" (pizza_party_countdown)

Countdown hype card.

- Dark background, warm accent
- "INCOMING" label
- Giant day count (180px Playfair Display)
- "DAYS" subtitle
- "until pizza night at [venue]"
- Pizza names as horizontal pills/tags
- Date + city at bottom
- BrandMark footer
- Countdown computed from `event_date` in metadata

### Template dimensions note

These templates are 1080x1920 (9:16) instead of the standard 1080x1350 (4:5). The template registry `dims` field and export logic must respect per-template dimensions. The `exportToPng` function already works with any element size — no changes needed there. The `previewContainerHeight()` function in Studio.tsx already parses `dims` dynamically, so the preview container adjusts automatically.

### Template registration

The `TemplateId` union type in Studio.tsx must be extended with all four new IDs: `pizza_party_carta`, `pizza_party_invite`, `pizza_party_forno`, `pizza_party_countdown`. Each registered in `TEMPLATES_BY_TYPE.gathering` with `requiresFlavour: 'pizza_party'` and `dims: '1080x1920'`.

The `TemplateRenderer` switch statement needs four new cases. Each template component uses `forwardRef` with a fixed root `style={{ width: 1080, height: 1920 }}`.

### Countdown edge case

Template 4 (Slice & Dice) computes days from `event_date`. If the event is today, show "TODAY" instead of "0 DAYS". If the event is past, the template is still available but shows "PAST" in dim text — the user may still want to export a recap-style version.

## Gathering Detail Changes (GatheringDetail.tsx)

### All gatherings (location upgrade)
- When `lat`/`lng` are present: show a tappable static mini map below the location text, linking to Google Maps directions
- Existing location text display unchanged

### Pizza party flavour
- **Pizza menu section** appears after event details, before cocktails/RSVP:
  - "The Menu" subheader (same dossier styling as other sections)
  - Each pizza as a card: name in gold, topping pills below, small procedural SVG pizza (~64px) to the left
  - Same `PizzaSvg` component, same topping pills styling as the form
- **Cocktail menu** section hidden (not relevant for pizza party)
- All other sections unchanged: countdown, RSVP list, guest list, guestbook, share/QR

### Menu field coexistence rule
- When `flavour === 'pizza_party'`: `cocktail_menu` is set to `[]` on submit, `pizza_menu` is populated
- When flavour is Regular (undefined): `pizza_menu` is set to `undefined` on submit, `cocktail_menu` is populated
- Switching flavour in the form clears the other menu's data
- The two menus are **mutually exclusive** — a gathering has either cocktails or pizzas, never both

## Public Invite Page — Pizza Party Skin

**File**: `src/pages/public/PublicInvite.tsx`

When `metadata.flavour === 'pizza_party'`, the page renders a themed variant:

### Visual changes
- Warm gradient background (dark → subtle brick orange tint)
- Title rendered large with warm accent colour

### Pizza menu section (new)
- "The Menu" subheader
- Each pizza as a card: name bold, topping pills below, small procedural SVG pizza (~48px) beside each
- Same `PizzaSvg` component used in Studio templates

### Location section (new, all gatherings with lat/lng)
- Static mini map (dark style, gold marker)
- Tappable: opens `https://www.google.com/maps/dir/?api=1&destination={lat},{lng}` for directions
- Venue name + full address displayed below

### RSVP form changes
- Email field hidden when `flavour === 'pizza_party'`
- Name + response buttons remain unchanged
- Same `submit-rsvp` edge function (email already optional in schema)

### Guestbook link
- Unchanged, still shown at bottom

## OG Meta Tags (Viber Link Previews)

For Viber link preview cards when the `/g/{entryId}` URL is pasted in chat.

**Problem**: This is a client-rendered SPA — Viber/WhatsApp/iMessage crawlers do not execute JavaScript, so React-injected `<meta>` tags are invisible to them.

**Solution**: **Vercel Edge Middleware** (`middleware.ts` at project root).

How it works:
1. Middleware intercepts requests to `/g/:slug`
2. Checks `User-Agent` for known bot patterns (`facebookexternalhit`, `Viber`, `WhatsApp`, `Twitterbot`, `LinkedInBot`, `Slackbot`, etc.)
3. For bots: fetches entry metadata from Supabase (using anon key + public RLS), returns a minimal HTML response with OG tags:
```html
<!DOCTYPE html>
<html>
<head>
  <meta property="og:title" content="Pizza Night at Keys' Place" />
  <meta property="og:description" content="22/03/2026 · 6 pizzas on the menu" />
  <meta property="og:image" content="{cover_image_url or fallback}" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://the-codex-sepia.vercel.app/g/{slug}" />
</head>
<body></body>
</html>
```
4. For real users: passes through to the SPA normally (`NextResponse.next()` equivalent for Vercel Edge)

**Why Vercel Middleware over Supabase Edge Function**: No domain routing issues (middleware runs on the same Vercel domain), no need for URL rewrites, simpler than a separate function. Vercel Edge Middleware runs at the CDN edge with near-zero latency for bot detection.

**OG image**: Uses `cover_image_url` if present, otherwise a static fallback image (e.g. `public/og-default.png` — dark card with The Gents logo). For pizza party gatherings, the description includes pizza count: "6 pizzas on the menu".

**Supabase query in middleware**: Uses the anon key (public, safe to embed) with the existing public RLS policy on entries (`pinned+shared+published` — gathering entries with status `gathering_pre`/`gathering_post` need an RLS policy addition for anon SELECT on entries accessed by ID via the `/g/` route). If the query fails, returns generic OG tags with just the app name.


## Files to Create/Modify (updated)

### New files
- `src/lib/pizzaSvg.tsx` — procedural pizza SVG component + topping registry
- `src/components/gathering/PizzaMenuBuilder.tsx` — form component for pizza menu
- `src/export/templates/PizzaPartyCarta.tsx` — Template 1 (La Carta)
- `src/export/templates/PizzaPartyInvite.tsx` — Template 2 (The Invitation)
- `src/export/templates/PizzaPartyForno.tsx` — Template 3 (Il Forno)
- `src/export/templates/PizzaPartyCountdown.tsx` — Template 4 (Slice & Dice)
- `middleware.ts` — Vercel Edge Middleware for OG meta tags on `/g/:slug` bot requests

### Modified files
- `src/types/app.ts` — add `PizzaMenuItem`, extend `GatheringMetadata`
- `src/lib/geo.ts` — add optional `address` field to `LocationFill`
- `src/components/places/LocationSearchModal.tsx` — capture `formattedAddress` from Places API, pass through as `address`
- `src/pages/GatheringNew.tsx` — flavour selector, pizza menu builder, location upgrade via LocationSearchModal
- `src/pages/GatheringDetail.tsx` — show pizza menu section, show map, hide cocktails for pizza flavour
- `src/pages/public/PublicInvite.tsx` — pizza party skin, map, hide email for pizza flavour
- `src/pages/Studio.tsx` — extend `TemplateId` union, register 4 new templates in `TEMPLATES_BY_TYPE`, add `TemplateRenderer` cases
- `src/export/templates/shared/utils.ts` — `buildStaticMapUrl(lat, lng, zoom?, size?)` helper

## RSVP → Circle Auto-Add

When a guest RSVPs with status `attending`, they are automatically added to the Circle as a POI contact, linked to the gathering creator.

### Flow
1. Guest submits RSVP via public invite page (name + "Attending")
2. The `submit-rsvp` edge function (after inserting the RSVP row) also:
   - Creates a `people` row: `name` from RSVP, `category: 'poi'`, `added_by: entry.created_by`
   - Creates a `person_gents` row linking the new person to the gathering creator
   - Creates a `person_appearances` row linking the person to the gathering entry
3. Only for `attending` response — `maybe` and `not_attending` do not trigger auto-add
4. **Duplicate check**: before creating, query `people` for an exact name match (case-insensitive) where `added_by` matches the creator. If found, skip creation but still add the appearance.

### Edge function changes (`submit-rsvp`)
- Needs entry lookup to get `created_by` (the gathering creator's gent ID)
- Uses service role key (already does) for writes to `people`, `person_gents`, `person_appearances`
- Auto-add is fire-and-forget — RSVP succeeds even if Circle add fails

### Modified files addition
- `supabase/functions/submit-rsvp/index.ts` — add auto-Circle logic for attending RSVPs

## RSVP Notifications

Three notification channels for the gathering creator:

### 1. Push notifications (web push via minimal service worker)

**Service worker** (`public/sw-push.js`): notification-only, zero fetch interception. Does NOT cache anything — avoids the deadlock that caused VitePWA removal. Literally only listens for `push` and `notificationclick` events.

```js
// public/sw-push.js
self.addEventListener('push', (e) => {
  const data = e.data?.json() ?? {}
  e.waitUntil(
    self.registration.showNotification(data.title ?? 'The Gents Chronicles', {
      body: data.body,
      icon: '/logo-gold.webp',
      data: { url: data.url },
    })
  )
})

self.addEventListener('notificationclick', (e) => {
  e.notification.close()
  e.waitUntil(clients.openWindow(e.notification.data?.url ?? '/'))
})
```

**VAPID keys**: generated once via `web-push generate-vapid-keys`. Public key in `VITE_VAPID_PUBLIC_KEY` env var (client-side). Private key in Supabase secrets as `VAPID_PRIVATE_KEY`.

**DB table** (new migration):
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
-- RLS: authenticated can SELECT/INSERT/DELETE their own
```

**Subscribe flow**:
- `src/lib/pushSubscription.ts`: `subscribeToPush(gentId)` — checks permission, registers SW, subscribes via `pushManager.subscribe()`, upserts to `push_subscriptions` table
- Called from GatheringDetail when creator views their gathering (one-time prompt, persisted)
- Also accessible from Profile page as a toggle

**Trigger**: `submit-rsvp` edge function, after inserting RSVP row (and after Circle auto-add), fetches creator's push subscriptions and sends web push notification:
- Title: gathering title (e.g. "Pizza Night")
- Body: "{name} is attending!" / "{name} might come" / "{name} can't make it"
- URL: `/gathering/{entryId}`
- Uses `web-push` npm package in Deno edge function (or raw Web Push protocol via fetch)

**Failure handling**: push send is fire-and-forget. If endpoint returns 410 Gone (subscription expired), delete the subscription row.

### 2. In-app notification badge

- `entry.metadata.rsvp_unseen_count`: incremented by `submit-rsvp` edge function on each RSVP insert
- Reset to 0 when creator opens GatheringDetail (via `updateGatheringMetadata` on mount)
- EntryCard in Chronicle feed shows a gold badge with the unseen count (e.g. "3") on gathering cards where `rsvp_unseen_count > 0`
- Only visible to the gathering creator (`entry.created_by === gent.id`)

### 3. RSVP count on Chronicle EntryCard

- All gathering EntryCards show an RSVP summary below the title: "{N} attending" in gold text
- Computed from `gathering_rsvps` table — fetched alongside entries in `useChronicle` or lazy-loaded per gathering card
- Visible to all gents, not just the creator

### Modified files addition
- `public/sw-push.js` — notification-only service worker (NEW)
- `src/lib/pushSubscription.ts` — subscribe/unsubscribe helpers (NEW)
- `supabase/migrations/XXXXXX_push_subscriptions.sql` — push subscriptions table (NEW)
- `supabase/functions/submit-rsvp/index.ts` — send web push + increment unseen count
- `src/pages/GatheringDetail.tsx` — trigger push subscribe prompt, reset unseen count on mount
- `src/components/chronicle/EntryCard.tsx` — RSVP badge + attending count for gathering cards
- `src/pages/Profile.tsx` — push notification toggle

## Agenda: Upcoming Gatherings

Pre-event gatherings (`phase: 'pre'`) surface on the Agenda page as a third sub-section: **"Upcoming"**.

### Agenda landing page
Add a third card to `SUB_SECTIONS` in `Agenda.tsx`:
```
{ id: 'upcoming', label: 'Upcoming', subtitle: 'Gatherings on the calendar', path: '/agenda/upcoming' }
```

### Upcoming page (`src/pages/UpcomingGatherings.tsx`)
- Fetches all entries with `type: 'gathering'` and `status: 'gathering_pre'`, sorted by `metadata.event_date` ascending (soonest first)
- Each card shows: title, countdown badge, venue, pizza menu count (if pizza party), RSVP attending count
- Tapping a card navigates to `/gathering/{id}`
- Empty state: "No upcoming gatherings"
- Route: `/agenda/upcoming` (protected)

### Modified files
- `src/pages/Agenda.tsx` — add Upcoming sub-section card
- `src/pages/UpcomingGatherings.tsx` — new page (CREATE)
- `src/App.tsx` — add route for `/agenda/upcoming`

## Out of Scope

- Pizza ordering/voting by guests
- Dietary tags or allergen labels
- Price per pizza
- Changes to regular (non-pizza) gathering templates
- Changes to guestbook functionality
- New DB migrations
- Pizza-party-specific lore generation directives (lore works fine with the generic gathering directive)
