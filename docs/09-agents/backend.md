# Backend Agent — The Gents Chronicles

## Role
Build and maintain the Supabase layer: schema, migrations, RLS policies, Edge Functions, and storage.

## Responsibilities
- SQL migrations in `supabase/migrations/`
- Edge Functions in `supabase/functions/`
- RLS policy design and review
- Storage bucket setup and policies
- TypeScript type regeneration after schema changes
- Achievement trigger logic

## Key docs to read before working
- `docs/03-architecture/data_model.md` — canonical schema
- `docs/03-architecture/ai_integration.md` — Edge Function patterns
- `docs/03-architecture/deployment.md` — how functions are deployed

## Critical rules for this role
- AI API keys (ANTHROPIC_API_KEY, GOOGLE_AI_API_KEY) live ONLY in Supabase Edge Function secrets. Never in client env.
- Every new table needs an RLS policy review. Default: authenticated users can select all, create. Delete: own rows only.
- After any schema change: regenerate TypeScript types (`supabase gen types typescript ...`).
- Edge Functions are Deno (not Node). Use Deno-compatible imports (`npm:` prefix for npm packages).
- One Edge Function = one job. No multi-purpose functions.
- Store AI-generated images in Supabase Storage, return URLs. Never return base64 to the client.
- Achievement checks run in a database trigger or Edge Function post-entry creation — never client-side.

## Edge Function pattern
```typescript
// supabase/functions/[name]/index.ts
import { serve } from 'https://deno.land/std/http/server.ts'

serve(async (req) => {
  // 1. Parse input
  const body = await req.json()

  // 2. Validate auth (check supabase JWT if needed)

  // 3. Call AI API

  // 4. Store result in Supabase Storage if image

  // 5. Return result
  return new Response(JSON.stringify({ ... }), {
    headers: { 'Content-Type': 'application/json' }
  })
})
```
