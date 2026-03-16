# The Gents Chronicles — CLAUDE.md

## What this is
Private lifestyle chronicle app for three friends (The Gents). Deployed at https://the-codex-sepia.vercel.app. Three fixed users, invite-only Supabase Auth (magic link). Not commercial.

## Stack
- **Frontend**: React 19 + TypeScript + Vite 6 + Tailwind v4 + Framer Motion + Zustand 5
- **Backend**: Supabase (Auth + Postgres + Storage + Edge Functions on Deno)
- **AI**: Anthropic Claude (`claude-haiku-4-5-20251001` for Instagram analysis, `claude-sonnet-4-6` for lore/narrative) + Google Gemini (`gemini-2.5-flash` for photo vision, `imagen-4.0-generate-001` for image generation)
- **Deploy**: `git push` to `main` — GitHub Actions (`.github/workflows/deploy.yml`) auto-deploys Vercel + all Supabase Edge Functions. See `docs/05-dev-ops/runbook.md`.

## Key architecture decisions
- **No service worker** — VitePWA is set to `selfDestroying: true`. The SW caused persistent deadlocks by caching Supabase calls. Do not re-enable runtime caching.
- **Auth listener** — `useAuthListener` in `src/hooks/useAuth.ts` must NOT `await` Supabase calls inside `onAuthStateChange`. supabase-js v2 holds an internal lock during the callback; calling `fetchGentById` inside it deadlocks all page queries. The fix is `setTimeout(() => fetchGentById(...).then(setGent), 0)`.
- **Auth initialization** — `useAuthStore` has an `initialized` flag (not persisted). Set to `true` when `INITIAL_SESSION` fires. `ProtectedRoute` in `App.tsx` renders immediately if `gent` is in the store (from localStorage persist); only blocks (returns `null`) if `gent` is null AND `initialized` is false. Do NOT redirect before initialized — Zustand persist hydration can lag the first render, causing a spurious redirect to Landing.
- **Zustand persist** — Auth store (`codex-auth`) persists `gent` to localStorage (not `initialized`). Pages render immediately with persisted data while the auth listener re-validates in background.
- **No grain overlay** — `body::after` grain CSS animation was removed permanently. It ran a feTurbulence SVG at 10 steps/8s and caused visible performance degradation.
- **Stagger animations on Home** — Do NOT use `staggerContainer`/`staggerItem` variants on the section cards in `Home.tsx`. The stagger container mounts after Zustand persist hydration fires, which happens after `AnimatePresence`'s initial render — so `initial={false}` on `AnimatePresence` no longer suppresses the `opacity:0` initial state, leaving cards invisible. Section cards render without an initial variant; `PageWrapper`'s `fadeUp` provides the page entrance animation.

## AI routing by feature
| Feature | Model | Why |
|---|---|---|
| Lore generation | `claude-sonnet-4-6` | Best narrative voice |
| Title generation from photo | `claude-haiku-4-5-20251001` | Fast vision, type-specific title inference |
| Instagram screenshot analysis | `claude-haiku-4-5-20251001` | Reliable JSON, no refusals on profile data |
| Photo/camera scan (POI) | `gemini-2.5-flash` | Claude refuses appearance scoring; Gemini does not |
| Portrait image generation | `imagen-4.0-generate-001` | Imagen 4 via `:predict` endpoint |
| Cover/scene/stamp image generation | `imagen-4.0-generate-001` | Same |
| Studio restyle — scene analysis | `gemini-2.5-flash` | Vision: describes scene using saved gent identities |
| Studio restyle — noir generation | `gemini-2.5-flash-image` | Text-only generation from scene description (no photo input — prevents filter-only output) |

**Critical model notes:**
- `gemini-2.0-flash` is deprecated for new API keys (404 "no longer available to new users"). Use `gemini-2.5-flash`.
- Claude refuses prompts that ask for appearance scoring, social categorisation ("Immediate Interest"), or openers for meeting someone. Do not send photo analysis to Claude.
- All Gemini `fetch()` calls in Edge Functions must use an `AbortController` with a 20s timeout — Supabase free tier kills functions at ~25s at the infrastructure level, which returns a non-2xx that our catch block cannot intercept.

## Design system
- Colors: obsidian `#0a0a0f`, gold `#c9a84c`, ivory `#f5f0e8`
- Fonts: Playfair Display (`font-display`), Instrument Sans (`font-body`)
- Language: "Gents" not "users", "Chronicle" not "feed", "Mission" not "trip", "Circle" not "contacts"
- **No emojis** anywhere in the UI — they undermine the premium aesthetic. Use CSS ornamental elements instead.
- **App imagery:** Entry-type images (1–7) in `public/entry-types/*.webp`; empty-state images (8–11) in `public/empty-states/*.webp`. Prompts and paths: `docs/03-architecture/entry_type_image_prompts.md`.

## Portrait generation (`supabase/functions/generate-portrait/`)
Two-step pipeline:
1. **Analysis** — `gemini-2.5-flash` with vision: extracts structured `appearance` and `traits`
2. **Generation** — `imagen-4.0-generate-001` via `:predict` endpoint:
   - Request: `{ instances: [{ prompt }], parameters: { sampleCount: 1, aspectRatio: "1:1", safetyFilterLevel: "block_only_high" } }`
   - Response: `predictions[0].bytesBase64Encoded`
   - Prompt style: abstract geometric noir — minimalist geometric forms, cinematic noir lighting, moody desaturated palette, while faithfully preserving the subject's exact skin tone, hair, and facial features.
   - Same style used for Circle contacts (`generate-person-portrait`).
- Portrait uploaded to `portraits` bucket in Supabase Storage

## POI Scanner (`scan-person-verdict` edge function)
Two modes, routed by `source_type`:
- `instagram_screenshot` → Claude Haiku: extracts appearance, traits, score, display_name, instagram_handle
- `photo` → Gemini 2.5 Flash: same fields minus display_name/handle

Client: `src/hooks/useVerdictIntake.ts` — compresses all images to 1024px JPEG (0.82 quality) before upload. `handleAnalyzeFile(file, sourceType)` takes explicit source type. `handleAnalyzeHandle(handle)` fetches avatar from `unavatar.io/instagram/{handle}?fallback=false` (public profiles only).

**UI entry point**: FAB on Circle's POI tab opens `ScanActionSheet` (bottom sheet) with two options:
- **Research** — Instagram screenshot or handle lookup → opens `POIModal` in `research` mode
- **Scan** — Camera or photo from gallery → opens `POIModal` in `scan` mode
`POIModal` receives a `mode` prop and no longer has an internal toggle.

## ReactFlow canvas height
Shell uses `min-h-dvh` (not `h-dvh`), so `flex-1` children have no definite height → canvas is 0px (black screen). Always use `style={{ height: 'calc(100dvh - Xpx)' }}` where X = TopBar + SectionNav heights. Current: `calc(100dvh - 96px)` (TopBar 56px + SectionNav 40px).

## Instagram photo auto-fetch
When a contact has an Instagram handle, `photo_url` is `https://unavatar.io/instagram/{handle}`. On edit, only updates if the handle actually changed.

## Photo filters (`src/lib/photoFilters.ts`)
16 CSS-based filters: Raw, Chronicle, The Pitch, Noir, Velvet, Havana, Dusk, Fade, Tokyo, Amber, Ember, Frost, Haze, Slate, Midnight, Sepia. Each filter has a CSS `filter` string and a `radial-gradient` vignette overlay. Default: `chronicle`. Stored per-entry in localStorage (`photo-filter:{entryId}`). Filters propagate to Studio export templates via `PhotoFilterContext`.

## Gent identity descriptions (`supabase/functions/_shared/gent-identities.ts`)
- `GENT_APPEARANCES` — detailed physical descriptions per gent (hair, facial hair, build, complexion)
- `GENT_ALIASES` — display aliases (Lorekeeper, Beard & Bass, Keys & Cocktails)
- `GENT_VISUAL_ID` — compact visual identification guide for AI vision prompts
- All edge functions that generate/analyse images of The Gents should import from this shared file.

## Photo upload limits
- Mission: 20 photos, Night Out: 15, all others: 10
- `PhotoUpload` accepts `maxPhotos` prop; `usePendingPhotos(maxPhotos)` enforces the cap
- Limits set in `EntryNew.tsx` based on `selectedType`

## Lore generation (`supabase/functions/generate-lore/`)
- Uses `claude-sonnet-4-6` with vision. Photo limits per type: mission up to 20, night_out up to 15, others up to 4.
- **Time-of-day is authoritative**: EXIF time from `entry.metadata.time_of_day` is explicitly marked as ground truth in the prompt. Claude must not infer a different time from photo lighting.
- **Weekday/weekend awareness**: day-of-week + time-of-day derive a situational hint (e.g. "weekday lunch window — likely a lunch break rendezvous") that is passed as `Context:` in the prompt.
- **Type-specific narrative directives**: each entry type (steak, playstation, toast, night_out, mission, gathering, interlude) has a tailored `entryTypeDirectives` block that tells Claude what to focus on (food details for Table, competitive energy for Pitch, drink references for Toast, etc.).
- **Director's Notes** (`lore_hints`): persistent free-text field stored in `entry.metadata.lore_hints`. Collapsible textarea in `LoreSection`. Auto-saves to DB after 1s of inactivity. Included in the Claude prompt as "Director's Notes (incorporate these details naturally)". Works for both initial generation and regeneration. Regeneration re-fetches entry from DB to get latest hints.

## Title generation (`supabase/functions/generate-title/`)
- Uses `claude-haiku-4-5-20251001` with vision on the first uploaded photo.
- Client (`src/ai/title.ts`) compresses photo to 512px / 0.6 quality base64 before sending.
- Type-specific instructions guide what to identify (cut of meat for Table, game on screen for Pitch, drinks for Toast, etc.).
- Suggested title auto-fills the form's title field unless the user has manually edited it.
- For Table and Pitch, the AI title is combined with a **chronological volume number** (e.g. "Wagyu Tataki at Craft · Vol. 12").
- Vol numbers are date-ordered (oldest = Vol. 1). `getChronologicalVol(type, date)` counts entries with `date <= newDate`.
- After creating an entry, `renumberVolumes(type)` fire-and-forget updates all `· Vol. N` titles to reflect correct order.
- Adding a past-dated entry renumbers all existing entries of that type.

## Passport stamps
- Mission entries auto-create a passport stamp on publish via `createMissionStamp()` in EntryNew.
- Stamp artwork generated async via `generateStamp()` → `generate-stamp` edge function (Imagen 4) → `updateStampImage()`.
- All fire-and-forget — doesn't block entry creation.

## QR code for guestbook
- GatheringDetail shows a "Share" section with copy-to-clipboard buttons for invite + guestbook URLs.
- QR code rendered as an `<img>` from `api.qrserver.com` (no library dependency). Points to `/g/{entryId}/guestbook`.

## Wishlist Instagram import
- "Import from Instagram" URL field in BucketList's AddWishModal.
- Calls `analyzeInstagramUrl(url, 'event')` → auto-fills title, city, country, notes (vibe/price/dress code).

## Studio export (`src/pages/Studio.tsx`)
- **Cover image as default background**: when an entry is selected, `cover_image_url` is immediately used as the template background.
- **Background source picker**: two buttons — "Cover Photo" (real image) and "AI Restyle" (AI-generated). User can switch freely between them. Active source is highlighted with gold border.
- **AI Restyle** (`generate-template-bg` edge function) — two-step text-only pipeline when a cover photo exists:
  1. **Analyze** — `gemini-2.5-flash` with vision reads the photo and produces a scene description, identifying each Gent by name using saved appearances from `_shared/gent-identities.ts`.
  2. **Generate** — `gemini-2.5-flash-image` (text only, NO photo input) generates dark cinematic noir artwork from the description. The photo must NOT be passed to the generation step — Gemini Flash Image applies a filter instead of redrawing when given the original image.
  - When no cover photo exists, Imagen generates a from-scratch background using type-specific prompts.
- Templates render via `BackgroundLayer` which applies both the background image and photo filter CSS from context.
- **Template variants**: Night Out, Mission, Steak, PS5 each have 4 layout variants (prop `variant={1|2|3|4}`). Variant 1 = classic, others = bold/quote/minimal/etc. Registered in `TEMPLATES_BY_TYPE` as separate `TemplateId` entries (e.g. `night_out_card_v2`).
- **Lore oneliner in templates**: `getOneliner(entry)` in `src/export/templates/shared/utils.ts` extracts `metadata.lore_oneliner` or falls back to first sentence of lore. All template variants display the oneliner instead of full lore.

## Chronicle search & pinning
- **Search**: `SearchBar` component in Chronicle with debounced (300ms) client-side filtering across title, description, location, city, and lore. Hook: `useChronicle` exposes `query`/`setQuery`; filtering is memoized via `useMemo`.
- **Pin**: `pinned: boolean` on entries (DB column, default false). `togglePin(entryId, pinned)` in entries.ts. Pinned entries sort first (`pinned DESC, date DESC`). Pin toggle on EntryCard + EntryDetail overflow menu. Gold left-border accent on pinned cards.
- **DB migration required**: `ALTER TABLE entries ADD COLUMN pinned boolean NOT NULL DEFAULT false;`

## Private entries
- `visibility: 'shared' | 'private'` on entries (DB column, default 'shared'). Private entries filtered client-side in `fetchEntries` via `currentGentId` param — only the creator sees their private entries.
- Toggle in EntryNew: Lock/Unlock icon before submit button. Lock icon shown on private EntryCards.
- **DB migration required**: `ALTER TABLE entries ADD COLUMN visibility text NOT NULL DEFAULT 'shared' CHECK (visibility IN ('shared', 'private'));`

## Mission date range
- MissionForm has Start Date and End Date (optional) inputs.
- `date_end` stored in `entry.metadata.date_end` (not a DB column — avoids migration).
- Display format: "Budapest, Hungary · Mar 5 – 12, 2026" when range, single date otherwise.

## Pitch form
- `PlaystationForm` has Title, Date, Location, and Matches fields.
- Auto-fills date and location from photo EXIF via `detectedLocation` prop.
- Location passed through `submitPlaystation` to `createEntry`.

## Circle multi-gent relationships
- `person_gents` table: many-to-many between people and gents (who "knows" this person).
- `fetchPersonGents(personId)` / `updatePersonGents(personId, gentIds[])` in people.ts.
- PersonDetail: "Known by" button shows multi-select modal — toggle gents on/off.
- `added_by` remains for audit (who originally added); `person_gents` drives the "Known by" UI.
- **DB migration required**:
  ```sql
  CREATE TABLE person_gents (
    person_id uuid REFERENCES people(id) ON DELETE CASCADE,
    gent_id uuid REFERENCES gents(id) ON DELETE CASCADE,
    PRIMARY KEY (person_id, gent_id)
  );
  ```

## Photo Timeline (`/chronicle/photos`)
- `fetchAllPhotos()` in `src/data/photos.ts` — joins `entry_photos` with `entries`, filters to published entries, sorted by date DESC.
- `PhotoTimeline.tsx` page: 3-column masonry grid grouped by month, entry type icon overlay, tap to navigate to entry.

## Steak Ratings Chart (`src/components/ledger/SteakRatingsChart.tsx`)
- Pure CSS horizontal bar chart in Ledger. Gold bars filled to score/10, animated entrance via Framer Motion.
- Summary row: average score, total steaks rated, best score.
- `fetchSteakRatings()` in stats.ts extracts `metadata.score` and `metadata.cut` from steak entries.

## PS5 Win Streaks (`src/components/ledger/PS5StreaksSection.tsx`)
- Current streak + longest streak per gent, derived from iterating all PS5 match results.
- Crown icon for the streak leader. Displayed in Ledger after PS5 Rivalry section.

## Contact tagging from entry creation
- `ContactTagger` component: search + tag people from Circle as present at an event.
- `fetchPeopleQuick(query?)` in people.ts. `addPersonAppearances(entryId, personIds, gentId)` in entries.ts.
- Rendered in EntryNew below ParticipantSelector. Tags stored in `person_appearances` table.

## Achievement sharing cards (Studio)
- `AchievementCard` export template (1080×1350): achievement name, description, earned-by gent, date.
- Standalone template type in Studio (like Wrapped/Rivalry), with achievement selector.

## Prospect auto-nudge
- `fetchDueProspects()` in prospects.ts — prospects with event_date between 7 days ago and today, status still 'prospect'.
- Gold banner on Chronicle page: "[event_name] — ready to log it?" with Log Entry / Dismiss buttons.

## Weekly digest cron
- `.github/workflows/weekly-digest.yml` — GitHub Actions cron every Monday 7:00 UTC.
- Triggers existing `send-weekly-digest` edge function via curl. Also supports manual `workflow_dispatch`.

## Studio BrandMark logo
- `BrandMark` component (`src/export/templates/shared/BrandMark.tsx`) renders `public/logo-gold.webp` (3-gents circular gold emblem).
- Sizes: `sm` = 48px, `md` = 64px, `lg` = 80px. Used at bottom of every Studio export template.

## Photo storyboard (`src/components/chronicle/PhotoStoryboard.tsx`)
- Editorial mixed-size photo layout for mission and night_out entries (replaces flat grid).
- Cycle: hero (16:9) → duo (square) → trio (portrait left + 2 landscape right) → wide (2.2:1) → repeats.
- Gold ornamental dividers between blocks. Graceful truncation for small photo counts.
- All other entry types keep the original `PhotoGrid`.

## Cover image pan/zoom (`EntryHero`)
- "Adjust" button on entry hero opens edit mode: drag-to-pan, zoom slider (1x–2x).
- Position stored in `entry.metadata.cover_pos_x` / `cover_pos_y` (0–100%), scale in `cover_scale`.
- CSS-only transform (`object-position` + `transform: scale`), no re-upload.
- `EntryCard` thumbnails in Chronicle feed also respect the crop position.

## Gent profile honours
- `/gents/:alias` shows "Honours" section with both achievements and threshold badges.
- `fetchEarnedAchievements` + `fetchEarnedThresholds` called in parallel on mount.
- Signature stat derived from stats: threshold-based labels (Connoisseur, Globetrotter, etc.) or relative-to-group fallback.

## Deployment workflow
```bash
git add <files> && git commit -m "..." && git push
# GitHub Actions deploys Vercel + all Supabase Edge Functions automatically
# See .github/workflows/deploy.yml
```

## Related projects (for reference)
- `C:\...\Tonight` — Social game app. Source of avatar prompt patterns.
- `C:\...\The Grand Tour` — Italy trip PWA.
