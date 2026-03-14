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
- Standard root style: `{ width: '1080px', height: 'Npx', backgroundColor: '#0D0D0D', overflow: 'hidden', position: 'relative' }`
