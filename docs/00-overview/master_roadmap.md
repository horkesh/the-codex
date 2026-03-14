# The Codex — Master Roadmap
_Single source of truth for everything not yet built. Updated: 2026-03-13._

---

## How to read this document

Every feature is graded:
- **P0** — Core gap; the app feels incomplete without it
- **P1** — High value; meaningfully improves daily use
- **P2** — Compelling; builds on what's there
- **P3** — Ambitious / long-term

Each section notes the data model changes needed, the edge functions required, and the rough implementation path.

---

## Part 1 — Carry-Forward (Known Gaps from Audit)

These were designed and documented but never built.

### 1.1 Entry Editing `P0`
**What:** `/chronicle/:id/edit` — every entry type needs a form pre-populated with existing data, same layout as creation, patches the `entries` row on save.
**Why missing:** The create flow was built first; edit was deprioritised once data was stable.
**Implementation:** Reuse the per-type form components with an `entry` prop that seeds initial state. Single `PATCH` call via `updateEntry(id, fields)`. No new schema. No new edge functions.

### 1.2 Studio: Missing Templates `P0`
Three templates documented in `studio_export.md` but absent from `Studio.tsx`:

| Template | Format | What it needs |
|---|---|---|
| **Passport Page** | 1080×1350 | Mission stamps + lore + photo strip, passport-book styling |
| **Gathering Recap Carousel** | 1080×1350 per slide | Cover → Lore → Photos → Guest messages |
| **Annual Wrapped Carousel** | 1080×1350 per slide | Year stats → missions → per-gent → Claude lore → close |

Annual Wrapped already has a Ledger section and an edge function; it just needs a Studio template component and an entry in `TEMPLATES_BY_TYPE`.

### 1.3 Portrait Integration `P1`
**What:** A "Generate Portrait" button in Profile. Calls `generate-portrait` edge function (already deployed), stores the result in the `portraits` storage bucket, displays it on the Calling Card and in Profile.
**Implementation:** Add a button to the Profile page. The edge function already exists. Plumb the result URL into `gent.portrait_url` column (add migration if column doesn't exist).

### 1.4 Scene Generation `P1`
**What:** On Mission and Night Out detail pages, a "Generate Scene" button that uses the entry's participants' portrait descriptions plus location to create a contextual scene image via Imagen 4. Stored and attached to the entry.
**Implementation:** New edge function `generate-scene`. Takes `entry_id`, fetches participant portrait descriptions and entry metadata, composes an Imagen prompt, returns URL. Add `scene_url` column to `entries`.

---

## Part 2 — Instagram Intelligence `P1`

### 2.1 Scouting: Possible Upcoming Events

Drop an Instagram post URL or venue profile URL. The system extracts and prepares a structured "Prospect" — a possible future event that the gents might attend.

**The technical reality of Instagram access:**
- Instagram has no public API for profiles or event data.
- What is accessible without auth: OG meta tags (title, description, thumbnail) from any public page, plus the post caption via oEmbed for public posts.
- An Edge Function fetches the page server-side (no CORS issue), extracts OG tags + visible text, and passes everything to Claude for structured extraction.
- Private accounts: inaccessible programmatically. Not applicable here (venues are public).
- Reliability: Instagram actively changes its HTML. This approach is best-effort; if scraping fails, the user gets a manual entry form pre-populated with whatever was recovered.

**Data model — new table: `prospects`**
```sql
prospects (
  id uuid primary key,
  created_by uuid references gents,
  source_url text,                  -- original Instagram URL
  source_thumbnail_url text,        -- OG image extracted
  venue_name text,
  location text,
  city text,
  country text,
  event_date date,                  -- null if not determinable
  estimated_price text,             -- "€20 cover", "free before midnight"
  vibe text,                        -- Claude's one-line assessment
  dress_code text,
  notes text,                       -- Claude's full extraction
  status text default 'prospect',  -- prospect | passed | converted
  converted_entry_id uuid references entries,  -- set when turned into a gathering
  created_at timestamptz default now()
)
```

**New edge function: `analyze-instagram`**
1. Receive `url` from client.
2. Fetch the page HTML (Deno `fetch` — no CORS restriction server-side).
3. Extract: OG `og:title`, `og:description`, `og:image`, visible text content from the caption div (Instagram post pages embed the caption in JSON-LD `description`).
4. Pass extracted text + image URL to Claude: "Extract event details from this Instagram post. Return JSON: venue_name, location, city, country, event_date (ISO if determinable, null if not), estimated_price, dress_code, vibe (one sentence), confidence (0–1)."
5. Return structured JSON to client.

**UI — new section: "Prospects" or "On the Radar"**
- Accessible from Chronicle or as its own tab section.
- Card shows: scraped thumbnail, venue name, city, date (or "date TBC"), vibe line, price, status pill.
- Actions: "Convert to Gathering" (pre-populates gathering creation form), "Pass", "Archive".
- A Prospect that becomes a Gathering keeps the `converted_entry_id` link — so you can track the pipeline from scouting to execution.

**Manual fallback:**
If the scrape fails or the URL is a profile (not a post), the form drops to manual entry with the thumbnail and any recovered text pre-filled. The gent fills in the rest.

---

## Part 3 — Circle: Persons of Interest `P1`

### 3.1 The Concept

A subcategory within Circle for people not yet met but "on the radar." Separate from the main People list (people the gents have actually encountered). Think: the interesting stranger at the bar, a recommended contact, someone whose work caught your eye, a potential collaborator.

**Data model — extend `people` with a `category` column:**
```sql
ALTER TABLE people ADD COLUMN category text default 'contact'
  CHECK (category IN ('contact', 'person_of_interest'));
```

A `person_of_interest` row has all the same columns as `contact`, plus:
```sql
ALTER TABLE people ADD COLUMN poi_source_url text;        -- Instagram handle/URL
ALTER TABLE people ADD COLUMN poi_intel text;             -- Claude's profile analysis
ALTER TABLE people ADD COLUMN poi_source_gent uuid references gents;  -- who scouted them
ALTER TABLE people ADD COLUMN poi_visibility text default 'private'
  CHECK (poi_visibility IN ('private', 'circle'));         -- who can see this POI
```

### 3.2 Public Profile Flow

User pastes an Instagram profile URL (e.g., `https://instagram.com/username`).

**Edge function `analyze-instagram`** (same function as Scouting, different mode):
1. Fetch the profile page HTML.
2. Extract from OG tags and JSON-LD: display name, bio, location mention, website, follower count (if embedded in page JSON).
3. Extract profile picture URL from OG image.
4. Pass to Claude: "This is an Instagram profile. Extract: full_name, username, bio, apparent_location, apparent_interests, vibe (one paragraph), suggested_approach (one sentence), notable_details."
5. Return structured card.

Result: A POI card with portrait photo, name, bio, Claude's vibe read, and suggested approach. The creating gent adds their own context: how they know of this person, why they're interesting.

### 3.3 Private Profile — The Gent Screenshot Method

This is the honest answer. A private profile cannot be accessed programmatically under any circumstance without the account holder's auth token. The workaround:

**The gent who follows the private account takes a screenshot of the profile from their Instagram app and uploads it to The Codex.**

What Claude Vision can extract from a profile screenshot:
- Display name and username (text in the screenshot)
- Profile photo (cropped from the image)
- Bio text
- Post count, follower count, following count (visible on the screen)
- Location tag (if set)
- Story highlight labels (visible as circles)
- A row of recent post thumbnails (visible in the grid)

This is substantial. Claude Vision reads the screenshot and returns the same structured JSON as the public flow.

**Privacy model for private POIs:**
- `poi_source_gent` = the gent who uploaded the screenshot (they have access via following)
- `poi_visibility = 'private'` by default — only the source gent sees the intel
- Source gent can toggle to `'circle'` to share the card with the other gents
- The rationale: if the profile is private, only the person who legitimately follows them should expose that intel to the group. It's their call.
- Private notes on a POI follow the same RLS pattern as existing `people_notes`.

**UI for private upload:**
When the user indicates the profile is private (or the scrape returns a "private account" signal from the OG tags), the UI prompts: "This account is private. If you follow them, take a screenshot of their profile and upload it." File upload → Claude Vision analysis → same card output.

### 3.4 POI → Contact Conversion

When a Gent finally meets a POI:
- "Convert to Contact" button on the POI card.
- The row's `category` changes from `person_of_interest` to `contact`.
- The `poi_intel`, `poi_source_url`, `poi_source_gent` fields are preserved as history.
- The first entry linking this person is auto-suggested if possible.
- A private note is auto-created: "Converted from Person of Interest — originally scouted [date]."

---

## Part 4 — Passport: Stories `P1`

### 4.1 The Concept

The Passport currently has three layers: stamps (per-city), achievements (milestones), and the stamp book view. This is one-dimensional — every stamp maps to a single mission.

The new layer: **Stories** — curated collections of any entries, any types, spanning any time period. A Story is a chapter in the larger narrative.

Examples:
- "The Great Balkan Circuit" — a Mission entry + 4 Night Out entries + 2 Steak entries from the same trip, told as one arc
- "The Whisky Project" — 18 Toast entries across 2 years, collected into one tasting narrative
- "Season One of The Pitch" — all PS5 sessions from a particular period, with aggregate scoreboard
- "Budapest, Always" — every Budapest entry ever logged, across multiple trips, as one love letter to the city

This cannot be done with the current stamp system because stamps are 1:1 with missions. Stories are M:N with entries.

### 4.2 Data Model

```sql
CREATE TABLE stories (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subtitle text,
  cover_url text,
  lore text,                        -- Claude-generated narrative arc
  created_by uuid references gents,
  entry_ids uuid[],                 -- ordered list of linked entry IDs
  status text default 'draft' CHECK (status IN ('draft', 'published')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Computed/derived fields (not stored, queried on read):
-- date_range: min/max of linked entries' date field
-- places: unique locations across linked entries
-- gents_involved: union of participants across linked entries
-- aggregate_stats: total nights, countries, steaks, etc.
```

**No junction table needed** — `entry_ids uuid[]` is sufficient for a 3-person app. Ordering is preserved by array position.

### 4.3 Story Architecture

Each Story has:
- **Cover** — user-selected from photos across the linked entries, or AI-generated
- **Arc** — Claude-generated narrative that reads all linked entries' lore and synthesises a chapter-level story. Prompt: "Here are [N] chronicle entries spanning [date range] across [places]. Write a chapter narrative in the voice of The Gents Chronicles — cinematic, personal, third-person. 200–300 words."
- **Timeline of Moments** — chronological list of all linked entries with their dates, types, and lore previews
- **Places** — deduplicated list of all locations across linked entries; displayed as a mini-itinerary
- **The Numbers** — aggregate stats: total days, countries, cities, people encountered, steaks rated, etc.
- **A Story Stamp** — a unique bespoke stamp generated for this story (Gemini, circular, represents the theme)

### 4.4 Passport Page Redesign

The Passport gains a fourth tab: **Stories**.

```
[Stamps] [Stories] [Achievements]
```

**Stories tab:**
- Grid of story cards (cover photo, title, date range, entry count)
- Tap → Story detail page: arc narrative, timeline of moments, places, numbers
- "Add Story" flow: search/select entries → give it a title → generate arc → publish
- Export: each Story exports as a multi-slide carousel via Studio (the Passport Page template evolves to support Story mode)

### 4.5 Moments Within a Story

Each linked entry appears in the Story as a **Moment** — a collapsed card showing:
- Entry type badge
- Date
- Location
- Lore excerpt (2 lines)
- One photo thumbnail

Tapping a Moment opens the full entry detail. The Story doesn't replace the entry; it curates it.

---

## Part 5 — Live Whereabouts `P1`

### 5.1 The Concept

A live map on the Chronicle dashboard showing which gents are currently active and where, if they've chosen to share their location. Ephemeral — nothing is stored. The moment a gent closes the app or stops sharing, their pin disappears.

**Use cases:**
- "Are the others out tonight? Where?"
- "Someone's in the same city — should we link up?"
- Adds a real-time social layer without becoming a surveillance tool.

### 5.2 Architecture

**Supabase Realtime Broadcast channels** — no database persistence. Gent A publishes their location to a private broadcast channel (`whereabouts`); Gent B and C subscribe and see it. When Gent A closes the app, no more broadcasts — the pin goes stale and disappears client-side after 5 minutes with no update.

```typescript
// Broadcasting
const channel = supabase.channel('whereabouts')
channel.send({
  type: 'broadcast',
  event: 'location',
  payload: {
    gent_id: currentGent.id,
    lat: coords.latitude,
    lng: coords.longitude,
    neighborhood: reverseGeocoded,  // "Shoreditch, London"
    shared_at: Date.now(),
    expires_at: Date.now() + (shareHours * 3600 * 1000)
  }
})
```

**Client-side state:** A Zustand `whereaboutsStore` holds a map of `gent_id → last location payload`. A 5-minute staleness check runs on an interval; stale entries are removed. The map re-renders reactively.

**Reverse geocoding:** Nominatim (already used in Saved Places). Resolve to neighborhood + city, not street address.

### 5.3 UI — Dashboard Widget

A new section on the Chronicle dashboard (above the entry feed, below the TopBar):

```
┌─────────────────────────────────────────────┐
│  Whereabouts                    [Share Mine] │
│  ──────────────────────────────────────────  │
│  [Map: dark Mapbox tiles, 200px tall]        │
│  Avatar pins at gent locations               │
│  ──────────────────────────────────────────  │
│  Omar · Shoreditch, London · 4 min ago       │
│  Emir · Offline                              │
└─────────────────────────────────────────────┘
```

- **Map:** Mapbox GL JS with the `mapbox-dark-v11` style (or Mapbox Streets with a dark override). Avatar pins instead of default markers — circular cropped gent photo.
- **Share Mine button:** Triggers browser Geolocation API. Asks: "Share for: 1h / 4h / Until I stop." Sets a timer; when expired, stops broadcasting and clears the pin.
- **Offline indicator:** If a gent hasn't broadcast in 5 min, they appear as "Offline" in the list — pin removed from map.
- **Privacy:** Opt-in, per session, with explicit timer. No location is ever written to the database. No location history.

### 5.4 Manual Status (Complement to Live Location)

For gents who don't want to share precise location but want to signal what they're doing:

```sql
ALTER TABLE gents ADD COLUMN status text;  -- "Out tonight · Mayfair", "On a mission · Sarajevo", "In the office"
ALTER TABLE gents ADD COLUMN status_expires_at timestamptz;
```

Gent sets a short status string + expiry. Displayed next to their avatar in the dashboard widget and on their profile. Auto-clears at expiry. Not a location — just a vibe update. Works even when live location is off.

---

## Part 6 — Additional Features (New Ideas)

### 6.1 The Dossier: Chronicle Map `P1`
A world map showing every location the gents have visited across all entries. Color-coded by entry type. Pins cluster when zoomed out; tap a cluster → expand to individual entries. Tap a pin → entry detail. Shows the geographic footprint of the brotherhood.

**Tech:** Mapbox GL JS (same as Whereabouts). Data: `location`, `city`, `country`, `lat`, `lng` from entries. A GeoJSON feature per entry.

**Why it matters:** Seeing "we've logged 47 entries across 14 countries" as a map is viscerally more powerful than seeing it as a number in the Ledger.

### 6.2 The Verdict Board `P1`
Aggregate ratings for every venue and city visited. Pulls from Steak entries (explicit rating field), but extends to Night Outs and Toasts (which have a vibe/quality field in metadata).

**View:** Ranked lists. Best steakhouses (by rating). Best bars (by frequency + avg vibe). Best cities (by number of entries + gent consensus). Best countries overall.

**Export:** A "Verdict Card" template — "The Gents' Top 5 Steakhouses, 2026" as a Studio card.

### 6.3 The Almanac: This Day in History `P0`
On the Chronicle dashboard, above the feed: "Three years ago today, you logged your first mission. Budapest. The one that started it all."

**Implementation:** On page load, query entries where `date` matches today's month/day in any year. If found, surface the oldest one as an "Anniversary" banner. If it's a milestone year (1st, 2nd, 5th anniversary), generate a special throwback card automatically.

**Edge function:** `generate-throwback` — takes an old entry, writes a retrospective lore paragraph in present tense ("Three years on from that first mission...").

This is a P0 because it adds emotional texture to every daily open of the app with zero user effort.

### 6.4 The Correspondent: Weekly Digest `P2`
Every Monday at 08:00, an automated email to all three gents summarising the previous week:
- What was logged (entries with one-line lore preview)
- Upcoming gatherings with RSVP counts
- A fun stat ("This week: 3rd country visited this year")
- A throwback ("This time last year...")
- A Claude-written closing line

**Tech:** Supabase scheduled Edge Function (cron) + Resend (email delivery, 3,000 free emails/month).
**New edge function:** `send-weekly-digest` — queries last 7 days of entries, upcoming gatherings, runs stats comparison, calls Claude for the narrative, sends via Resend API.

### 6.5 Shared Bucket List `P2`
A collaborative wishlist. "Places we want to go. Things we want to do."

**Data model:**
```sql
CREATE TABLE bucket_list (
  id uuid primary key,
  title text not null,           -- "Tulum mission", "Hibachi dinner in Tokyo"
  category text,                 -- mission | night_out | steak | toast | gathering | other
  city text,
  country text,
  notes text,
  added_by uuid references gents,
  status text default 'open' CHECK (status IN ('open', 'done', 'passed')),
  converted_entry_id uuid references entries,  -- set when it happens
  created_at timestamptz default now()
);
```

When a new entry is logged, the system checks if any open bucket list items match (by city/title similarity). If so: "Did this complete your bucket list item: Tulum mission?" One tap → mark done, link entry.

### 6.6 The Rivalry Index `P2`
PS5 head-to-head stats taken to their logical extreme. Beyond the existing win records:
- Current win streaks (active + all-time longest)
- "Most decisive victory" (largest score gap)
- Rivalry arc graph (who's been dominant over time)
- Claude-generated trash talk: monthly auto-generated one-liner per pairing ("Omar's 6-match losing streak against Haris has now outlasted three seasons and a regime change.")

**Export:** A dedicated "Rivalry Card" Studio template — head-to-head record, streaks, the trash talk line.

### 6.7 The Sommelier: Spirits Library `P2`
Across all Toast entries, build a personal tasting library. Every spirit logged (field from Toast entry metadata) becomes an entry in The Sommelier.

**View:** Grouped by spirit type, then by country of origin. Each entry shows: name, distillery, dram size, score (if logged), the Toast entry it came from, lore excerpt.

**Stats:** Which gent has the broadest palate (most spirit categories). Which country features most. Highest-rated drams. Most adventurous session.

**Export:** "The Tasting Ledger" — a Studio card listing the top drams of the year.

### 6.8 Entry Reactions `P2`
Simple reactions that gents can leave on each other's entries. Not emoji — the brand aesthetic forbids it. Instead: custom symbols with meaning:

| Reaction | Symbol | Meaning |
|---|---|---|
| Legendary | ★ | This one for the books |
| Classic | · | Quintessentially us |
| Ruthless | ✦ | No mercy (PS5 contexts) |
| Noted | ◈ | Worth remembering |

Stored as a `reactions` table (entry_id, gent_id, reaction_type). Displayed as small indicators on entry cards in the feed. Max one reaction per gent per entry.

### 6.9 The Threshold System `P3`
Gamified milestones that unlock cosmetic rewards. Beyond the existing 10 achievements:

Examples:
- 5 missions → Unlocks "Veteran" passport stamp design variant
- 3 countries → Unlocks a new Studio template background palette
- 10 steaks rated → Unlocks "Connoisseur" badge on Steak Verdict export
- 5 Gatherings hosted → Unlocks an ornate "Host" seal on Invite Cards

Thresholds are checked server-side on entry publish (same as achievements). Rewards are purely cosmetic — variant styles for existing exports.

### 6.10 The Intelligence Layer: Gent Comparison `P3`
Side-by-side stat comparison between any two gents. Who's led more missions. Who's eaten more steaks. Who's visited more countries. Who's brought more people into the Circle. Visualised as clean bar comparisons (no charts — just numbers in the brand style). Exportable as a "The Rivalry" Studio card distinct from the PS5 rivalry card.

---

## Part 7 — Data Model Summary

All schema changes required across everything above:

```sql
-- Part 1 (existing tables, no new columns needed)
-- Entry edit: no schema change

-- Part 2: Prospects
CREATE TABLE prospects ( ... );  -- see section 2.1

-- Part 3: Persons of Interest (extends people)
ALTER TABLE people ADD COLUMN category text default 'contact';
ALTER TABLE people ADD COLUMN poi_source_url text;
ALTER TABLE people ADD COLUMN poi_intel text;
ALTER TABLE people ADD COLUMN poi_source_gent uuid references gents;
ALTER TABLE people ADD COLUMN poi_visibility text default 'private';

-- Part 4: Stories
CREATE TABLE stories ( ... );  -- see section 4.2

-- Part 5: Live Whereabouts (no DB — Realtime broadcast only)
ALTER TABLE gents ADD COLUMN status text;
ALTER TABLE gents ADD COLUMN status_expires_at timestamptz;

-- Part 6 additions
CREATE TABLE bucket_list ( ... );  -- section 6.5
CREATE TABLE reactions ( ... );    -- section 6.8
-- entries: ADD COLUMN scene_url text (section 1.4)
-- gents: ADD COLUMN portrait_url text (section 1.3, if not already exists)
```

---

## Part 8 — Edge Functions Required

| Function | Purpose | Model |
|---|---|---|
| `analyze-instagram` | Fetch + extract Instagram post/profile data, Claude analysis | Claude |
| `generate-story-arc` | Synthesise multi-entry narrative for a Story | Claude |
| `generate-throwback` | Retrospective lore for anniversary entries | Claude |
| `generate-scene` | Contextual scene image with gent portraits + location | Imagen 4 |
| `send-weekly-digest` | Weekly email via Resend | Claude + Resend |
| `generate-story-stamp` | Circular stamp for a Story (like mission stamps) | Gemini |

---

## Part 9 — Priority Order

| Priority | Feature | Effort | Impact |
|---|---|---|---|
| **P0** | Entry editing | Low | Daily pain point |
| **P0** | The Almanac (this day in history) | Low | Emotional, zero user effort |
| **P0** | Missing Studio templates (Wrapped, Recap, Passport Page) | Medium | Completes the Studio |
| **P1** | Portrait integration | Low (edge fn exists) | Calling Card prerequisite |
| **P1** | Passport: Stories | High | Major architectural upgrade |
| **P1** | Circle: Persons of Interest | Medium | Meaningful Circle expansion |
| **P1** | Instagram Intelligence (Scouting) | Medium | New capability |
| **P1** | Live Whereabouts | Medium | Social layer, fun |
| **P1** | Chronicle Map (The Dossier) | Medium | Visualises the footprint |
| **P1** | Verdict Board | Low | Builds on existing data |
| **P2** | Scene generation | Medium | Visual wow |
| **P2** | Shared Bucket List | Medium | Forward-looking |
| **P2** | Entry reactions | Low | Social texture |
| **P2** | The Rivalry Index | Medium | PS5 depth |
| **P2** | The Sommelier | Medium | Toast depth |
| **P2** | Weekly Digest email | Medium | Passive engagement |
| **P3** | Threshold system | Medium | Cosmetic gamification |
| **P3** | Gent comparison cards | Low | Nice to have |
