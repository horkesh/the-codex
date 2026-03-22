# The Gents Chronicles — CLAUDE.md

## What this is
Private lifestyle chronicle app for The Gents. Deployed at https://the-codex-sepia.vercel.app. Three active users + one retired operative (Mirza), invite-only Supabase Auth (magic link). Not commercial.

## Stack
- **Frontend**: React 19 + TypeScript + Vite 6 + Tailwind v4 + Framer Motion + Zustand 5 + Google Maps JS API
- **Backend**: Supabase (Auth + Postgres + Storage + Edge Functions on Deno)
- **AI**: Anthropic Claude (`claude-haiku-4-5-20251001` for Instagram analysis, `claude-sonnet-4-6` for lore/narrative) + Google Gemini (`gemini-2.5-flash` for photo vision, `imagen-4.0-generate-001` for image generation)
- **Deploy**: `git push` to `main` — GitHub Actions (`.github/workflows/deploy.yml`) auto-deploys Vercel + Supabase DB migrations (`supabase db push`) + all Edge Functions. See `docs/05-dev-ops/runbook.md`. Requires `SUPABASE_DB_PASSWORD` secret in GitHub repo settings.

## Key architecture decisions
- **No service worker** — VitePWA is set to `selfDestroying: true`. The SW caused persistent deadlocks by caching Supabase calls. Do not re-enable runtime caching.
- **Auth listener** — `useAuthListener` in `src/hooks/useAuth.ts` must NOT `await` Supabase calls inside `onAuthStateChange`. supabase-js v2 holds an internal lock during the callback; calling `fetchGentById` inside it deadlocks all page queries. The fix is `setTimeout(() => fetchGentById(...).then(setGent), 0)`.
- **Auth initialization** — `useAuthStore` has an `initialized` flag (not persisted). Set to `true` when `INITIAL_SESSION` fires. `ProtectedRoute` in `App.tsx` renders immediately if `gent` is in the store (from localStorage persist); only blocks (returns `null`) if `gent` is null AND `initialized` is false. Do NOT redirect before initialized — Zustand persist hydration can lag the first render, causing a spurious redirect to Landing.
- **Zustand persist** — Auth store (`codex-auth`) persists `gent` to localStorage (not `initialized`). Pages render immediately with persisted data while the auth listener re-validates in background.
- **No grain overlay** — `body::after` grain CSS animation was removed permanently. It ran a feTurbulence SVG at 10 steps/8s and caused visible performance degradation.
- **Stagger animations on Home** — Do NOT use `staggerContainer`/`staggerItem` variants on the section cards in `Home.tsx`. The stagger container mounts after Zustand persist hydration fires, which happens after `AnimatePresence`'s initial render — so `initial={false}` on `AnimatePresence` no longer suppresses the `opacity:0` initial state, leaving cards invisible. Section cards render without an initial variant; `PageWrapper`'s `fadeUp` provides the page entrance animation.
- **Code splitting** — All pages are lazy-loaded via `React.lazy()` in `App.tsx` with a `Suspense` fallback. Vite config splits vendor chunks (`framer-motion`, `zustand`, `react-dom`) to improve caching and initial load.

## Maps (Google Maps API)
- **Library**: Google Maps JavaScript API via `@googlemaps/js-api-loader`. Leaflet/OpenStreetMap was removed.
- **Env var**: `VITE_GOOGLE_MAPS_API_KEY` — required in `.env` (see `.env.example`).
- **Loader**: `src/lib/geo.ts` exports `getGoogleMaps()` which lazy-loads the API once and caches the instance. All map consumers call this instead of importing Google Maps directly.
- **Components**: `DossierMap` (full-screen dark-styled map with entry markers), `MapPicker` (location selector in forms), `Places` page (saved places map).
- **Dark style**: custom `styles` array in `geo.ts` — dark grey land, darker water, gold labels, no POI icons. Consistent across all map views.

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
| Mission photo analysis | `gemini-2.5-flash` | Per-photo vision: scene type, venue, food, gents, ephemera, mood, quality score |
| Mission narrative generation | `claude-sonnet-4-6` | Multi-stage: per-scene, per-day (briefing/narrative/debrief), trip arc, verdict. Soundtrack-aware prose. |
| Mission single-scene regen | `claude-sonnet-4-6` | Director's Cut: regenerate one scene narrative with director's note context |
| Noir narrator rewrite | `claude-haiku-4-5-20251001` | Rewrites lore in 1940s hardboiled voice before TTS |
| Text-to-speech narration | OpenAI `tts-1` (`onyx` voice) | Deep male narrator for lore/debrief audio |
| Soundtrack suggestion | `claude-haiku-4-5-20251001` | Suggests real Spotify track from lore mood/context |
| Spotify search | Spotify Web API (Client Credentials) | Track search for mission soundtrack selection |
| PS5 trash talk | `claude-haiku-4-5-20251001` | Personality-aware match commentary + roast + rivalry arc |

**Critical model notes:**
- `gemini-2.0-flash` is deprecated for new API keys (404 "no longer available to new users"). Use `gemini-2.5-flash`.
- Claude refuses prompts that ask for appearance scoring, social categorisation ("Immediate Interest"), or openers for meeting someone. Do not send photo analysis to Claude.
- All Gemini `fetch()` calls in Edge Functions should use an `AbortController` with a reasonable timeout (55s for Imagen/Gemini). Supabase is on the **Pro plan** — edge functions can run up to 150s (not the 25s free-tier limit).
- **Edge function deployment**: GitHub Actions `supabase functions deploy` can SKIP functions with "No change found" even when code changed. Verify edge function changes deployed; if skipped, manually deploy: `npx supabase functions deploy <function-name> --project-ref <ref> --no-verify-jwt`.
- **Edge function JWT**: All edge functions have `verify_jwt = false` in `supabase/config.toml`. Deploy workflow uses `--no-verify-jwt` flag. New edge functions MUST be added to config.toml or they'll reject app requests with 401 Invalid JWT.
- **Edge function photo URLs**: Claude API sometimes can't fetch Supabase Storage URLs (400 "Unable to download"). Edge functions that accept photo URLs should retry text-only on 400 failure (see `generate-mission-debrief` pattern).

## Design system
- Colors: obsidian `#0a0a0f`, gold `#c9a84c`, ivory `#f5f0e8`
- Fonts: Playfair Display (`font-display`), Instrument Sans (`font-body`)
- Language: "Gents" not "users", "Chronicle" not "feed", "Mission" not "trip", "Circle" not "contacts"
- **No emojis** anywhere in the UI — they undermine the premium aesthetic. Use CSS ornamental elements instead.
- **App imagery:** Entry-type images (1–7) in `public/entry-types/*.webp`; empty-state images (8–11) in `public/empty-states/*.webp`. Prompts and paths: `docs/03-architecture/entry_type_image_prompts.md`.
- **Date format**: DD/MM/YYYY everywhere (European). `formatDate()` in `src/lib/utils.ts` outputs `05/03/2026`. Month+year labels (e.g. photo timeline, visa pages) use `en-GB` long month format ("March 2026").

## Comfort mode (accessibility)
- **Purpose**: larger text and tap targets for gents with vision difficulties.
- **Base font-size**: 17px for all users (bumped from 16px). Comfort mode: 20px.
- **Fixed-pixel text overrides** in `src/styles/globals.css`: `text-[8px]`→11px, `text-[9px]`→12px, `text-[10px]`→13px, `text-[11px]`→14px via `!important` rules on `html.comfort-mode`.
- **Minimum tap targets**: 44px on all buttons/links in comfort mode.
- **SectionNav**: wraps to 2 rows of 3 in comfort mode (`flex-wrap`, `flex-[0_0_33.33%]`). Icons 13→20px, labels 8→11px.
- **Home grid**: switches to `grid-cols-3` (2 rows of 3) in comfort mode for wider, more tappable cards.
- **Storage**: per-gent preference in localStorage (`codex-comfort-mode` key, JSON object keyed by gent ID).
- **Hook**: `src/hooks/useComfortMode.ts` — `useComfortMode()` applies the `comfort-mode` class on `<html>` based on logged-in gent's preference. Called in `AppContent` (App.tsx). `toggleComfortMode(gentId)` and `isComfortMode(gentId)` exported for use in components.
- **Toggle UI**: Profile page — Eye icon with switch, between Push Notifications and Toast Service Record.

## Portrait generation (`supabase/functions/generate-portrait/`)
Two-step pipeline (with photo-less fallback):
1. **Analysis** — `gemini-2.5-flash` with vision: extracts structured `appearance` and `traits`. **Skipped when no photo is provided** — falls back to stored descriptions from `_shared/gent-identities.ts` (`GENT_APPEARANCES`).
2. **Generation** — `imagen-4.0-generate-001` via `:predict` endpoint:
   - Request: `{ instances: [{ prompt }], parameters: { sampleCount: 1, aspectRatio: "1:1", safetyFilterLevel: "block_only_high" } }`
   - Response: `predictions[0].bytesBase64Encoded`
   - Prompt style: abstract geometric noir — minimalist geometric forms, cinematic noir lighting, moody desaturated palette, while faithfully preserving the subject's exact skin tone, hair, and facial features.
   - Same style used for Circle contacts (`generate-person-portrait`).
- Client (`src/ai/portrait.ts`): `photo_url` param is optional. When omitted, edge function uses stored identity for prompt construction.
- Portrait uploaded to `portraits` bucket in Supabase Storage

## POI Scanner (`scan-person-verdict` edge function)
Two modes, routed by `source_type`:
- `instagram_screenshot` → Claude Haiku: extracts appearance, traits, score, display_name, instagram_handle
- `photo` → Gemini 2.5 Flash: same fields minus display_name/handle

Client: `src/hooks/useVerdictIntake.ts` — compresses all images to 1024px WebP (0.82 quality) before upload. `handleAnalyzeFile(file, sourceType)` takes explicit source type. Handle lookup was removed (unavatar.io Instagram provider is dead).

**Claude prompt for screenshots**: tightened for private/closed profiles — instructs Claude to examine small profile picture thumbnails closely, extract maximum detail from bio text, highlight covers, and grid previews. Confidence score reflects image quality.

**UI entry point**: FAB on Circle's POI tab opens `ScanActionSheet` (full-height panel below header/nav/tabs, `top: 136px`) with two options:
- **Research** — Instagram screenshot analysis → opens `POIModal` in `research` mode
- **Scan** — Camera or photo from gallery → opens `POIModal` in `scan` mode
`POIModal` receives a `mode` prop and no longer has an internal toggle. Scan mode file input uses `accept="image/*"` without `capture` attribute — allows both camera and gallery on mobile.
**Radar empty state**: when POI tab has no people, shows inline Research + Scan cards (same large card style as ScanActionSheet) instead of a placeholder image. Tapping goes directly to POIModal in the correct mode, bypassing the action sheet.

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
- Mission: 40 photos, Night Out: 15, all others: 10
- `PhotoUpload` accepts `maxPhotos` prop; `usePendingPhotos(maxPhotos)` enforces the cap
- Limits set in `EntryNew.tsx` based on `selectedType`
- **Picker loading state**: `picking` state shows spinning gents logo (`logo-gold.webp`) + "Processing photos..." while the native gallery processes selected files. Clears on file arrival or picker cancel (via `window.focus` listener with 500ms debounce).

## Lore generation (`supabase/functions/generate-lore/`)
- Uses `claude-sonnet-4-6` with vision. Photo limits per type: mission up to 20, night_out up to 15, others up to 4.
- **Time-of-day is authoritative**: EXIF time from `entry.metadata.time_of_day` is explicitly marked as ground truth in the prompt. Claude must not infer a different time from photo lighting.
- **Weekday/weekend awareness**: day-of-week + time-of-day derive a situational hint (e.g. "weekday lunch window — likely a lunch break rendezvous") that is passed as `Context:` in the prompt.
- **Type-specific narrative directives**: each entry type (steak, playstation, toast, night_out, mission, gathering, interlude) has a tailored `entryTypeDirectives` block that tells Claude what to focus on (food details for Table, competitive energy for Pitch, drink references for Toast, etc.).
- **Mood tags** (`metadata.mood_tags`): string array of energy/vibe tags selected during entry creation. Generic moods (Chaotic, Elegant, Spontaneous, Mellow, Nostalgic, Euphoric) plus type-specific ones (e.g. Competitive/Grudge Match for Pitch, Indulgent/Refined for Table). Defined in `GENERIC_MOODS` + `TYPE_MOODS` in `EntryNew.tsx`. Claude is told to embody the mood, not name it. Reset when entry type changes.
- **Weather auto-fetch**: Edge function calls Open-Meteo archive API (free, no key) with entry date + city. Two calls: geocode city → lat/lng, then fetch daily weather (hi/lo temp + WMO weather code). 5s timeout per call, non-critical (silently skipped on failure). Weather line added to prompt; Claude instructed to let conditions colour the scene naturally.
- **Director's Notes** (`lore_hints` / `lore_hints_{gentId}`): per-gent free-text hints stored in `entry.metadata`. Each gent edits their own field (`lore_hints_{gentId}`). `collectAllHints()` in `LoreSection` combines all per-gent notes + legacy `lore_hints` field before sending to Claude. Auto-saves after 1s of inactivity via debounced `updateEntry`. Uses `entryRef` to read fresh metadata inside the timeout (prevents stale closure overwrites). UI shows "+N others" when other gents have contributed notes. Only entry participants can add notes (`isParticipant` check).
- **Full Chronicle mode** (`metadata.full_chronicle`): toggle on entry creation (mission/night_out only). Instead of 2-3 sentences, asks for 4-6 dense, meaningful sentences where every line earns its place with a specific detail, name, sensory moment, or insider observation. Not longer for the sake of length — depth over breadth. `max_tokens`: 600 (vs 400 default).
- **Lore on creation**: `EntryNew` calls `generateLoreFull()` (not `generateLore()`) after entry creation. Saves lore, `lore_oneliner` (to metadata), and `suggested_title` (updates entry title) in a single `updateEntry` call + `updateEntryLore`.
- **Creator-only generation**: `LoreSection` accepts `readOnly` and `gentId` props. Only the creator can generate/regenerate lore. All participants can add Director's Notes. Non-participants see lore read-only.

## Mission Intelligence Pipeline (`src/ai/missionIntel.ts`, `src/ai/missionLore.ts`)
- **Overview**: Missions now run a full AI-powered intelligence pipeline instead of simple lore generation. On photo upload, the pipeline: extracts EXIF GPS + timestamps → clusters photos into scenes by temporal proximity (45min) + GPS distance (500m) → sends photos to Gemini Flash for per-photo analysis → generates multi-stage narrative via Claude Sonnet → assembles complete MissionIntel dossier.
- **Scene Engine** (`src/lib/sceneEngine.ts`): `clusterIntoScenes()` groups photos by time gap (45min) + GPS distance (500m). `buildRoutes()` creates per-day GPS polyline data. `buildTempo()` calculates photo frequency over time for tempo graph.
- **Video Support** (`src/lib/videoKeyframes.ts`): `extractKeyframes()` pulls frames from video via HTML Canvas. `extractAudioClip()` extracts WAV audio via AudioContext for ambient analysis. `isVideoFile()` detects video MIME types.
- **Photo Analysis** (`supabase/functions/analyze-mission-photos/`): Gemini 2.5 Flash vision, batches of 4 photos. Returns per-photo JSON: scene_type, venue_name, description, gents_present, food_drinks, ephemera (OCR), mood, time_of_day_visual, quality_score, highlight_reason, unnamed_characters.
- **Narrative Generation** (`supabase/functions/generate-mission-narrative/`): Claude Sonnet 4.6. Two modes:
  - **Full mission**: generates per-scene narratives (1-2 sentences each), per-day chapters (briefing + narrative + debrief), overall trip arc (3-4 paragraphs), one-liner, 3 title suggestions, verdict (best meal, best venue, chaos, MVP scene, would return). Supports soundtrack-aware prose directives.
  - **Single scene**: Director's Cut mode — regenerates one scene narrative with a director's note incorporated.
- **Intel Builder** (`src/lib/missionIntelBuilder.ts`): `buildMissionIntel()` assembles scenes, routes, tempo, ephemera, highlights into the `MissionIntel` structure. `mergeNarratives()` applies AI-generated text back into the structure.
- **Cross-Mission Memory**: `fetchCrossMissionContext()` in `src/data/entries.ts` queries previous missions to the same city, builds context string for Claude to reference naturally ("Last time at 360 Bar...").
- **Data storage**: Complete intel stored in `entry.metadata.mission_intel` as `MissionIntel` JSON. Photos store GPS in `entry_photos.gps_lat`/`gps_lng` and AI analysis in `entry_photos.ai_analysis` (JSONB).
- **Processing overlay**: `MissionProcessingOverlay` component shows stage-by-stage progress during creation: uploading → EXIF → scenes → AI analysis → narrative → intel assembly → complete.
- **Fallback**: If the intelligence pipeline fails, falls back to legacy `generateLoreFull()` for basic lore generation.

## Mission Dossier UI (`src/components/mission/`)
- **MissionDossier**: Top-level vertical scroll layout replacing the old horizontal carousel. Orchestrates: sticky day nav → trip tempo graph → trip arc → day chapters → highlights → verdict → ephemera.
- **DayStickyNav**: Sticky horizontal pill bar for day/section navigation. Auto-highlights on scroll via IntersectionObserver.
- **DayChapter**: Single day's content: morning briefing (italic gold border-left), route map, scene cards, day narrative, evening debrief, food/drink inventory pills.
- **SceneCard**: Individual scene with hero photo (AI-selected by quality_score), time range, Gent presence bar, narrative, expandable photo strip. Creator gets edit pencil icon.
- **SceneEditor**: Director's Cut overlay — edit scene title, narrative text, add director's note + regenerate via AI.
- **RouteMap**: Google Maps with dark style, gold polyline connecting GPS points, gold dot markers. Uses `@vis.gl/react-google-maps`.
- **TripTempoGraph**: SVG waveform showing photo frequency over time. Gold bars on dark background, day boundary markers.
- **MissionVerdict**: End-of-trip verdict card: best meal, best venue, most chaotic moment, MVP scene, would return.
- **EphemeraGallery**: Collected text artifacts (menus, signs, tickets, receipts) in cream paper cards.
- **HighlightReel**: AI-curated top 5-7 photos with quality scores and highlight reasons.
- **GentPresenceBar**: Small avatar row showing which Gents were detected in each scene's photos.
- **GentPerspectives**: Multi-narrator per-scene notes. Each participating Gent can add their perspective.
- **SoundtrackPicker**: Optional mood picker (jazz/electronic/acoustic/rock/ambient/hiphop/classical) that shapes the AI narrative voice.

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
- **Mission layout (in-app)**: Mission entries render `MissionLayout` component inside `EntryDetail` instead of the generic layout. Shows visa card artifact (cream passport aesthetic), magazine-style lore with drop-caps + interspersed photos, intelligence report with debrief, and expandable "More" section for reactions/comments/actions. `/passport/visa/:stampId` redirects to `/chronicle/:entryId`. Passport stamp grid navigates directly to entry detail.
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
- QR code: tappable button opens modal with large QR + "Download QR" button (800x800 PNG). No inline display.

## Pizza party gathering flavour
- `metadata.flavour: 'pizza_party'` on gatherings, same pattern as Night Out flavours.
- **Pizza menu**: `metadata.pizza_menu: PizzaMenuItem[]` — each item has `name` + `toppings: string[]`.
- **PizzaMenuBuilder** (`src/components/gathering/PizzaMenuBuilder.tsx`): tap-to-toggle topping grid (19 toppings), max 8 pizzas.
- **PizzaSvg** (`src/lib/pizzaSvg.tsx`): procedural SVG pizza from toppings. `React.memo` wrapped. Seeded PRNG for deterministic layout.
- **Studio templates** (4, `requiresFlavour: 'pizza_party'`, 1080x1920): La Carta (menu card), The Invitation, Il Forno (hero pizza), Slice & Dice (countdown). All use `COLOR.brick` from shared utils.
- **Public invite** (`/g/{entryId}`): pizza party skin with animated entrance, live ticking countdown (d/h/m/s), tap-to-flip menu cards, host message quote, RSVP confirmation card, no email field.
- **RSVP → Circle**: attending guests auto-added as POI contacts via `submit-rsvp` edge function.
- **Push notifications**: minimal SW (`public/sw-push.js`, zero fetch interception). Creator notified on RSVP.
- **Shopping list**: auto-generated from pizza toppings on GatheringDetail (creator only), tappable cross-off.
- **OG meta**: Vercel serverless function at `api/og.ts` for `/invite/:slug` bot previews.

## Gathering location
- All gatherings use `LocationSearchModal` for place selection (Google Places + saved places + drop pin).
- `metadata.venue`, `metadata.address`, `metadata.lat`, `metadata.lng` stored in JSONB.
- Static map via `buildStaticMapUrl()` shown on form, detail, public invite, and Studio templates.
- `MapPicker` accessible from both the search modal ("Drop a pin on map" option) and the form (crosshair button).

## Gathering enhancements
- **Photos**: creator can upload photos during creation (PhotoUpload component) and on detail page.
- **Description**: creator can add/edit inline on detail page.
- **Host message**: `metadata.host_message` — creator text shown as italic quote on detail + public invite.
- **Live guest wall**: 2-column RSVP grid with real-time fly-in animation on GatheringDetail.
- **RSVP badge**: gold unseen count badge on EntryCard (creator only), reset on detail page visit.
- **Export to Studio**: button on pre-event gathering detail.

## Retired operative (Mirza)
- **4th gent**: `alias: 'operative'`, `retired: true`. No auth account — inserted directly with `gen_random_uuid()`.
- **GentAlias**: `'keys' | 'bass' | 'lorekeeper' | 'operative'`.
- **AI identity**: full appearance description + visual ID in `gent-identities.ts`. Key rule: visual guide is for photo identification ONLY — never describe appearances in narrative.
- **Participant selector**: "Show retired" toggle (hidden by default). Retired gent shown with faded styling + "Ret." badge.
- **GentProfile** (`/gents/operative`): desaturated portrait, "OPERATIVE STATUS: RETIRED" stamp, retirement citation, legacy stats, Honourable Discharge certificate.
- **Mind map**: positioned at outer edge (y:280), ghosted glow, desaturated.
- **Showcase**: card with desaturated portrait + "Retired" stamp overlay.
- **Passport**: Honourable Discharge certificate below stamp grid.
- **Lore directive**: when Mirza is participant, Claude told he was active at the time (retired AFTER). Subtle foreshadowing allowed once ("four at the table, as it was then") but never mention retirement.
- **Ghost effects**: EntryCard (faded avatar), EntryDetail ("featuring a retired operative"), Ledger (dimmed + "(ret.)").

## Agenda page
- **Unified feed**: merges gatherings (pre-event), scouting (prospects), and wishlist items. Dated items sorted by upcoming first, undated wishlist at bottom.
- **Icon submenu**: Gatherings / Scouting / Wishlist bar with icons + counts, navigates to dedicated sub-pages.
- **Swipe to delete**: each feed item swipeable left to reveal delete.
- **FAB**: gold Plus button opens action sheet (New Gathering / Scout Event / Wishlist).
- **Upcoming Gatherings** page at `/agenda/upcoming`.
- **Showcase**: "What's Next" section shows upcoming gatherings + scouted events on public page.

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
- **Export engine**: `html2canvas` (replaced `html-to-image` which had SVG serialization issues). Studio renders templates **twice**: once scaled at 0.28x for preview, once hidden at full 1080x1350 in an off-screen container (`position: fixed; left: -9999px`) for export. `exportRef` points to the hidden copy; `templateRef` points to the preview. This avoids transform/overflow issues. `useCORS: true` handles Supabase Storage images. `scale: 3` for Instagram-quality output.
- **Template variant architecture**: Variant templates (NightOutCard, MissionCarousel, PS5MatchCard, SteakVerdict) use `forwardRef` wrapper with `style={ROOT}` (fixed dimensions + bg). Inner variant functions use `VARIANT_INNER` from `shared/utils.ts` (100% width/height fill).
- **InsetFrame** (`src/export/templates/shared/InsetFrame.tsx`): decorative gold inset border on all dark-bg templates. 24px from edges, gold line at `rgba(201,168,76,0.25)`. Outer 24px edge strips darkened (`rgba(0,0,0,0.35)`) + blurred (`backdrop-filter: blur(6px)`). Gallery mat / vignette effect.
- **Template content alignment**: all template variants with background photos align content to the bottom (`justifyContent: 'flex-end'`) so faces in background photos stay visible at the top.
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
- Display format: "Budapest, Hungary · 05/03 – 12/03/2026" when range, single date otherwise.
- **Auto-fill**: when EXIF sets the start date and end date is empty, end date defaults to the last photo's EXIF date (via `lastPhotoDate` on `LocationFill`). Falls back to start date if only one photo.

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
- **Tier change on drop**: dragging a contact into a different ring zone shows a personality-driven confirmation banner (promotion: "You sure X deserves to be closer to you?", demotion: "You decided X is not worthy enough of the Inner Circle?"). Accepting clears saved position so node snaps to the new ring. POI nodes excluded.
- **Connection strength**: edge thickness scales with appearance count (1.5px → 2.5px → 3.5px for gent edges).
- **Activity pulse**: gold breathing glow on person nodes that appeared in entries within the last 7 days. CSS `@keyframes pulse-ring`.
- **Recency heat**: node ring color scales with days since last appearance — warm gold (≤7d), fading gold (≤30d), dim gold (≤90d), grey (dormant/never seen). Computed from `fetchEntryDates()` + appearances in `useMindMap`. Replaces static border classes with dynamic `box-shadow` rings.
- **Tap-to-focus**: first tap on a person highlights their network — co-appearing people (via shared entries) + connected gents. Everything else dims to 0.15 opacity. Second tap opens their detail sheet. Tapping a gent or another person clears the focus. Focused person gets a gold ring + glow + gold label. `focusedPersonId` state in `useMindMap`, `connectedToFocusedPerson` computed in `computeGraphData`.
- **Inter-contact edges**: person↔person edges connect people who co-appeared in entries. Thickness scales with shared count (0.5→1→1.5px). When a person is focused, their edges highlight in gold with appearance count labels.
- **Edge labels**: shown on person↔person edges only when one end is the focused person. Gold text, dark background, showing the shared appearance count.
- **Search**: search icon → expandable input, dims non-matching nodes, auto-fits view to 1-3 matches.
- **Ring guides**: concentric dashed circles with labels (Inner Circle, Outer Circle, Acquaintance, POI) rendered via `RingGuides.tsx`.
- **Reset Layout**: chip in filter area clears all saved positions from localStorage.
- Data: `useMindMap` hook in `src/hooks/useMindMap.ts`, layout in `src/lib/mindMapLayout.ts`. `fetchEntryDates()` in `src/data/entries.ts` for recency computation.

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
# GitHub Actions: Vercel → supabase db push (migrations) → Edge Functions
# See .github/workflows/deploy.yml
# Secrets required: VERCEL_TOKEN, SUPABASE_ACCESS_TOKEN, SUPABASE_DB_PASSWORD
```

## Toast Integration (The Toast ↔ Chronicles bridge)

The Toast is a standalone real-time cocktail party app (`C:\...\The Gents`). Sessions bridge to Chronicles via shared Supabase.

### Architecture
- Toast server POSTs session data to `receive-toast-session` edge function at session end
- Auth: HMAC-SHA256 signed token via `generate-toast-token` edge function, shared secret `TOAST_BRIDGE_SECRET` in Supabase Secrets
- Shared module: `supabase/functions/_shared/hmac-token.ts`
- Session creates a draft entry → Gent reviews at `/chronicle/draft/:id` → publishes

### Database tables
- `toast_sessions` — one row per session (code, duration, acts, vibe timeline)
- `toast_cocktails` — AI cocktails (name, story, image, crafted-for)
- `toast_confessions` — confession highlights (prompt, commentary, reactions)
- `toast_wrapped` — per-participant wrapped stats + AI note/title
- `toast_gent_stats` — cumulative role-specific stats (Keys/Bass/Lorekeeper)
- `toast_tracks` — DJ setlist (name, artist, album art, Spotify URL, Track of the Night)

All toast tables: RLS SELECT for authenticated, writes via service role key in edge function. Cascade delete from `entries` → `toast_sessions` → all child tables.

### Edge functions
| Function | Purpose | `verify_jwt` |
|----------|---------|-------------|
| `generate-toast-token` | Issues short-lived HMAC bridge JWT | `false` |
| `receive-toast-session` | Validates token, writes all session data | `false` |
| `cleanup-toast-drafts` | Deletes orphaned drafts older than 48h | `false` |

### UI
- **ToastLayout** (`src/components/chronicle/ToastLayout.tsx`) — card-based entry layout: session header, act carousel, cocktail gallery, confessions, wrapped strip, setlist (with Track of the Night), group snaps, optional lore
- **ToastDraftReview** (`src/pages/ToastDraftReview.tsx`) — draft review with title edit, guest match verification, confession removal, publish/discard
- **Home page** — "Host a Toast" button launches The Toast via token handoff
- **EntryNew** — toast type redirects to The Toast app instead of showing a form

### Profile enrichment
- **Circle contacts**: AI portrait, alias, traits as labels, Toast Honours on dossier (wrapped title, signature drink)
- **Gent profiles**: Toast Service Record (role-specific stats)
- **Ledger**: ToastStatsSection (sessions, cocktails, confessions, frequent guests)
- **Achievements**: 7 toast achievements (first_pour, bartender, confessor, chronicler_toast, regular, legendary_host, fifty_cocktails)

### Studio templates
- `toast_session_v1` through `v4` — 4 export variants (Classic with Track of the Night, Centered, Quote, Code)
- `toast_carousel` — multi-slide carousel wrapping variants 1-3

### Cron
- `.github/workflows/cleanup-toast-drafts.yml` — daily 3am UTC, cleans up orphaned toast drafts

## Momento — camera overlay feature (`/momento`)
- **Route**: `/momento` (protected). Linked from Home page.
- **Page**: `src/pages/Momento.tsx` — full-screen camera with styled overlays for instant shareable photos.
- **Camera hook**: `src/hooks/useCamera.ts` — `getUserMedia` with front/back toggle, no resolution constraint (uses native FOV to avoid zoom/crop on mobile). Captures via canvas `toBlob` (JPEG 0.92). Front camera mirrors via `scaleX(-1)`.
- **Gent selector**: tap avatars in controls bar to toggle which Gents appear in overlay signatures. All selected by default. `selectedGentIds` state filters `gents` array before passing to overlays.
- **Export**: hidden off-screen composite at 1080px wide, height computed from captured photo's native aspect ratio (`capturedAspect`). Typically 1080x1440 (3:4) on mobile. Uses `html2canvas` via `exportToPng`. Share via Web Share API with download fallback.

### Overlay templates (`src/components/momento/`)
All overlays implement `OverlayProps` from `types.ts`: `{ city, country, venue, date, time, gents }`.

| Template | File | Aesthetic | Key elements |
|---|---|---|---|
| Field Report | `FieldReportOverlay.tsx` | Military dossier | Classification badge, large time (64px), gold rule, avatars + "The Gents", logo |
| Marquee | `MarqueeOverlay.tsx` | Minimal elegant | Gold inset border, corner L-shape accents, centered city, logo + time |
| Noir | `NoirOverlay.tsx` | Cinematic | Letterbox bars (56px), ultra-minimal, no avatars, city + date only |
| Polaroid | `PolaroidOverlay.tsx` | Instant camera | White border frame (16px), cream caption strip (88px), gent first names, italic city |
| Neon | `NeonOverlay.tsx` | Nightlife | Thick gold border with glow, large neon time (72px), vignette, avatars with glow |
| Postcard | `PostcardOverlay.tsx` | Vintage travel | Dashed stamp area, "PAR AVION" stripe, postmark SVG, "GREETINGS FROM" + large city |
| Classified | `RedactedOverlay.tsx` | Intelligence leak | `[CLASSIFIED]` stamp, fake GPS coordinates (deterministic hash from city), black redaction bars, `EYES ONLY`, "FIELD OPERATIVES" label |
| Signal | `GlitchOverlay.tsx` | Digital corruption | RGB chromatic aberration text (3-layer offset), scanlines (repeating-linear-gradient), cyan/magenta glitch blocks, interference bar, `FEED::ACTIVE` status |

- **Shared**: `AvatarStack.tsx` — overlapping circular avatar row with configurable size/overlap/border.
- **Registry**: `OVERLAY_REGISTRY` + `OVERLAY_IDS` in Momento.tsx. Cycle with chevron buttons or swipe.
- **Venue**: `OverlayProps` includes optional `venue` field. When present, venue shows as primary location name; city/country become secondary. All 8 overlays support this pattern.

### Interactions
- **Swipe to cycle templates**: horizontal swipe on camera preview (50px threshold, must be more horizontal than vertical via 1.5x ratio). Chevrons kept as fallback. Single `touchStart` ref tracks `{x, y}`.
- **Gallery import**: `ImageIcon` button (left of shutter) opens native file picker (`accept="image/*"`). Selected photo enters captured mode via shared `commitCapture()` helper with same overlay/filter/export pipeline. `img.onerror` revokes object URL on failure.
- **Self-timer**: `Timer` button (right of shutter, stacked with flip camera). 3s countdown with animated number overlay (120px, Framer Motion scale+fade per digit via `key={countdown}`). Countdown state derives timer-active (`countdown !== null`). Auto-captures when countdown hits 0. Timer cleanup on unmount.
- **Publish to Chronicle**: `BookOpen` button in captured mode (left position). Creates `interlude` entry via `createEntry`, uploads styled export as cover via `uploadEntryPhoto` (PNG blob, `.png` extension), sets cover + registers participant in parallel (`updateEntryCover` + `addEntryParticipants`), navigates to entry detail.
- **Back button**: floating overlay on camera preview (top-left, `env(safe-area-inset-top)` aware), visible in both live and captured modes.
- **Venue picker**: tappable gold pill in controls bar opens `LocationSearchModal` with nearby places + search. Updates venue/city/country in overlays.

### State design
- `busy: 'exporting' | 'publishing' | null` — single union for mutually exclusive async operations. Disables all action buttons when non-null.
- `visibleGents` — memoized via `useMemo` to prevent re-renders on clock tick.
- Export filter baking: CSS filters baked into canvas data URL (`filteredExportUrl`) via `ctx.filter` because `html2canvas` doesn't support CSS filter. Grain overlay composited via temp canvas with `mix-blend-mode: overlay`.
- Export scale: `1080 / 390` ratio scales overlay from phone-screen size to export canvas size via CSS `transform: scale()`.

### Camera filters
User-toggleable CSS filters applied to video feed, captured image, and export composite. Horizontal pill strip in controls bar.

| Filter | CSS | Effect |
|---|---|---|
| None | *(none)* | Raw camera |
| Grain | `saturate(0.9) contrast(1.05)` + SVG noise overlay | Film grain texture, `mix-blend-mode: overlay` at 0.14 opacity |
| Mono | `grayscale(1) contrast(1.2)` | High-contrast black & white |
| Warm | `sepia(0.15) saturate(1.2) brightness(1.05)` | Golden hour warmth |
| Cool | `hue-rotate(15deg) saturate(0.8) brightness(0.95)` | Teal nighttime shift |
| Fade | `brightness(1.1) contrast(0.85) saturate(0.7)` | Lifted blacks, muted vintage |

- Grain uses inline SVG data URL with `feTurbulence` fractal noise, tiled at 128px.
- Filter state: `activeFilter` in Momento.tsx, default `'none'`.
- Filter CSS applied via inline `style={{ filter }}` on `<video>`, captured `<img>`, and export `<img>`.

### Location search modal (`src/components/places/LocationSearchModal.tsx`)
- Full-screen modal with Google Places Autocomplete search, used by both Chronicle entry creation and Momento.
- **Auto-suggestions on open** (no typing needed): 1) Current city from GPS reverse geocode, 2) Nearby venues (300m radius, up to 10) from Google Places Nearby Search, 3) Saved places.
- **Location-biased search**: autocomplete includes `locationBias` (50km radius circle around device GPS) so nearby results rank first.
- iOS safe area: `env(safe-area-inset-top)` padding on header to avoid notch/Dynamic Island overlap.

## Iftar & Eid Studio templates
- **IftarCard** (`src/export/templates/IftarCard.tsx`): 4 variants for Iftar (Table) entries. Warm amber accent (`#D4A843`), geometric border pattern, crescent + star SVG, text outline for photo legibility. Registered as `iftar_card` through `iftar_card_v4` with `requiresFlavour: 'iftar'`.
  - V1 (Crescent): centred, crescent above title, oneliner, date, participants
  - V2 (Spread): crescent header top-left, large title bottom, watermark top-right
  - V3 (Contemplative): centred, quiet, generous whitespace, quoted oneliner
  - V4 (Gathering): decorative top band with date + crescent, title + participants bottom
- **EidCard** (`src/export/templates/EidCard.tsx`): Single variant for Eid greeting. "Bajram šerif mubarek olsun" title + crescent in bottom half, "Eid Mubarak" label, text outline. Registered as `eid_card` with `requiresFlavour: 'eid'`.
- Both use `BackgroundLayer`, `InsetFrame`, `GeometricBorder` (repeating 45deg gold gradient), `CrescentMark` SVG.
- Text outline: multi-directional `text-shadow` for legibility against background photos.

## Interactive Timeline (`/chronicle/timeline`)
- Pannable, zoomable ReactFlow canvas showing all entries as nodes connected by a golden chronological thread.
- Horizontal layout: each month = 300px column, entries zigzag vertically within months.
- Custom nodes: `TimelineEntryNode` (cover photo + type badge + title + date), `TimelineMonthNode` (month label pill).
- Lightweight fetch: `fetchTimelineEntries()` selects only 5 columns (not full metadata/lore).
- Navigation: GitBranch icon on Chronicle page header.

## On This Day (`src/components/home/OnThisDayCard.tsx`)
- Home page card showing entries from previous years on today's date.
- `fetchOnThisDay()` queries entries matching `%-MM-DD` pattern, filters out current year.
- Shows up to 3 entries with cover thumbnail, title, "N years ago" label, city.
- Returns null (hidden) when no matching entries exist.

## The Vault — Time Capsules (`/vaults`)
- Seal a message for a future date. No peeking until the date arrives.
- DB: `vaults` table (message, opens_at, opened, created_by) with RLS per gent.
- Three groups: "Ready to Unseal" (date passed), "Sealed" (countdown), "Opened" (revealed).
- Sealed vaults show redacted bars (hidden message) + breathing gold glow + countdown.
- Quick date presets: 6 months, 1 year, 2 years.
- Linked from Home page.

## Rivalry Broadcast (`/ledger/rivalry`)
- Sports-broadcast-style PS5 rivalry dashboard.
- ELO rating system (`src/lib/elo.ts`): K=32, computes dynamic ratings from match history.
- Features: ELO leaderboard, head-to-head grid, win probability bars, active streaks, recent results.
- Breaking news ticker with data-derived headlines (streak records, dominance stats).
- CSS scanline overlay + pulsing red "LIVE" indicator for broadcast aesthetic.
- Linked from Ledger page.

## AI Narrator Voice
- **Listen button** on every entry with lore (via `ListenButton` component) + per-section on missions (debrief + each day).
- **Noir rewrite**: Before TTS, Claude Haiku rewrites lore in 1940s hardboiled noir detective voice. Original lore unchanged — only spoken narration gets noir treatment. Enabled by default (`noir=true` param).
- **OpenAI TTS**: `tts-1` model, `onyx` voice (deep male narrator). Edge function: `generate-narration`.
- **Caching**: MP3s stored in `narrations` Supabase Storage bucket. Cache key per section (`{entryId}`, `{entryId}-debrief`, `{entryId}-day-0`).
- **Hook**: `useNarration(cacheKey)` — manages generation, caching, play/stop, cleanup on unmount.
- **Global audio manager** (`src/lib/audioManager.ts`): singleton ensures only one narration plays at a time. Stops audio on: route navigation (`useStopAudioOnNavigate` in App.tsx), mission page swipe (`scrollToPage` in MissionLayout), app backgrounded (`visibilitychange` listener). No more phantom narrations.

## Mission Soundtrack
- Each mission gets a theme song. Auto-suggested by Claude Haiku after lore generation, searchable via Spotify.
- **Edge functions**: `spotify-search` (Client Credentials flow, cached token), `suggest-soundtrack` (Claude Haiku suggests song from lore).
- **Data**: `entry.metadata.soundtrack` — `{ name, artist, album, spotify_url, album_art, suggested_by }`.
- **UI**: `SoundtrackSection` on MissionLayout — album art, song name, artist, Spotify link, "Change" button, search modal with AI suggest.
- **Spotify keys**: `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET` in Supabase secrets.

## PS5 Rivalry Broadcast (upgraded)
- **ELO system** (`src/lib/elo.ts`): K=32, dynamic ratings from match history.
- **Match Commentary**: 2-3 sentence ESPN-style broadcast + devastating trash talk roast + rivalry arc narrative.
- **Memory**: Last 5 trash talk lines stored in localStorage, passed to Claude to avoid repetition. Full context: H2H record, streak, ELO, recent results, season context.
- **Audio**: "Play Commentary" button reads commentary + trash talk aloud via TTS narrator.
- **Season Awards**: Quarterly MVP + Biggest Choker computed from match data.
- **Wall of Shame**: Gent with worst current form (lowest ELO or longest losing streak).
- **News Ticker**: Auto-generated headlines from data (streak records, dominance stats).
- **Personality-aware**: Claude knows each gent's traits (Keys=strategic, Bass=aggressive, Lorekeeper=tactical).

## Planned features
- **Memory Mixtape**: Spotify-linked playlists from entries (infrastructure built, needs playlist creation flow)
- **Annual Film**: Auto-generated year-in-review video from photos + lore (client-side Canvas/MediaRecorder)

## Related projects (for reference)
- `C:\...\Tonight` — Social game app. Source of avatar prompt patterns.
- `C:\...\The Grand Tour` — Italy trip PWA.
- `C:\...\The Gents` — The Toast real-time cocktail party app. Bridges to Chronicles via shared Supabase.
