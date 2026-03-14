# The Codex — Napkin Rules

Active constraints and decisions that shape ongoing development.

## Data
- Private notes (`people_notes`) MUST always be filtered by both `person_id` AND `gent_id` — never gent_id alone
- Supabase returns `type: string` from queries on stamped tables — always cast with `as PassportStamp[]`
- Gathering entries use `type: 'gathering'` in the `entries` table, metadata JSONB holds all gathering-specific fields
- `createEntry` hardcodes status as 'published' — for gatherings, follow with `updateEntry` to patch to 'gathering_pre'

## AI / Edge Functions
- All AI calls (lore, cover, stamp, wrapped, portrait) are async and fire-and-forget — never block the UI
- Edge Functions use `Deno.serve` (NOT `addEventListener`)
- Public Edge Functions (submit-rsvp, submit-guestbook) use service role key to bypass RLS
- AI imports use `npm:` prefix: `import Anthropic from 'npm:@anthropic-ai/sdk'`

## UI
- Type badge colors come from `ENTRY_TYPE_META` in `src/lib/entryTypes.ts` — single source of truth
- Loading spinners MUST have try/catch/finally — `setLoading(false)` in finally, never just in happy path
- Real-time Supabase subscriptions MUST be cleaned up on unmount via `useEffect` return
- Timer refs (`setTimeout`, `setInterval`) MUST be cleared in `useEffect` cleanup to prevent memory leaks

## Export Templates
- All templates use `React.forwardRef<HTMLDivElement, Props>` — parent needs the ref for html-to-image
- Templates use fixed pixel dimensions (never Tailwind responsive) — they are image canvases, not UI
- Standard root style: `{ width: '1080px', height: 'Npx', backgroundColor: '#0D0B0F', overflow: 'hidden', position: 'relative' }`
- Templates use INLINE STYLES ONLY — Tailwind classes do not resolve reliably inside html-to-image
- All templates accept `backgroundUrl?: string` → render `<BackgroundLayer url={backgroundUrl} gradient="strong" />` as first child
- When BackgroundLayer is present, all content siblings need `position: 'relative', zIndex: 2` to float above it
- BackgroundLayer gradient presets: `'strong'` (0→50→88% opacity) for story/portrait, `'default'` for square
- All export templates are 4:5 format (1080×1350) — use `3:4` when calling Imagen (closest supported ratio; CSS cover handles the minor crop)
- All AI image generations (covers + template backgrounds) should include the gents naturally in the scene — three stylish men, seen from behind or at distance, contextually placed. No close-up portraits (that's `generate-portrait`)
- No emojis in templates — use text dividers and ornamental CSS elements instead
