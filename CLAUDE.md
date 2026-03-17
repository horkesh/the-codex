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
| Cover/scene image generation | `imagen-4.0-generate-001` | Imagen 4 via `:predict` endpoint |
| Passport stamp SVG generation | `claude-haiku-4-5-20251001` | Generates SVG code with guilloche, arced text, landmarks |
| Mission debrief | `claude-sonnet-4-6` | Classified narrative from photos/lore with vision |
| Title suggestions from lore | `claude-haiku-4-5-20251001` | 5 title options from lore text |
| Studio restyle — scene analysis | `gemini-2.5-flash` | Vision: describes scene using saved gent identities |
| Studio restyle — noir generation | `gemini-2.5-flash-image` | Text-only generation from scene description (no photo input — prevents filter-only output) |
| Studio from-scratch backgrounds | `imagen-4.0-generate-001` | Noir geometric style backgrounds when no cover photo |

**Critical model notes:**
- `gemini-2.0-flash` is deprecated for new API keys (404 "no longer available to new users"). Use `gemini-2.5-flash`.
- Claude refuses prompts that ask for appearance scoring, social categorisation ("Immediate Interest"), or openers for meeting someone. Do not send photo analysis to Claude.
- All Gemini `fetch()` calls in Edge Functions must use an `AbortController` with a 20s timeout — Supabase free tier kills functions at ~25s at the infrastructure level, which returns a non-2xx that our catch block cannot intercept.
- **Edge function JWT**: All edge functions have `verify_jwt = false` in `supabase/config.toml`. Deploy workflow uses `--no-verify-jwt` flag. New edge functions MUST be added to config.toml or they'll reject app requests with 401 Invalid JWT.
- **Edge function photo URLs**: Claude API sometimes can't fetch Supabase Storage URLs (400 "Unable to download"). Edge functions that accept photo URLs should retry text-only on 400 failure (see `generate-mission-debrief` pattern).

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

Client: `src/hooks/useVerdictIntake.ts` — compresses all images to 1024px WebP (0.82 quality) before upload. `handleAnalyzeFile(file, sourceType)` takes explicit source type. Handle lookup was removed (unavatar.io Instagram provider is dead).

**Claude prompt for screenshots**: tightened for private/closed profiles — instructs Claude to examine small profile picture thumbnails closely, extract maximum detail from bio text, highlight covers, and grid previews. Confidence score reflects image quality.

**UI entry point**: FAB on Circle's POI tab opens `ScanActionSheet` (bottom sheet) with two options:
- **Research** — Instagram screenshot analysis → opens `POIModal` in `research` mode
- **Scan** — Camera or photo from gallery → opens `POIModal` in `scan` mode
`POIModal` receives a `mode` prop and no longer has an internal toggle.

## ReactFlow canvas height
Shell uses `min-h-dvh` (not `h-dvh`), so `flex-1` children have no definite height → canvas is 0px (black screen). Always use `style={{ height: 'calc(100dvh - Xpx)' }}` where X = TopBar + SectionNav heights. Current: `calc(100dvh - 96px)` (TopBar 56px + SectionNav 40px).

## Instagram photo auto-fetch
When a contact has an Instagram handle, `photo_url` is `https://unavatar.io/instagram/{handle}`. On edit, only updates if the handle actually changed.

## Night Out flavours
- `metadata.flavour`: optional tag — `'live_music'` or `'movie_night'` (undefined = regular).
- `metadata.song`: optional, only for `live_music` flavour.
- NightOutForm shows flavour pills (Regular / Live Music / Movie Night) below title. Song field appears when Live Music selected.
- Lore generation: `live_music` gets a piano-focused directive; other flavours and undefined fall back to standard Night Out directive.
- Studio: `LiveMusicCard` (4 variants: Marquee, Poster, Setlist, Vinyl) — no BrandMark, registered with `requiresFlavour: 'live_music'`. Only shown when entry has matching flavour. Regular Night Out V1-V4 always shown.

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
- **Lore on creation**: `EntryNew` calls `generateLoreFull()` (not `generateLore()`) after entry creation. Saves lore, `lore_oneliner` (to metadata), and `suggested_title` (updates entry title) in a single `updateEntry` call + `updateEntryLore`.
- **Creator-only controls**: `LoreSection` accepts a `readOnly` prop. When true, Director's Notes and Generate Lore button are hidden. Non-creators can read lore but not generate/regenerate it.

## Title generation (`supabase/functions/generate-title/`)
- Uses `claude-haiku-4-5-20251001`. Two modes:
  - **Photo mode**: vision on the first uploaded photo during entry creation. Client compresses to 512px / 0.6 quality base64.
  - **Lore mode**: text-only, extracts a title from existing lore. Triggered via the **Type** button in EntryDetail TopBar (creator-only, visible when lore exists).
- Client: `generateTitle(file, type, context)` for photo mode, `generateTitleFromLore(lore, type, context)` for lore mode. Both share `invokeGenerateTitle()` in `src/ai/title.ts`.
- Type-specific instructions guide what to identify (cut of meat for Table, game on screen for Pitch, drinks for Toast, etc.).
- Suggested title auto-fills the form's title field unless the user has manually edited it.
- Title suggestion banner in EntryDetail uses independent animation (not `staggerItem`) so it appears correctly after async generation.
- For Table and Pitch, the AI title is combined with a **chronological volume number** (e.g. "Wagyu Tataki at Craft · Vol. 12").
- Vol numbers are date-ordered (oldest = Vol. 1). `getChronologicalVol(type, date)` counts entries with `date <= newDate`.
- After creating an entry, `renumberVolumes(type)` fire-and-forget updates all `· Vol. N` titles to reflect correct order.
- Adding a past-dated entry renumbers all existing entries of that type.

## Passport stamps
- Mission entries auto-create a passport stamp on publish via `createMissionStamp()` in EntryNew.
- **SVG stamps by Claude Haiku**: `generate-stamp` edge function uses Claude to produce SVG with guilloche borders, arced city/country text, year, country code, and city-specific landmark silhouettes. Stored as `.svg` in Supabase Storage.
- "Regen Stamps" button on Passport stamps view regenerates all existing stamps with current SVG engine.
- All fire-and-forget — doesn't block entry creation.
- **Backfill**: `backfillMissionStamps()` in `src/data/stamps.ts` creates stamps for any published mission entries missing them. Called from `usePassport` once per session (guarded by `sessionStorage`).

## Passport pages & templates
- **Cover**: uses real Pasoš cover image (`public/passport-cover.png`) with gent personalization overlay (avatar, name, alias, stats, travel intel).
- **Visa page (in-app)**: `/passport/visa/{stampId}` — cream passport aesthetic (`#F5F0E1`), navy text, "VIZE-ВИЗЕ-VISAS" header, stamp, polaroid photo, data fields, debrief section.
- **AI Mission Debrief**: "Generate Mission Debrief" button calls `generate-mission-debrief` edge function (`claude-sonnet-4-6`). Retries text-only if photo URLs fail (400). Returns classified narrative, landmarks, highlights, risk assessment. Stored in `entry.metadata`. `verify_jwt = false` in config.toml.
- **Visa carousel export** (`src/export/templates/visa-carousel/`): dynamic Instagram carousel (2–7 slides, all 1080×1350):
  - `VisaCardSlide` — photo band (480px, uses `getCoverCrop`), flag+VIZA, destination (48px), bearer row (56px avatars), one-liner + stamp in flex row (not absolute)
  - `HeroLoreSlide` — cover photo top half, one-liner, title+date, participant avatars
  - `PhotoGridSlide` — 2×2 photo grid (4 per slide, max 3 slides), title+date header
  - `DebriefSlide` — classified badge, debrief text, landmark pills, highlights, risk assessment
  - `StampSlide` — large centered stamp with city+country+date
  - `buildVisaCarouselManifest(entry, photoCount, stamp)` — determines which slides to include
- **Other Studio export templates** (all 1080x1350, 4:5):
  - `DebriefPage` — standalone debrief notes page (cream guilloche paper)
  - `PassportIdPage` — gent identity page with portrait, station, signature drink, issue date
- **Shared component**: `PassportFrame` in `src/export/templates/shared/` — cream background, SVG guilloche border pattern, Europe map watermark, footer. Used by all passport templates.
- Non-mission stamps still use the StampDetail modal.

## Passport achievements
- Achievements tab in Passport renders earned + locked achievements from `fetchEarnedAchievements(gentId)`.
- Compares against `ACHIEVEMENT_DEFINITIONS` to show locked items greyed out with "???" descriptions.
- Component: `src/components/passport/AchievementList.tsx`.

## Passport cover & texture
- Cover: `public/passport-cover.png` background image with gent overlay (avatar, name, alias, stats, travel intel, "Open Passport" button).
- Multi-language text "PASOŠ · ПАСОШ · PUTOVNICA · PASSPORT" and chip icon on cover, matching physical passport.
- `composeTravelIntel()` in `src/ai/travelIntel.ts` — travel summary on cover.
- Stamp grid: dark gradient background with gold border and inset glow.
- StampDetail modal: aged paper gradient background.

## In-app Visa Page (`src/pages/VisaPage.tsx`)
- Two-part layout: dense artifact card (top) + magazine-style story (below).
- **Visa card**: photo band (h-40 with gradient overlay, uses `getCoverCrop(entry)` for position, flag+VIZA overlaid), destination block (city large, date+duration badge), bearer row (vertical "BEARERS" label, participant avatars+aliases), one-liner + stamp in flex row (stamp right-aligned, not absolute — avoids text overlap).
- **Magazine story**: "The Mission" section with hero photo, lore paragraphs with gold drop-cap, interspersed photo pairs; "Intelligence Report" section with debrief card (gold border, classified badge, landmarks, highlights, risk assessment).
- Helpers: `calcDuration(start, end)`, `loreParagraphs(lore)`, `SectionDivider` component.
- Data fetching unchanged: entry, stamp, photos, participants via existing hooks.

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
- **Shared template utilities** (`src/export/templates/shared/utils.ts`): `getOneliner(entry)` extracts oneliner or falls back to first sentence. `VARIANT_INNER` CSS constant for inner variant layout. `monthYear(date)`, `calcDuration(start, end)`, `visaWord(cc)` for visa/passport templates. `aliasDisplay(alias, fullAlias)` maps gent aliases to display names.
- **Visa carousel** (mission entries): `VisaCarouselPreview` wraps all carousel slides, shows one at a time with dot nav + prev/next arrows. `activeSlide` state is lifted to Studio parent and passed as props; `onStateReady` callback reports manifest/export state back to parent via `useMemo`-stabilised object. "Export Slide" (single) and "Export All" (full carousel via `exportMultipleToPng` → `shareMultipleImages`) buttons.
- **Passport templates** (mission entries): `DebriefPage` (standalone debrief notes), `PassportIdPage` (gent identity — standalone, not entry-linked). All use `PassportFrame` shared component.
- **Export fix**: `exportToPng` in `src/export/exporter.ts` inlines external background-image URLs as data URLs before export to fix CORS issues with `html-to-image`. Restores originals after. No hardcoded dimensions in `EXPORT_OPTIONS` — element ref dimensions drive the export (1080x1350 for 4:5, 1080x1080 for square templates like CallingCard/AnnualWrapped).
- **Template variant architecture**: Variant templates (NightOutCard, MissionCarousel, PS5MatchCard, SteakVerdict) use `forwardRef` wrapper with `style={ROOT}` (fixed dimensions + bg). Inner variant functions use `VARIANT_INNER` from `shared/utils.ts` (100% width/height fill). This ensures `html-to-image` captures the full template including absolutely-positioned `BackgroundLayer`.
- **Multi-slide export**: `exportMultipleToPng(elements)` processes slides sequentially; `shareMultipleImages(blobs, prefix)` uses Web Share API with download fallback.

## Creator-only entry controls
- `EntryDetail` computes `isCreator = gent?.id === entry.created_by` once, used throughout.
- **Creator sees**: Generate/Regenerate Lore, Generate Scene, Edit Entry, Delete Entry (options menu + bottom actions), lore-based title button (TopBar).
- **All gents see**: Pin/Unpin, Export to Studio, view lore (read-only), view photos, reactions, comments.

## Chronicle search & pinning
- **Search**: `SearchBar` component in Chronicle with debounced (300ms) client-side filtering across title, description, location, city, and lore. Hook: `useChronicle` exposes `query`/`setQuery`; filtering is memoized via `useMemo`.
- **Pin**: `pinned: boolean` on entries (DB column, default false). `togglePin(entryId, pinned)` in entries.ts. Pinned entries sort first (`pinned DESC, date DESC`). Pin toggle on EntryCard + EntryDetail overflow menu. Gold left-border accent on pinned cards.

## Private entries
- `visibility: 'shared' | 'private'` on entries (DB column, default 'shared'). Private entries filtered client-side in `fetchEntries` via `currentGentId` param — only the creator sees their private entries.
- Toggle in EntryNew: Lock/Unlock icon before submit button. Lock icon shown on private EntryCards.

## Mission date range
- MissionForm has Start Date and End Date (optional) inputs.
- `date_end` stored in `entry.metadata.date_end` (not a DB column — avoids migration).
- Display format: "Budapest, Hungary · Mar 5 – 12, 2026" when range, single date otherwise.

## Pitch form
- `PlaystationForm` has Title, Date, Location, and Matches fields.
- Auto-fills date and location from photo EXIF via `detectedLocation` prop.
- Location passed through `submitPlaystation` to `createEntry`.

## Entry geo fallback
- `EntryNew.handleSubmit` falls back to `locationFill` city/country/country_code when the form doesn't provide them. This ensures non-Mission entry types (Night Out, Steak, Toast, etc.) get geo data from photo EXIF or saved places, fixing "Unknown City" on the Dossier Map.

## Dossier-style person profiles
- `PersonDetail.tsx` styled as an intelligence dossier with "DOSSIER NO." header, monospace dates, rotated gold stamp for tier.
- **Encounter Log**: vertical timeline of entries the person appeared in (max 10), from `usePersonDossier` hook.
- **Last Seen**: most recent entry appearance shown below profile info.
- **Known Associations**: horizontal scroll of co-appearing people (from shared entries).
- **Visual Evidence**: 3-column grid of photos from tagged entries (max 9).
- **Redacted empty fields**: empty notes show stacked grey bars instead of italic placeholder.
- Section headers: "FIELD NOTES", "ENCOUNTER LOG", "KNOWN ASSOCIATIONS", "VISUAL EVIDENCE".
- Data hook: `src/hooks/usePersonDossier.ts` — fetches appearances, entries, co-appearing people, photos in parallel.

## Scan traits as labels
- When a POI is added to Circle via scan, `trait_words` from the verdict auto-populate as person `labels`.
- Set in `useVerdictIntake.ts` line ~196: `labels: verdictResult?.verdict?.trait_words ?? []`.

## Birthday and horoscope
- `birthday` date column on `people` table. Editable in PersonForm.
- `getZodiacSign(birthday)` in `src/lib/horoscope.ts` derives zodiac sign client-side.
- Displayed on PersonDetail with cake icon + sign name.

## Mind map interactivity (`/circle/map`)
- **Draggable nodes**: person nodes persist positions to `localStorage` (`codex_mindmap_positions`). Gent nodes drag with snap-back to triangle.
- **Tier change on drop**: dragging a contact into a different ring zone shows a confirmation banner. POI nodes excluded.
- **Connection strength**: edge thickness scales with appearance count (1.5px → 2.5px → 3.5px for gent edges).
- **Activity pulse**: gold breathing glow on person nodes that appeared in entries within the last 7 days. CSS `@keyframes pulse-ring`.
- **Search**: search icon → expandable input, dims non-matching nodes, auto-fits view to 1-3 matches.
- **Ring guides**: concentric dashed circles with labels (Inner Circle, Outer Circle, Acquaintance, POI) rendered via `RingGuides.tsx`.
- **Reset Layout**: chip in filter area clears all saved positions from localStorage.
- Data: `useMindMap` hook in `src/hooks/useMindMap.ts`, layout in `src/lib/mindMapLayout.ts`.

## Circle multi-gent relationships
- `person_gents` table: many-to-many between people and gents (who "knows" this person). RLS: authenticated users can select/insert/delete.
- `fetchPersonGents(personId)` / `updatePersonGents(personId, gentIds[])` in people.ts.
- PersonDetail: "Known by" button shows multi-select modal — toggle gents on/off.
- `added_by` remains for audit (who originally added); `person_gents` drives the "Known by" UI.

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

## Public showcase (`src/pages/Showcase.tsx`)
- Public-facing page at `/` — no auth required. Instagram link-in-bio destination.
- Logged-in gents auto-redirect to `/home`. Login page moved to `/login`.
- Five sections: ShowcaseHero (logo, title, "The Gents Lounge" pill), GentCards (portrait, alias, stats, signature drink, threshold label), FeaturedChronicle (pinned+shared entries as cream cards with polaroid photos), TravelMap (static SVG with gold pins on mission cities), ShowcaseFooter.
- Data: `src/data/public.ts` — public queries using anon RLS policies. Only pinned+shared+published entries visible.
- `/lounge` redirects to `/home` (protected).
- Travel map: `CITY_COORDS` lookup in `TravelMap.tsx` maps city names to SVG coordinates. Add new cities as missions grow.
- Anon RLS policies in `20260317200000_public_showcase.sql`: `gents` (full select), `entries` (pinned+shared+published only), `entry_participants` (for publicly visible entries), `gent_stats` view (granted to anon).

## Deployment workflow
```bash
git add <files> && git commit -m "..." && git push
# GitHub Actions deploys Vercel + all Supabase Edge Functions automatically
# See .github/workflows/deploy.yml
```

## Related projects (for reference)
- `C:\...\Tonight` — Social game app. Source of avatar prompt patterns.
- `C:\...\The Grand Tour` — Italy trip PWA.
