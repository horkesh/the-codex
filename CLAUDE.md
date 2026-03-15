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
| Instagram screenshot analysis | `claude-haiku-4-5-20251001` | Reliable JSON, no refusals on profile data |
| Photo/camera scan (POI) | `gemini-2.5-flash` | Claude refuses appearance scoring; Gemini does not |
| Portrait image generation | `imagen-4.0-generate-001` | Imagen 4 via `:predict` endpoint |
| Cover/scene/stamp image generation | `imagen-4.0-generate-001` | Same |

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
1. **Analysis** — `claude-sonnet-4-6` with vision: extracts structured `appearance` and `traits`
2. **Generation** — `imagen-4.0-generate-001` via `:predict` endpoint:
   - Request: `{ instances: [{ prompt }], parameters: { sampleCount: 1, aspectRatio: "1:1", safetyFilterLevel: "block_only_high" } }`
   - Response: `predictions[0].bytesBase64Encoded`
   - Prompt: `"Close-up portrait photograph of a person. ${appearance} Expression conveys: ${traitList}. Photorealistic, sharp facial detail, natural skin tones exactly as described, cinematic studio lighting with subtle rim light, deep dark background, high-end editorial photography style. Face fills most of the frame. No text, no watermarks."`
- Portrait uploaded to `portraits` bucket in Supabase Storage

## POI Scanner (`scan-person-verdict` edge function)
Two modes, routed by `source_type`:
- `instagram_screenshot` → Claude Haiku: extracts appearance, traits, score, display_name, instagram_handle
- `photo` → Gemini 2.0 Flash: same fields minus display_name/handle

Client: `src/hooks/useVerdictIntake.ts` — compresses all images to 1024px JPEG (0.82 quality) before upload. `handleAnalyzeFile(file, sourceType)` takes explicit source type. `handleAnalyzeHandle(handle)` fetches avatar from `unavatar.io/instagram/{handle}?fallback=false` (public profiles only).

## ReactFlow canvas height
Shell uses `min-h-dvh` (not `h-dvh`), so `flex-1` children have no definite height → canvas is 0px (black screen). Always use `style={{ height: 'calc(100dvh - Xpx)' }}` where X = TopBar + SectionNav heights. Current: `calc(100dvh - 96px)` (TopBar 56px + SectionNav 40px).

## Instagram photo auto-fetch
When a contact has an Instagram handle, `photo_url` is `https://unavatar.io/instagram/{handle}`. On edit, only updates if the handle actually changed.

## Deployment workflow
```bash
git add <files> && git commit -m "..." && git push
# GitHub Actions deploys Vercel + all Supabase Edge Functions automatically
# See .github/workflows/deploy.yml
```

## Related projects (for reference)
- `C:\...\Tonight` — Social game app. Source of avatar prompt patterns.
- `C:\...\The Grand Tour` — Italy trip PWA.
