# Toast Integration Design

**Date:** 2026-03-19
**Status:** Approved

## Overview

Integrate The Toast (standalone real-time cocktail party app) with Chronicles via a Supabase bridge. Toast sessions auto-save as draft Chronicle entries with rich session data. Guests map to Circle contacts. Gent role stats tracked per session.

## Architecture: Supabase Bridge

The Toast stays a separate app (Express + Socket.io on Fly.io, React client on Vercel). Chronicles stays a Supabase SPA. They share the same Supabase project. No WebSocket server in Chronicles.

### Session End Flow

1. **Toast server assembles payload** — all session data from in-memory `RoomState` at act 4 completion or host end.
2. **Toast server POSTs payload to `receive-toast-session` edge function** — validates token, creates draft entry, session records, matches/creates guests, uploads images, updates gent stats.
3. **Toast redirects to Chronicles** — client navigates to `https://the-codex-sepia.vercel.app/chronicle/draft/{entryId}`.
4. **Gent reviews and publishes** — draft review shows session card carousel preview. Edit title, tweak location, confirm guest matching, remove confessions. Publish triggers optional lore generation.

### Auth Handoff

1. Gent clicks "Host a Toast" in Chronicles.
2. Chronicles calls `generate-toast-token` edge function — generates a short-lived signed JWT (15min expiry) containing `gent_id`, `exp`, signed with a shared secret (env var `TOAST_BRIDGE_SECRET` set in both Supabase and Toast server).
3. Chronicles redirects to The Toast with the token: `https://toast-url.com/host?token={jwt}&callback={chronicles-draft-url}`.
4. Toast server validates the JWT on connection, extracts `gent_id`. Rejects expired/invalid tokens.
5. At session end, Toast server calls `receive-toast-session` edge function with the same token (or a service-role key scoped to toast writes). Edge function validates before writing.

**Edge functions required:**
- `generate-toast-token` — issues short-lived bridge JWT. `verify_jwt = false` in config.toml.
- `receive-toast-session` — validates token, writes all session data to Supabase. `verify_jwt = false` in config.toml.

## New Database Tables

### Foreign Key Notes

- **Cascade deletes**: `toast_sessions.entry_id` uses `ON DELETE CASCADE`. `toast_cocktails.session_id`, `toast_confessions.session_id`, `toast_wrapped.session_id` all use `ON DELETE CASCADE`. Deleting the entry cascades through the entire session graph.
- **Polymorphic participant IDs**: `toast_confessions.confessor_id` and `toast_wrapped.participant_id` reference either `people.id` or `gents.id` — discriminated by `confessor_is_gent` / `is_gent` boolean. **No FK constraint** on these columns (Postgres can't enforce a FK against two tables). Application layer resolves the join.

### `toast_sessions`
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `entry_id` | uuid FK → entries (CASCADE) | |
| `hosted_by` | uuid FK → gents | |
| `session_code` | text | 4-letter room code |
| `duration_seconds` | integer | |
| `act_count` | integer | |
| `guest_count` | integer | |
| `vibe_timeline` | jsonb | `[{act, vibe, timestamp}]` |
| `created_at` | timestamptz | |

### `toast_cocktails`
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `session_id` | uuid FK → toast_sessions | |
| `name` | text | AI cocktail name |
| `story` | text | AI cocktail story |
| `image_url` | text | Supabase Storage path |
| `round_number` | integer | |
| `act` | integer | |
| `crafted_for` | uuid FK → people (nullable) | Personalized cocktail |

### `toast_confessions`
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `session_id` | uuid FK → toast_sessions | |
| `prompt` | text | |
| `confessor_id` | uuid (nullable) | person_id or gent_id |
| `confessor_is_gent` | boolean | |
| `ai_commentary` | text | |
| `act` | integer | |
| `reaction_count` | integer | For filtering top confessions |

### `toast_wrapped`
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `session_id` | uuid FK → toast_sessions | |
| `participant_id` | uuid | person_id or gent_id |
| `is_gent` | boolean | |
| `stats` | jsonb | `{reactions_sent, drinks_raised, spotlight_time, ...}` |
| `ai_note` | text | Personalized AI note |
| `ai_title` | text | e.g. "The Instigator", "Quiet Storm" |

### `toast_gent_stats`
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `gent_id` | uuid FK → gents | |
| `role` | text | lorekeeper / keys / bass |
| `sessions_hosted` | integer | |
| `photos_taken` | integer | Lorekeeper |
| `cocktails_crafted` | integer | Keys |
| `confessions_drawn` | integer | Bass |
| `spotlights_given` | integer | Bass |
| `vibe_shifts_called` | integer | Keys |
| `reactions_sparked` | integer | Bass |
| `top_guest_id` | uuid FK → people (nullable) | Most frequently hosted |
| `updated_at` | timestamptz | |

### RLS Policies

All new toast tables: `authenticated` users can SELECT. Only the `receive-toast-session` edge function writes (via service role key, bypasses RLS). No direct client writes to toast tables.

- `toast_sessions` — SELECT for authenticated
- `toast_cocktails` — SELECT for authenticated
- `toast_confessions` — SELECT for authenticated
- `toast_wrapped` — SELECT for authenticated
- `toast_gent_stats` — SELECT for authenticated

### Existing tables touched
- `entries` — Toast entries with richer metadata (`session_id`, `vibe_summary`, `act_count`)
- `people` — new POIs created from Toast guests (portrait, labels from traits)
- `person_appearances` — guests tagged as present
- `person_gents` — guest ↔ hosting Gent relationships

## Toast Entry Metadata

Stored in `entries.metadata`:
```json
{
  "session_id": "uuid",
  "session_code": "ABCD",
  "duration_seconds": 2100,
  "act_count": 4,
  "guest_count": 5,
  "vibe_summary": "Intimate -> Electric -> Chaotic -> Intimate",
  "mood_tags": ["Confessional", "Electric"],
  "guest_matches": [
    { "toast_name": "Alex", "person_id": "uuid-or-null", "status": "matched|created|unmatched" }
  ]
}
```

## Photos

Toast entries are **photo-optional**. Photos come from two sources:
- **Group snaps** — captured in-app during the session (Lorekeeper mechanic). Uploaded to `entry_photos` via the edge function.
- **Scene backdrops** — AI-generated environment art per act. Stored in Supabase Storage, referenced in `toast_sessions.vibe_timeline`.

Photo limit: **10** (same as other non-mission types). Enforced server-side in `receive-toast-session` edge function (truncates to 10 if session produced more). Group snaps use standard `entry_photos` table. Scene backdrops are not counted as entry photos — they're session artifacts.

Photos render via `PhotoGrid` (not `PhotoStoryboard` — Toast sessions aren't editorial photo stories).

## Toast Entry Layout (`ToastLayout`)

Replaces generic layout for toast entries (same pattern as `MissionLayout`). Visual card-based experience, no wall of text.

### Sections (scrollable):

1. **Session Header** — dark backdrop, venue, date, duration badge, guest count. Participant avatars (Gents + guests). Styled like visa card bearer row.

2. **Act Carousel** — horizontal swipeable cards, one per act. Each card: act name, vibe mode pill, key artifact (cocktail card, confession highlight, or backdrop image). Max ~300px tall.

3. **Cocktail Gallery** — horizontal scroll of cocktail cards. AI image, name, story, crafted-for attribution. Gold border, dark background. Speakeasy menu aesthetic.

4. **The Confessions** — vertical stack of 1-3 top confession highlights (filtered by `reaction_count`). Prompt in serif italic, confessor name, AI commentary in muted callout.

5. **Wrapped Strip** — horizontal scroll of wrapped cards per participant. AI title, key stat, personalized note, portrait + alias. Miniaturized version of Toast's Wrapped page.

6. **Vibe Timeline** — thin horizontal bar showing vibe shifts with colored segments (Intimate = warm amber, Electric = gold, Chaotic = ember). Decorative, not interactive.

7. **Group Snaps** — `PhotoGrid` of session photos (if any).

Lore generation is **optional** — triggered manually from the entry. Default experience is purely visual cards.

## Lore Generation Directive

When lore is manually triggered for a toast entry, the `entryTypeDirectives` for `toast`:

> "This is a Toast — a cocktail session hosted by The Gents. Focus on the social chemistry: who was there, the energy in the room, standout confessions or moments of vulnerability, the cocktails that defined the evening. Write as if recounting a legendary salon — intimate, witty, with an undercurrent of mischief. Reference specific cocktail names and guest aliases if available in the metadata. Let the vibe shifts colour the narrative arc."

`max_tokens`: 400 (standard). `full_chronicle` not supported for toast entries.

## Mood Tags

Toast-specific mood tags (in addition to generic moods):

```typescript
const TOAST_MOODS = ['Confessional', 'Intimate', 'Electric', 'Unhinged', 'Sophisticated', 'Late Night']
```

Auto-derived from vibe timeline if not manually set: the dominant vibe mode maps to a mood tag.

## Profile Enrichment

### Circle Contacts (Guests)

- **Portrait**: AI portrait from Toast → `photo_url` on `people` (only if no existing photo)
- **Alias**: Toast AI alias stored in `people.metadata.toast_alias`
- **Traits**: AI trait words → `people.labels` (same as scan traits)
- **Encounters**: Toast appearances in Encounter Log on dossier
- **Wrapped title**: Shown as badge on dossier under "Toast Honours"
- **Signature drink**: If a cocktail was crafted for them, shown on dossier as `people.metadata.toast_signature_drink`

### Gent Profiles

Role-specific stats on `/gents/:alias` under "Toast Service Record":

| Role | Stats Tracked |
|------|--------------|
| **Lorekeeper** | Sessions narrated, photos taken, group snaps captured |
| **Keys & Cocktails** | Cocktails crafted, drink rounds called, vibe shifts initiated |
| **Beard & Bass** | Confessions drawn, spotlights given, reactions sparked |

- Interaction stats: "Most hosted guest" with link to dossier
- Toast session count feeds into Honours/achievements

### Ledger

New "Toast" section in Ledger (extends existing `SommelierSection` or sits alongside it):
- Total sessions, total guests hosted, cocktails generated
- Per-Gent role breakdown
- "Most frequent guest" leaderboard

## Studio Export

Toast-specific templates (1080x1350, 4:5), registered as separate `TemplateId` entries:
- **`toast_session_v1`** — Session Card: date, venue, attendees, duration, vibe summary
- **`toast_session_v2`** — Cocktail Card: featured cocktail with AI art and story
- **`toast_session_v3`** — Wrapped Card: participant highlight with stats and AI note
- **`toast_carousel`** — multi-slide export combining the above (like visa carousel)

All templates use `InsetFrame` + `BrandMark` consistent with existing templates.

## Guest Matching Logic

Toast server sends guest profiles in the payload. The `receive-toast-session` edge function performs initial matching:

1. Exact match on `people.name` (case-insensitive) within the hosting Gent's `person_gents` scope
2. If no match → creates new POI with `added_by` = hosting Gent, `tier` = 'poi'
3. Sets `person_gents` link for hosting Gent
4. AI portrait → uploads to `portraits` bucket, sets as `photo_url` (only if person has no existing photo)
5. AI traits → sets as `labels`
6. Creates `person_appearances` for the session entry
7. Stores match results in `entry.metadata.guest_matches` with status per guest

**Draft review confirmation**: The draft review screen shows a "Guest Matching" section where the hosting Gent can:
- Verify auto-matched guests (correct match shown with green check)
- Fix wrong matches (search Circle to pick the right person)
- Confirm new POIs (or merge into existing contact)
- Unmatched guests remain as names in the session data without Circle links

Guest matching corrections update `person_appearances` and `person_gents` on publish.

## Launch Point in Chronicles

- "Host a Toast" button on Chronicles Home page (alongside existing sections)
- Also accessible from Toast entry type in EntryNew (redirects to The Toast instead of showing ToastForm)
- Flow: click → `generate-toast-token` edge function → redirect to `https://toast-url.com/host?token={jwt}&callback={chronicles-draft-url}`
- After session, Toast redirects to callback URL with entry ID appended

## Draft Review Screen

New route: `/chronicle/draft/:entryId`

**Access control**: Creator-only (the hosting Gent). Other Gents see "This draft belongs to [Gent name]" message.

**Data fetching**: `fetchDraftEntry(entryId)` — new function in `src/data/entries.ts` that fetches a single entry by ID regardless of status. Standard `fetchEntries` already filters to `published`/`gathering_post`, so drafts are excluded from the Chronicle feed and Showcase. This is intentional — drafts must never appear in public or feed views.

**Title**: Edge function sets a default title from the session (e.g. "The Toast — Session ABCD" or the AI-generated session name from Wrapped). Gent can edit during draft review. No Vol numbering for toast entries (unlike Table/Pitch) — sessions are unique events, not a recurring series.

**UI**:
- Shows `ToastLayout` in preview mode
- Guest Matching section (verify/fix auto-matches)
- Edit controls: title, location, remove individual confessions
- "Publish" button → sets `status: 'published'`, finalizes guest matches, optionally triggers lore generation
- "Discard" button → deletes draft entry and all related session data (cascade: toast_sessions, cocktails, confessions, wrapped, person_appearances, new POIs)

**Orphan cleanup**: Drafts older than 48 hours are cleaned up by a scheduled edge function (`cleanup-toast-drafts`, runs daily via GitHub Actions cron). Deletes the entry and cascades all related data.

## Achievements

New Toast-related achievements in `ACHIEVEMENT_DEFINITIONS`:
- "First Pour" — host first Toast session
- "Bartender" — craft 10 cocktails (Keys)
- "Confessor" — draw 10 confessions (Bass)
- "Chronicler" — take 20 group snaps (Lorekeeper)
- "Regular" — host 10 Toast sessions
- "Legendary Host" — host 25 Toast sessions
- "50 Cocktails" — cumulative across all sessions

## Edge Functions Summary

| Function | Purpose | `verify_jwt` |
|----------|---------|-------------|
| `generate-toast-token` | Issues short-lived bridge JWT for auth handoff | `false` |
| `receive-toast-session` | Validates token, writes all session data to Supabase | `false` |
| `cleanup-toast-drafts` | Deletes orphaned drafts older than 48h | `false` |

All must be added to `supabase/config.toml`. Deploy workflow uses `--no-verify-jwt` flag.

**Cleanup cron**: New workflow `.github/workflows/cleanup-toast-drafts.yml`, schedule `0 3 * * *` (daily 3am UTC). Calls `cleanup-toast-drafts` edge function via curl (same pattern as `weekly-digest.yml`).

## Assets

Toast entry-type image: generate a new `public/entry-types/05.webp` (Toast is entry type 5 in the registered order). Prompt style consistent with existing entry-type images (noir geometric, gold accent). Empty-state image not needed — Toast entries are always created via the bridge, never manually.
