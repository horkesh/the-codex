# Data Model — The Codex

All tables live in Supabase PostgreSQL. Generated TypeScript types go in `src/types/database.ts`.

---

## Tables

### `gents`
The three users. Seeded manually — no sign-up flow needed.

```sql
create table gents (
  id          uuid primary key references auth.users(id),
  alias       text not null,          -- 'keys' | 'bass' | 'lorekeeper'
  display_name text not null,         -- e.g., 'Vedad', 'Delija'
  full_alias  text not null,          -- 'Keys & Cocktails', 'Beard & Bass', 'Lorekeeper'
  avatar_url  text,
  bio         text,
  created_at  timestamptz default now()
);
```

RLS: Any authenticated gent can read all rows. Only own row can be updated.

---

### `entries`
The core table. Every experience logged.

```sql
create table entries (
  id              uuid primary key default gen_random_uuid(),
  type            text not null,
  -- 'mission' | 'night_out' | 'steak' | 'playstation' | 'toast' | 'gathering' | 'interlude'
  title           text not null,
  date            date not null,
  location        text,               -- Human-readable location name
  city            text,               -- For passport stamps
  country         text,               -- For passport stamps
  country_code    text,               -- ISO 2-letter (for flag emoji)
  description     text,               -- User-written summary
  lore            text,               -- Claude-generated cinematic narrative
  lore_generated_at timestamptz,
  cover_image_url text,               -- AI-generated or user-uploaded
  status          text default 'draft',
  -- 'draft' | 'published' | 'gathering_pre' | 'gathering_post'
  metadata        jsonb default '{}', -- Type-specific data (see below)
  created_by      uuid not null references gents(id),
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);
```

RLS: All authenticated gents can read, create, update all entries.

#### `metadata` JSONB by type

**mission**:
```json
{
  "duration_days": 4,
  "cities": ["Budapest", "Debrecen"],
  "countries": ["Hungary"],
  "total_expense_km": 939.90,
  "expense_per_gent_km": 313.30,
  "expense_breakdown": {
    "accommodation": 496.31,
    "fuel": 160.00,
    "food": 78.44
  },
  "highlights": ["Thermal baths", "Ruin bars", "Goulash crisis"],
  "mission_intel": { ... }
}
```

`mission_intel` is populated by the intelligence pipeline and has the following structure:
```json
{
  "version": 1,
  "generated_at": "2026-03-20T12:00:00Z",
  "scenes": [
    {
      "id": "scene_001",
      "day": 1,
      "time_start": "2026-03-05T13:45:00Z",
      "time_end": "2026-03-05T15:20:00Z",
      "photo_ids": ["uuid1", "uuid2"],
      "hero_photo_id": "uuid1",
      "venue_name": "Borkonyha Wineyard Restaurant",
      "scene_type": "restaurant",
      "gents_present": ["keys", "bass", "lorekeeper"],
      "food_drinks": ["goulash", "red wine"],
      "ephemera": ["Menu text: 'Borkonyha...'"],
      "mood": "relaxed",
      "narrative": "Claude-generated 1-2 sentence scene narrative",
      "gps_centroid": { "lat": 47.4979, "lng": 19.0402 }
    }
  ],
  "day_chapters": [
    {
      "day": 1,
      "date": "2026-03-05",
      "label": "Day 1 — Budapest",
      "briefing": "Morning briefing text (italic gold border-left in UI)",
      "narrative": "Day narrative paragraph",
      "debrief": "Evening debrief text",
      "scene_ids": ["scene_001", "scene_002"],
      "route": [{ "lat": 47.4979, "lng": 19.0402 }, ...]
    }
  ],
  "trip_arc": "3-4 paragraph overall trip narrative",
  "tempo": [{ "hour": 0, "count": 0 }, { "hour": 13, "count": 4 }, ...],
  "highlights": [
    { "photo_id": "uuid", "quality_score": 9.1, "reason": "Perfect golden hour shot" }
  ],
  "verdict": {
    "best_meal": "Goulash at Borkonyha",
    "best_venue": "360 Rooftop Bar",
    "most_chaotic": "The underground ruin bar incident",
    "mvp_scene": "scene_003",
    "would_return": true
  },
  "ephemera": ["Menu text: 'Borkonyha...'", "Sign: 'Széchenyi 1913'"]
}
```

**night_out**:
```json
{
  "venue_name": "Sloga",
  "venue_city": "Sarajevo",
  "vibe_rating": 5,
  "special_moment": "Lorekeeper convinced the DJ to play Amr Diab"
}
```

**steak**:
```json
{
  "restaurant": "Park Princeva",
  "cut": "Ribeye",
  "doneness": "Medium rare",
  "rating": 5,
  "price_bam": 42,
  "verdict": "Life-changing. We came back the next day.",
  "orders": {
    "keys": "Ribeye",
    "bass": "T-bone",
    "lorekeeper": "Ribeye"
  }
}
```

**playstation** — every match in the session is stored individually:
```json
{
  "game": "FIFA 25",
  "mode": "Head-to-head",
  "matches": [
    { "match_number": 1, "p1": "keys", "p2": "bass", "score": "3-1", "winner": "keys" },
    { "match_number": 2, "p1": "bass", "p2": "lorekeeper", "score": "2-2", "winner": null },
    { "match_number": 3, "p1": "keys", "p2": "lorekeeper", "score": "1-0", "winner": "keys" }
  ],
  "session_winner": "keys",
  "total_goals": 9,
  "head_to_head_snapshot": {
    "keys_vs_bass": { "keys_wins": 5, "bass_wins": 3, "draws": 1 },
    "keys_vs_lorekeeper": { "keys_wins": 4, "lorekeeper_wins": 2, "draws": 0 },
    "bass_vs_lorekeeper": { "bass_wins": 6, "lorekeeper_wins": 4, "draws": 2 }
  }
}
```

`head_to_head_snapshot` is computed at publish time — cumulative record across all previous PlayStation entries for each pairing.

**toast**:
```json
{
  "session_code": "SILK",
  "guest_count": 6,
  "theme": "speakeasy",
  "duration_min": 38,
  "auto_synced": true
}
```

**gathering** — fields grow across the two phases:
```json
{
  "event_date": "2026-07-18",
  "location": "Herzegovina Villa, Mostar",
  "guest_list": [
    { "name": "Armin", "person_id": "uuid-or-null", "rsvp_status": "confirmed" },
    { "name": "Sara", "person_id": null, "rsvp_status": "pending" }
  ],
  "cocktail_menu": ["Negroni", "Aperol Spritz", "Old Fashioned", "Mojito"],
  "invite_image_url": "https://storage.url/gatherings/invite-xyz.png",
  "rsvp_link": "https://thecodex.app/g/herzegovina-summer-2026",
  "qr_code_url": "https://storage.url/gatherings/qr-xyz.png",
  "guest_book_count": 12,
  "phase": "post"
}
```

**interlude**:
```json
{
  "category": "free_form"
}
```

---

### `entry_participants`
Which gents were part of an entry.

```sql
create table entry_participants (
  entry_id  uuid not null references entries(id) on delete cascade,
  gent_id   uuid not null references gents(id),
  role      text,  -- optional role/note for this entry
  primary key (entry_id, gent_id)
);
```

---

### `entry_photos`
Photos attached to an entry.

```sql
create table entry_photos (
  id          uuid primary key default gen_random_uuid(),
  entry_id    uuid not null references entries(id) on delete cascade,
  url         text not null,          -- Supabase Storage URL
  caption     text,
  taken_by    uuid references gents(id),
  sort_order  int default 0,
  gps_lat     float,                  -- GPS latitude from EXIF (missions)
  gps_lng     float,                  -- GPS longitude from EXIF (missions)
  ai_analysis jsonb,                  -- Per-photo Gemini analysis output (missions)
  created_at  timestamptz default now()
);
```

`ai_analysis` JSONB shape (populated by `analyze-mission-photos` edge function):
```json
{
  "scene_type": "restaurant",
  "venue_name": "Borkonyha Wineyard Restaurant",
  "description": "Three men seated at a white-tablecloth restaurant...",
  "gents_present": ["keys", "bass"],
  "food_drinks": ["goulash", "red wine"],
  "ephemera": ["Menu text: 'Borkonyha...'"],
  "mood": "relaxed",
  "time_of_day_visual": "afternoon",
  "quality_score": 8.2,
  "highlight_reason": "Great light, all three gents visible",
  "unnamed_characters": 0
}
```

Storage bucket: `entry-photos` (private, authenticated access only)

---

### `passport_stamps`
One stamp per city/country per mission. Also includes achievement stamps.

```sql
create table passport_stamps (
  id            uuid primary key default gen_random_uuid(),
  entry_id      uuid references entries(id) on delete cascade,
  type          text not null,     -- 'mission' | 'achievement' | 'diplomatic'
  name          text not null,     -- e.g., 'Budapest Protocol', 'Return of the Gents'
  city          text,
  country       text,
  country_code  text,
  image_url     text,              -- Gemini-generated stamp image
  description   text,
  date_earned   date not null,
  created_at    timestamptz default now()
);
```

Auto-created when a Mission entry is published. Each city in `metadata.cities` gets a stamp.

---

### `achievements`
Milestone-based achievement stamps.

```sql
create table achievements (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text not null,
  icon        text,               -- emoji or asset reference
  type        text not null,      -- 'milestone' | 'streak' | 'legendary'
  criteria    jsonb not null,     -- e.g., {"metric": "missions", "threshold": 10}
  stamp_id    uuid references passport_stamps(id),
  earned_by   uuid references gents(id),
  earned_at   timestamptz,
  created_at  timestamptz default now()
);
```

Checked and awarded server-side in Edge Function after each relevant entry creation.

---

### `people`
The Circle — people the Gents meet.

```sql
create table people (
  id                   uuid primary key default gen_random_uuid(),
  name                 text not null,
  instagram            text,             -- Handle (no @)
  photo_url            text,             -- Supabase Storage or external
  portrait_url         text,             -- AI-generated portrait (from Verdict & Dossier flow)
  instagram_source_url text,             -- URL of Instagram post/profile used as source
  met_at_entry         uuid references entries(id),
  met_date             date,
  met_location         text,
  notes                text,             -- Shared notes visible to all Gents (used as bio for POIs)
  labels               text[],           -- Custom labels e.g. {'legend', 'BACHATA', 'recurring'}
  added_by             uuid references gents(id),
  category             text default 'contact',  -- 'contact' | 'person_of_interest'
  tier                 text default 'acquaintance',  -- 'inner_circle' | 'outer_circle' | 'acquaintance'
  poi_source_url       text,
  poi_intel            text,             -- AI-generated intel block (why interesting, opener, flags)
  poi_source_gent      uuid references gents(id),
  poi_visibility       text default 'private',  -- 'private' | 'circle'
  created_at           timestamptz default now()
);

-- Global deduplication: one row per Instagram handle across all gents
create unique index uidx_people_instagram_lower
  on people (lower(instagram)) where instagram is not null;
```

`labels` is a text array. Labels are defined by the Gents organically — no fixed taxonomy. Examples: `"legend"`, `"BACHATA"`, `"recurring"`, `"Sarajevo crew"`.

Storage buckets: `people-photos` (profile photos), `person-scans` (source photos from the Verdict intake flow)

---

### `person_scans`
Audit trail for the Verdict & Dossier AI intake flow. Every scan attempt is stored here — the `people` table only gets a row after the Gent confirms the dossier.

```sql
create table person_scans (
  id                      uuid primary key default gen_random_uuid(),
  created_by              uuid not null references gents(id),
  person_id               uuid references people(id),         -- null until confirmed
  status                  text not null default 'draft',       -- 'draft' | 'confirmed' | 'discarded'
  source_type             text not null,                       -- 'photo' | 'instagram_screenshot'
  source_photo_url        text,                                -- uploaded source image
  appearance_description  text,
  trait_words             text[],
  score                   numeric(4,2),                        -- 0.0–10.0
  verdict_label           text,                                -- 'Immediate Interest' | 'Circle Material' | 'On the Radar' | 'Observe Further'
  confidence              numeric(4,2),                        -- 0.0–1.0
  recommended_category    text,                                -- 'contact' | 'person_of_interest'
  display_name            text,
  bio                     text,
  why_interesting         text,
  best_opener             text,
  green_flags             text[],
  watchouts               text[],
  instagram_handle        text,
  instagram_source_url    text,
  generated_avatar_url    text,
  review_payload          jsonb,                               -- full raw AI verdict JSON
  created_at              timestamptz default now(),
  updated_at              timestamptz default now()
);
```

RLS: `created_by = auth.uid()` on all operations — each Gent can only see their own scans.

---

### `people_notes`
Private per-Gent notes on any person in The Circle. Only the owning Gent can see their notes — other Gents cannot.

```sql
create table people_notes (
  id          uuid primary key default gen_random_uuid(),
  person_id   uuid not null references people(id) on delete cascade,
  gent_id     uuid not null references gents(id),
  note        text not null,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now(),
  unique (person_id, gent_id)   -- one note record per person per gent
);
```

RLS: SELECT, INSERT, UPDATE, DELETE only where `gent_id = auth.uid()`. No Gent can read another Gent's notes on the same person.

---

### `gathering_rsvps`
RSVP responses submitted via the public invite link (no login required).

```sql
create table gathering_rsvps (
  id            uuid primary key default gen_random_uuid(),
  entry_id      uuid not null references entries(id) on delete cascade,
  name          text not null,
  email         text,             -- Optional — guests don't have to provide email
  response      text not null,   -- 'attending' | 'not_attending' | 'maybe'
  created_at    timestamptz default now()
);
```

RLS:
- Authenticated gents: SELECT all for entries they have access to. No INSERT (submissions come from anonymous public endpoint).
- Public (anon): INSERT only. No SELECT.
- Supabase Edge Function handles anonymous inserts and real-time pushes to the entry.

---

### `guest_book_messages`
Messages left via the QR guest book at a live party (no login required).

```sql
create table guest_book_messages (
  id              uuid primary key default gen_random_uuid(),
  entry_id        uuid not null references entries(id) on delete cascade,
  guest_name      text not null,
  cocktail_chosen text,           -- From the party's cocktail menu
  message         text,           -- Guest book message (optional)
  created_at      timestamptz default now()
);
```

RLS:
- Authenticated gents: SELECT all for entries they have access to.
- Public (anon): INSERT only via Edge Function. No SELECT.

---

### `stats` (view, not table)
Computed via SQL view — never manually maintained.

```sql
create view gent_stats as
select
  g.id as gent_id,
  g.alias,
  count(distinct case when e.type = 'mission' then e.id end) as missions,
  count(distinct case when e.type = 'night_out' then e.id end) as nights_out,
  count(distinct case when e.type = 'steak' then e.id end) as steaks,
  count(distinct case when e.type = 'playstation' then e.id end) as ps5_sessions,
  count(distinct case when e.type = 'toast' then e.id end) as toasts,
  count(distinct case when e.type = 'gathering' then e.id end) as gatherings,
  count(distinct p.id) as people_met,
  count(distinct ps.country) as countries_visited,
  count(distinct ps.city) as cities_visited,
  count(distinct ps.id) as stamps_collected
from gents g
left join entry_participants ep on ep.gent_id = g.id
left join entries e on e.id = ep.entry_id and e.status = 'published'
left join passport_stamps ps on ps.entry_id = e.id and ps.type = 'mission'
left join people p on p.added_by = g.id
group by g.id, g.alias;
```

---

## Storage buckets

| Bucket | Access | Purpose |
|---|---|---|
| `entry-photos` | Private (auth required) | Photos attached to entries |
| `people-photos` | Private (auth required) | Photos of people in The Circle |
| `stamps` | Private (auth required) | Generated stamp images |
| `covers` | Private (auth required) | Entry cover images |
| `portraits` | Private (auth required) | Gent calling card portraits + AI portraits from Verdict flow (`scans/{scan_id}/`) |
| `person-scans` | Private (auth required) | Source photos uploaded during Verdict & Dossier intake |
| `gatherings` | Public (read) / Auth (write) | Invite card images, QR codes — must be shareable without login |

---

## Row-Level Security (RLS) summary

| Table | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `gents` | Any authenticated | — | Own row only | — |
| `entries` | Any authenticated | Any authenticated | Any authenticated | `created_by` only |
| `entry_participants` | Any authenticated | Any authenticated | Any authenticated | `created_by` of entry |
| `entry_photos` | Any authenticated | Any authenticated | Any authenticated | `taken_by` only |
| `passport_stamps` | Any authenticated | Edge Function (service role) | — | — |
| `achievements` | Any authenticated | Edge Function (service role) | — | — |
| `people` | Any authenticated | Any authenticated | Any authenticated | `added_by` only |
| `people_notes` | `gent_id = auth.uid()` only | `gent_id = auth.uid()` only | `gent_id = auth.uid()` only | `gent_id = auth.uid()` only |
| `gathering_rsvps` | Any authenticated | Anon (via Edge Function) | — | Any authenticated |
| `guest_book_messages` | Any authenticated | Anon (via Edge Function) | — | Any authenticated |
| `person_scans` | `created_by = auth.uid()` only | `created_by = auth.uid()` only | `created_by = auth.uid()` only | `created_by = auth.uid()` only |

No public SELECT access to any table. RSVP and guest book inserts go through a dedicated Edge Function that validates the gathering entry exists and is in `gathering_pre` or `gathering_post` state.

---

## Supabase TypeScript types

After schema changes, regenerate with:
```bash
supabase gen types typescript --project-id YOUR_PROJECT_ID > src/types/database.ts
```
