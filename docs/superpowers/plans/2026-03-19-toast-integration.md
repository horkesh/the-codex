# Toast Integration Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate The Toast (real-time cocktail party app) with Chronicles via a Supabase bridge — session data flows into Chronicle entries, guests map to Circle contacts, gent role stats tracked.

**Architecture:** Toast server writes session data to shared Supabase via a `receive-toast-session` edge function. Chronicles renders rich Toast entries with a card-based `ToastLayout`. Auth handoff uses short-lived signed JWTs. Guest matching is auto + manual confirmation in a draft review screen.

**Tech Stack:** Supabase (Postgres + Edge Functions + Storage), React 19, TypeScript, Tailwind v4, Framer Motion, Zustand

**Spec:** `docs/superpowers/specs/2026-03-19-toast-integration-design.md`

---

## Chunk 1: Database & Infrastructure

### Task 1: Database Migration — Toast Tables

**Files:**
- Create: `supabase/migrations/20260319100000_toast_tables.sql`

- [ ] **Step 1: Write the migration file**

```sql
-- Toast session tables for The Toast ↔ Chronicles bridge

-- 1. toast_sessions — one row per Toast party session
CREATE TABLE IF NOT EXISTS toast_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id uuid REFERENCES entries(id) ON DELETE CASCADE NOT NULL,
  hosted_by uuid REFERENCES gents(id) NOT NULL,
  session_code text NOT NULL,
  duration_seconds integer NOT NULL DEFAULT 0,
  act_count integer NOT NULL DEFAULT 4,
  guest_count integer NOT NULL DEFAULT 0,
  vibe_timeline jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE toast_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read toast_sessions"
  ON toast_sessions FOR SELECT TO authenticated USING (true);

CREATE INDEX idx_toast_sessions_entry ON toast_sessions(entry_id);

-- 2. toast_cocktails — AI cocktails generated during session
CREATE TABLE IF NOT EXISTS toast_cocktails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES toast_sessions(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  story text,
  image_url text,
  round_number integer NOT NULL DEFAULT 1,
  act integer NOT NULL DEFAULT 1,
  crafted_for uuid REFERENCES people(id) ON DELETE SET NULL
);

ALTER TABLE toast_cocktails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read toast_cocktails"
  ON toast_cocktails FOR SELECT TO authenticated USING (true);

CREATE INDEX idx_toast_cocktails_session ON toast_cocktails(session_id);

-- 3. toast_confessions — confession round highlights
-- confessor_id is polymorphic (people.id or gents.id) — no FK constraint
CREATE TABLE IF NOT EXISTS toast_confessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES toast_sessions(id) ON DELETE CASCADE NOT NULL,
  prompt text NOT NULL,
  confessor_id uuid,
  confessor_is_gent boolean NOT NULL DEFAULT false,
  ai_commentary text,
  act integer NOT NULL DEFAULT 1,
  reaction_count integer NOT NULL DEFAULT 0
);

ALTER TABLE toast_confessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read toast_confessions"
  ON toast_confessions FOR SELECT TO authenticated USING (true);

CREATE INDEX idx_toast_confessions_session ON toast_confessions(session_id);

-- 4. toast_wrapped — per-participant wrapped stats
-- participant_id is polymorphic (people.id or gents.id) — no FK constraint
CREATE TABLE IF NOT EXISTS toast_wrapped (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES toast_sessions(id) ON DELETE CASCADE NOT NULL,
  participant_id uuid NOT NULL,
  is_gent boolean NOT NULL DEFAULT false,
  stats jsonb DEFAULT '{}'::jsonb,
  ai_note text,
  ai_title text
);

ALTER TABLE toast_wrapped ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read toast_wrapped"
  ON toast_wrapped FOR SELECT TO authenticated USING (true);

CREATE INDEX idx_toast_wrapped_session ON toast_wrapped(session_id);

-- 5. toast_gent_stats — cumulative role-specific stats per gent
CREATE TABLE IF NOT EXISTS toast_gent_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gent_id uuid REFERENCES gents(id) NOT NULL,
  role text NOT NULL CHECK (role IN ('lorekeeper', 'keys', 'bass')),
  sessions_hosted integer NOT NULL DEFAULT 0,
  photos_taken integer NOT NULL DEFAULT 0,
  cocktails_crafted integer NOT NULL DEFAULT 0,
  confessions_drawn integer NOT NULL DEFAULT 0,
  spotlights_given integer NOT NULL DEFAULT 0,
  vibe_shifts_called integer NOT NULL DEFAULT 0,
  reactions_sparked integer NOT NULL DEFAULT 0,
  top_guest_id uuid REFERENCES people(id) ON DELETE SET NULL,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(gent_id, role)
);

ALTER TABLE toast_gent_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read toast_gent_stats"
  ON toast_gent_stats FOR SELECT TO authenticated USING (true);

CREATE INDEX idx_toast_gent_stats_gent ON toast_gent_stats(gent_id);
```

- [ ] **Step 2: Verify migration syntax**

Run: `cd supabase && npx supabase db lint` or review SQL manually for syntax errors.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260319100000_toast_tables.sql
git commit -m "feat(db): add toast session tables for Toast ↔ Chronicles bridge"
```

---

### Task 2: Edge Function Config & Deployment Setup

**Files:**
- Modify: `supabase/config.toml`
- Modify: `.github/workflows/deploy.yml`
- Create: `.github/workflows/cleanup-toast-drafts.yml`

- [ ] **Step 1: Add edge function JWT config to `config.toml`**

Append to the `[functions.*]` section at the end of `config.toml`:

```toml
[functions.generate-toast-token]
verify_jwt = false

[functions.receive-toast-session]
verify_jwt = false

[functions.cleanup-toast-drafts]
verify_jwt = false
```

- [ ] **Step 2: Create cleanup cron workflow**

Create `.github/workflows/cleanup-toast-drafts.yml`:

```yaml
name: Cleanup Toast Drafts

on:
  schedule:
    - cron: '0 3 * * *'  # Daily at 3:00 UTC
  workflow_dispatch: {}

jobs:
  cleanup:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger cleanup
        run: |
          curl -s -w "\nHTTP %{http_code}" -X POST \
            "${{ secrets.SUPABASE_URL }}/functions/v1/cleanup-toast-drafts" \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_ANON_KEY }}" \
            -H "Content-Type: application/json" \
            -d '{}'
```

- [ ] **Step 3: Commit**

```bash
git add supabase/config.toml .github/workflows/cleanup-toast-drafts.yml
git commit -m "feat(infra): add toast edge function config + cleanup cron"
```

---

### Task 3: Edge Function — `generate-toast-token`

**Files:**
- Create: `supabase/functions/generate-toast-token/index.ts`

This edge function generates a short-lived signed JWT for the auth handoff between Chronicles and The Toast.

- [ ] **Step 1: Write the edge function**

```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { gent_id } = await req.json()

    if (!gent_id) {
      return new Response(JSON.stringify({ error: 'gent_id required' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const secret = Deno.env.get('TOAST_BRIDGE_SECRET')
    if (!secret) {
      return new Response(JSON.stringify({ error: 'Bridge secret not configured' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Create a simple signed token: base64({gent_id, exp}) + HMAC signature
    const payload = {
      gent_id,
      exp: Math.floor(Date.now() / 1000) + 900, // 15 min expiry
      iat: Math.floor(Date.now() / 1000),
    }

    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    )

    const payloadB64 = btoa(JSON.stringify(payload))
    const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payloadB64))
    const sigB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))

    const token = `${payloadB64}.${sigB64}`

    return new Response(JSON.stringify({ token }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('generate-toast-token error:', error)
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
```

- [ ] **Step 2: Commit**

```bash
git add supabase/functions/generate-toast-token/index.ts
git commit -m "feat(edge): add generate-toast-token for Chronicles ↔ Toast auth"
```

---

### Task 4: Edge Function — `receive-toast-session`

**Files:**
- Create: `supabase/functions/receive-toast-session/index.ts`

This is the main bridge function. The Toast server calls it at session end with the full payload. It creates the draft entry, session records, matches guests, uploads images, and updates gent stats.

- [ ] **Step 1: Write the edge function**

```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function verifyToken(token: string): Promise<{ gent_id: string } | null> {
  const secret = Deno.env.get('TOAST_BRIDGE_SECRET')
  if (!secret) return null

  try {
    const [payloadB64, sigB64] = token.split('.')
    if (!payloadB64 || !sigB64) return null

    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify'],
    )

    const sigBytes = Uint8Array.from(atob(sigB64), c => c.charCodeAt(0))
    const valid = await crypto.subtle.verify('HMAC', key, sigBytes, encoder.encode(payloadB64))
    if (!valid) return null

    const payload = JSON.parse(atob(payloadB64))
    if (payload.exp < Math.floor(Date.now() / 1000)) return null

    return { gent_id: payload.gent_id }
  } catch {
    return null
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const { token, session } = body

    // Verify bridge token
    const auth = await verifyToken(token)
    if (!auth) {
      return new Response(JSON.stringify({ error: 'Invalid or expired token' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { createClient } = await import('npm:@supabase/supabase-js@2')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const db = createClient(supabaseUrl, supabaseKey)

    const {
      title,
      date,
      location,
      city,
      country,
      country_code,
      session_code,
      duration_seconds,
      act_count,
      guest_count,
      vibe_timeline,
      vibe_summary,
      cocktails,       // Array<{name, story, image_base64?, round_number, act, crafted_for_name?}>
      confessions,     // Array<{prompt, confessor_name?, confessor_is_gent, ai_commentary, act, reaction_count}>
      wrapped,         // Array<{participant_name, is_gent, gent_id?, stats, ai_note, ai_title}>
      guests,          // Array<{name, alias?, traits?, portrait_base64?, toast_profile?}>
      gent_participants, // Array<string> — gent IDs that participated
      gent_role_stats, // {gent_id: {role, photos_taken, cocktails_crafted, ...}}
      photos,          // Array<{base64, mime_type}> — group snap photos (max 10)
    } = session

    // 1. Create draft entry
    const { data: entry, error: entryErr } = await db
      .from('entries')
      .insert({
        type: 'toast',
        title: title || `The Toast — ${session_code}`,
        date,
        location: location || null,
        city: city || null,
        country: country || null,
        country_code: country_code || null,
        status: 'draft',
        visibility: 'shared',
        metadata: {
          session_code,
          duration_seconds,
          act_count,
          guest_count,
          vibe_summary: vibe_summary || '',
          guest_matches: [],
        },
        created_by: auth.gent_id,
      })
      .select('id')
      .single()

    if (entryErr) throw new Error(`Entry create: ${entryErr.message}`)
    const entryId = entry.id

    // 2. Add gent participants
    if (gent_participants?.length) {
      const participantRows = gent_participants.map((gid: string) => ({
        entry_id: entryId,
        gent_id: gid,
      }))
      await db.from('entry_participants').upsert(participantRows, { onConflict: 'entry_id,gent_id' })
    }

    // 3. Create toast_session
    const { data: tsData, error: tsErr } = await db
      .from('toast_sessions')
      .insert({
        entry_id: entryId,
        hosted_by: auth.gent_id,
        session_code,
        duration_seconds: duration_seconds || 0,
        act_count: act_count || 4,
        guest_count: guest_count || 0,
        vibe_timeline: vibe_timeline || [],
      })
      .select('id')
      .single()

    if (tsErr) throw new Error(`Toast session create: ${tsErr.message}`)
    const sessionId = tsData.id

    // 4. Match/create guests → Circle contacts
    const guestMatches: Array<{ toast_name: string; person_id: string | null; status: string }> = []

    for (const guest of (guests || [])) {
      // Try exact name match (case-insensitive) within hosting gent's contacts
      const { data: matches } = await db
        .from('people')
        .select('id, name, photo_url')
        .ilike('name', guest.name)
        .limit(1)

      let personId: string | null = null
      let matchStatus = 'unmatched'

      if (matches && matches.length > 0) {
        personId = matches[0].id
        matchStatus = 'matched'
      } else {
        // Create new POI
        let portraitUrl: string | null = null

        // Upload portrait if provided
        if (guest.portrait_base64) {
          const fileName = `toast_${sessionId}_${guest.name.toLowerCase().replace(/\s+/g, '_')}.webp`
          const portraitBytes = Uint8Array.from(atob(guest.portrait_base64), c => c.charCodeAt(0))
          const { error: upErr } = await db.storage
            .from('portraits')
            .upload(fileName, portraitBytes, { contentType: 'image/webp', upsert: true })
          if (!upErr) {
            const { data: { publicUrl } } = db.storage.from('portraits').getPublicUrl(fileName)
            portraitUrl = publicUrl
          }
        }

        const { data: newPerson, error: personErr } = await db
          .from('people')
          .insert({
            name: guest.name,
            photo_url: portraitUrl,
            labels: guest.traits || [],
            added_by: auth.gent_id,
            tier: 'poi',
            metadata: {
              toast_alias: guest.alias || null,
            },
          })
          .select('id')
          .single()

        if (!personErr && newPerson) {
          personId = newPerson.id
          matchStatus = 'created'

          // Link to hosting gent
          await db.from('person_gents').upsert(
            { person_id: personId, gent_id: auth.gent_id },
            { onConflict: 'person_id,gent_id' },
          )
        }
      }

      if (personId) {
        // Create appearance
        await db.from('person_appearances').upsert(
          { person_id: personId, entry_id: entryId, tagged_by: auth.gent_id },
          { onConflict: 'person_id,entry_id' },
        )
      }

      guestMatches.push({ toast_name: guest.name, person_id: personId, status: matchStatus })
    }

    // Update entry metadata with guest matches
    await db
      .from('entries')
      .update({
        metadata: {
          session_code,
          duration_seconds,
          act_count,
          guest_count,
          vibe_summary: vibe_summary || '',
          guest_matches: guestMatches,
        },
      })
      .eq('id', entryId)

    // 5. Insert cocktails
    const cocktailRows = []
    for (const c of (cocktails || [])) {
      let imageUrl: string | null = null
      if (c.image_base64) {
        const fileName = `toast_${sessionId}_cocktail_${c.round_number}.webp`
        const imgBytes = Uint8Array.from(atob(c.image_base64), ch => ch.charCodeAt(0))
        const { error: upErr } = await db.storage
          .from('entry-photos')
          .upload(fileName, imgBytes, { contentType: 'image/webp', upsert: true })
        if (!upErr) {
          const { data: { publicUrl } } = db.storage.from('entry-photos').getPublicUrl(fileName)
          imageUrl = publicUrl
        }
      }

      // Resolve crafted_for name to person_id
      const craftedForMatch = c.crafted_for_name
        ? guestMatches.find(g => g.toast_name === c.crafted_for_name)
        : null

      cocktailRows.push({
        session_id: sessionId,
        name: c.name,
        story: c.story || null,
        image_url: imageUrl,
        round_number: c.round_number || 1,
        act: c.act || 1,
        crafted_for: craftedForMatch?.person_id || null,
      })
    }
    if (cocktailRows.length) {
      await db.from('toast_cocktails').insert(cocktailRows)
    }

    // 6. Insert confessions
    const confessionRows = (confessions || []).map((c: Record<string, unknown>) => {
      // Resolve confessor name
      let confessorId: string | null = null
      if (c.confessor_name && !c.confessor_is_gent) {
        const match = guestMatches.find(g => g.toast_name === c.confessor_name)
        confessorId = match?.person_id || null
      } else if (c.confessor_is_gent && c.gent_id) {
        confessorId = c.gent_id as string
      }

      return {
        session_id: sessionId,
        prompt: c.prompt,
        confessor_id: confessorId,
        confessor_is_gent: !!c.confessor_is_gent,
        ai_commentary: c.ai_commentary || null,
        act: c.act || 1,
        reaction_count: c.reaction_count || 0,
      }
    })
    if (confessionRows.length) {
      await db.from('toast_confessions').insert(confessionRows)
    }

    // 7. Insert wrapped stats
    const wrappedRows = (wrapped || []).map((w: Record<string, unknown>) => {
      let participantId: string | null = null
      if (w.is_gent && w.gent_id) {
        participantId = w.gent_id as string
      } else if (w.participant_name) {
        const match = guestMatches.find(g => g.toast_name === w.participant_name)
        participantId = match?.person_id || null
      }

      return {
        session_id: sessionId,
        participant_id: participantId,
        is_gent: !!w.is_gent,
        stats: w.stats || {},
        ai_note: w.ai_note || null,
        ai_title: w.ai_title || null,
      }
    }).filter((r: Record<string, unknown>) => r.participant_id !== null)

    if (wrappedRows.length) {
      await db.from('toast_wrapped').insert(wrappedRows)
    }

    // 8. Upload group snap photos (max 10)
    const photoSlice = (photos || []).slice(0, 10)
    for (let i = 0; i < photoSlice.length; i++) {
      const p = photoSlice[i]
      const fileName = `${entryId}/toast_snap_${i}.webp`
      const imgBytes = Uint8Array.from(atob(p.base64), (ch: string) => ch.charCodeAt(0))
      const { error: upErr } = await db.storage
        .from('entry-photos')
        .upload(fileName, imgBytes, { contentType: p.mime_type || 'image/webp', upsert: true })

      if (!upErr) {
        const { data: { publicUrl } } = db.storage.from('entry-photos').getPublicUrl(fileName)
        await db.from('entry_photos').insert({
          entry_id: entryId,
          url: publicUrl,
          sort_order: i,
        })

        // First photo becomes cover
        if (i === 0) {
          await db.from('entries').update({ cover_image_url: publicUrl }).eq('id', entryId)
        }
      }
    }

    // 9. Update gent role stats (upsert)
    for (const [gentId, roleStats] of Object.entries(gent_role_stats || {})) {
      const rs = roleStats as Record<string, unknown>
      const role = rs.role as string
      if (!role) continue

      // Try to fetch existing stats
      const { data: existing } = await db
        .from('toast_gent_stats')
        .select('*')
        .eq('gent_id', gentId)
        .eq('role', role)
        .single()

      if (existing) {
        await db
          .from('toast_gent_stats')
          .update({
            sessions_hosted: existing.sessions_hosted + 1,
            photos_taken: existing.photos_taken + ((rs.photos_taken as number) || 0),
            cocktails_crafted: existing.cocktails_crafted + ((rs.cocktails_crafted as number) || 0),
            confessions_drawn: existing.confessions_drawn + ((rs.confessions_drawn as number) || 0),
            spotlights_given: existing.spotlights_given + ((rs.spotlights_given as number) || 0),
            vibe_shifts_called: existing.vibe_shifts_called + ((rs.vibe_shifts_called as number) || 0),
            reactions_sparked: existing.reactions_sparked + ((rs.reactions_sparked as number) || 0),
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
      } else {
        await db.from('toast_gent_stats').insert({
          gent_id: gentId,
          role,
          sessions_hosted: 1,
          photos_taken: (rs.photos_taken as number) || 0,
          cocktails_crafted: (rs.cocktails_crafted as number) || 0,
          confessions_drawn: (rs.confessions_drawn as number) || 0,
          spotlights_given: (rs.spotlights_given as number) || 0,
          vibe_shifts_called: (rs.vibe_shifts_called as number) || 0,
          reactions_sparked: (rs.reactions_sparked as number) || 0,
        })
      }
    }

    // 10. Enrich matched guest profiles with wrapped data
    for (const w of (wrapped || [])) {
      if (w.is_gent || !w.participant_name) continue
      const match = guestMatches.find(g => g.toast_name === w.participant_name)
      if (!match?.person_id) continue

      // Add wrapped title + signature drink to person metadata
      const updates: Record<string, unknown> = {}
      if (w.ai_title) {
        updates['metadata'] = { toast_wrapped_title: w.ai_title }
      }

      // Find if this person had a cocktail crafted for them
      const personalCocktail = cocktailRows.find(c => c.crafted_for === match.person_id)
      if (personalCocktail) {
        updates['metadata'] = {
          ...(updates['metadata'] as Record<string, unknown> || {}),
          toast_signature_drink: personalCocktail.name,
        }
      }

      if (Object.keys(updates).length > 0) {
        // Merge metadata rather than overwrite
        const { data: person } = await db
          .from('people')
          .select('metadata')
          .eq('id', match.person_id)
          .single()

        const existingMeta = (person?.metadata || {}) as Record<string, unknown>
        const newMeta = { ...existingMeta, ...(updates['metadata'] as Record<string, unknown>) }

        await db.from('people').update({ metadata: newMeta }).eq('id', match.person_id)
      }
    }

    return new Response(JSON.stringify({ entry_id: entryId, session_id: sessionId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('receive-toast-session error:', error)
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
```

- [ ] **Step 2: Commit**

```bash
git add supabase/functions/receive-toast-session/index.ts
git commit -m "feat(edge): add receive-toast-session bridge function"
```

---

### Task 5: Edge Function — `cleanup-toast-drafts`

**Files:**
- Create: `supabase/functions/cleanup-toast-drafts/index.ts`

- [ ] **Step 1: Write the edge function**

```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { createClient } = await import('npm:@supabase/supabase-js@2')
    const db = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Find toast draft entries older than 48 hours
    const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()

    const { data: stale, error: fetchErr } = await db
      .from('entries')
      .select('id')
      .eq('type', 'toast')
      .eq('status', 'draft')
      .lt('created_at', cutoff)

    if (fetchErr) throw new Error(`Fetch stale drafts: ${fetchErr.message}`)

    if (!stale || stale.length === 0) {
      return new Response(JSON.stringify({ deleted: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const ids = stale.map((e: { id: string }) => e.id)

    // Delete entries — cascades to toast_sessions → cocktails/confessions/wrapped
    // Also cascades to entry_participants, entry_photos, person_appearances
    const { error: delErr } = await db
      .from('entries')
      .delete()
      .in('id', ids)

    if (delErr) throw new Error(`Delete stale drafts: ${delErr.message}`)

    console.log(`Cleaned up ${ids.length} stale toast drafts`)

    return new Response(JSON.stringify({ deleted: ids.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('cleanup-toast-drafts error:', error)
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
```

- [ ] **Step 2: Commit**

```bash
git add supabase/functions/cleanup-toast-drafts/index.ts
git commit -m "feat(edge): add cleanup-toast-drafts for orphaned draft entries"
```

---

### Task 6: Update Lore Generation Directive

**Files:**
- Modify: `supabase/functions/generate-lore/index.ts` — add toast entry to `entryTypeDirectives`

- [ ] **Step 1: Add toast directive**

Find the `entryTypeDirectives` object and add:

```typescript
toast: `This is a Toast — a cocktail session hosted by The Gents. Focus on the social chemistry: who was there, the energy in the room, standout confessions or moments of vulnerability, the cocktails that defined the evening. Write as if recounting a legendary salon — intimate, witty, with an undercurrent of mischief. Reference specific cocktail names and guest aliases if available in the metadata. Let the vibe shifts colour the narrative arc.`,
```

- [ ] **Step 2: Commit**

```bash
git add supabase/functions/generate-lore/index.ts
git commit -m "feat(lore): add toast entry type directive for lore generation"
```

---

### Chunk 1 Checkpoint

- [ ] Run `/simplify` to review changed code for reuse, quality, and efficiency before proceeding.

---

## Chunk 2: Chronicles Data Layer

### Task 7: Toast Data Types

**Files:**
- Modify: `src/types/app.ts` — add toast-related interfaces

- [ ] **Step 1: Add toast type definitions**

Add after existing interfaces:

```typescript
export interface ToastSession {
  id: string
  entry_id: string
  hosted_by: string
  session_code: string
  duration_seconds: number
  act_count: number
  guest_count: number
  vibe_timeline: Array<{ act: number; vibe: string; timestamp: string }>
  created_at: string
}

export interface ToastCocktail {
  id: string
  session_id: string
  name: string
  story: string | null
  image_url: string | null
  round_number: number
  act: number
  crafted_for: string | null
}

export interface ToastConfession {
  id: string
  session_id: string
  prompt: string
  confessor_id: string | null
  confessor_is_gent: boolean
  ai_commentary: string | null
  act: number
  reaction_count: number
}

export interface ToastWrapped {
  id: string
  session_id: string
  participant_id: string
  is_gent: boolean
  stats: Record<string, number>
  ai_note: string | null
  ai_title: string | null
}

export interface ToastGentStats {
  id: string
  gent_id: string
  role: 'lorekeeper' | 'keys' | 'bass'
  sessions_hosted: number
  photos_taken: number
  cocktails_crafted: number
  confessions_drawn: number
  spotlights_given: number
  vibe_shifts_called: number
  reactions_sparked: number
  top_guest_id: string | null
  updated_at: string
}

export interface ToastSessionFull {
  session: ToastSession
  cocktails: ToastCocktail[]
  confessions: ToastConfession[]
  wrapped: ToastWrapped[]
}
```

- [ ] **Step 2: Commit**

```bash
git add src/types/app.ts
git commit -m "feat(types): add toast session type definitions"
```

---

### Task 8: Toast Data Fetching Functions

**Files:**
- Create: `src/data/toast.ts`
- Modify: `src/data/entries.ts` — add `fetchDraftEntry`

- [ ] **Step 1: Create `src/data/toast.ts`**

```typescript
import { supabase } from '@/lib/supabase'
import type {
  ToastSession,
  ToastCocktail,
  ToastConfession,
  ToastWrapped,
  ToastGentStats,
  ToastSessionFull,
} from '@/types/app'

export async function fetchToastSession(entryId: string): Promise<ToastSessionFull | null> {
  const { data: session } = await supabase
    .from('toast_sessions')
    .select('*')
    .eq('entry_id', entryId)
    .single()

  if (!session) return null

  const [cocktailsRes, confessionsRes, wrappedRes] = await Promise.all([
    supabase
      .from('toast_cocktails')
      .select('*')
      .eq('session_id', session.id)
      .order('round_number'),
    supabase
      .from('toast_confessions')
      .select('*')
      .eq('session_id', session.id)
      .order('reaction_count', { ascending: false }),
    supabase
      .from('toast_wrapped')
      .select('*')
      .eq('session_id', session.id),
  ])

  return {
    session: session as ToastSession,
    cocktails: (cocktailsRes.data || []) as ToastCocktail[],
    confessions: (confessionsRes.data || []) as ToastConfession[],
    wrapped: (wrappedRes.data || []) as ToastWrapped[],
  }
}

export async function fetchToastGentStats(gentId: string): Promise<ToastGentStats[]> {
  const { data } = await supabase
    .from('toast_gent_stats')
    .select('*')
    .eq('gent_id', gentId)

  return (data || []) as ToastGentStats[]
}

export async function fetchAllToastStats(): Promise<ToastGentStats[]> {
  const { data } = await supabase
    .from('toast_gent_stats')
    .select('*')

  return (data || []) as ToastGentStats[]
}

export async function deleteToastDraft(entryId: string): Promise<void> {
  // Cascade deletes handle toast_sessions → cocktails/confessions/wrapped
  const { error } = await supabase
    .from('entries')
    .delete()
    .eq('id', entryId)
    .eq('status', 'draft')

  if (error) throw new Error(`Delete draft: ${error.message}`)
}

export async function publishToastDraft(
  entryId: string,
  updates: { title?: string; location?: string; guest_matches?: unknown[] },
): Promise<void> {
  const { data: entry } = await supabase
    .from('entries')
    .select('metadata')
    .eq('id', entryId)
    .single()

  const metadata = {
    ...((entry?.metadata || {}) as Record<string, unknown>),
    ...(updates.guest_matches ? { guest_matches: updates.guest_matches } : {}),
  }

  const { error } = await supabase
    .from('entries')
    .update({
      status: 'published',
      ...(updates.title ? { title: updates.title } : {}),
      ...(updates.location ? { location: updates.location } : {}),
      metadata,
    })
    .eq('id', entryId)

  if (error) throw new Error(`Publish draft: ${error.message}`)
}
```

- [ ] **Step 2: Add `fetchDraftEntry` to `src/data/entries.ts`**

Add this function (it fetches a single entry by ID regardless of status):

```typescript
export async function fetchDraftEntry(id: string): Promise<EntryWithParticipants | null> {
  const { data, error } = await supabase
    .from('entries')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) return null

  const participantsMap = await fetchParticipantsMap([id])
  return { ...data, participants: participantsMap[id] || [] } as EntryWithParticipants
}
```

- [ ] **Step 3: Commit**

```bash
git add src/data/toast.ts src/data/entries.ts
git commit -m "feat(data): add toast session data layer + draft entry fetch"
```

---

### Task 9: Toast Session Hook

**Files:**
- Create: `src/hooks/useToastSession.ts`

- [ ] **Step 1: Write the hook**

```typescript
import { useState, useEffect } from 'react'
import { fetchToastSession } from '@/data/toast'
import type { ToastSessionFull } from '@/types/app'

export function useToastSession(entryId: string | undefined) {
  const [session, setSession] = useState<ToastSessionFull | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!entryId) {
      setLoading(false)
      return
    }

    fetchToastSession(entryId)
      .then(setSession)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [entryId])

  return { session, loading }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useToastSession.ts
git commit -m "feat(hooks): add useToastSession hook"
```

---

### Task 10: Client-Side Token Generation + Toast Launch

**Files:**
- Create: `src/ai/toast.ts`

- [ ] **Step 1: Write the toast bridge client**

```typescript
import { supabase } from '@/lib/supabase'

const TOAST_APP_URL = import.meta.env.VITE_TOAST_APP_URL as string || 'http://localhost:5173'
const CHRONICLES_URL = import.meta.env.VITE_APP_URL as string || 'https://the-codex-sepia.vercel.app'

export async function launchToastSession(gentId: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke('generate-toast-token', {
    body: { gent_id: gentId },
  })

  if (error || data?.error) {
    throw new Error(data?.error || error?.message || 'Failed to generate token')
  }

  const callback = encodeURIComponent(`${CHRONICLES_URL}/chronicle/draft/`)
  const url = `${TOAST_APP_URL}/host?token=${data.token}&callback=${callback}`

  window.open(url, '_blank')
}
```

- [ ] **Step 2: Commit**

```bash
git add src/ai/toast.ts
git commit -m "feat(ai): add toast session launch + token generation client"
```

---

### Chunk 2 Checkpoint

- [ ] Run `/simplify` to review changed code for reuse, quality, and efficiency before proceeding.

---

## Chunk 3: Toast UI — Layout, Draft Review, Routes

### Task 11: Toast Mood Tags

**Files:**
- Modify: `src/pages/EntryNew.tsx` — add `TOAST_MOODS` to `TYPE_MOODS`

- [ ] **Step 1: Add toast-specific moods**

Find `TYPE_MOODS` and add:

```typescript
toast: ['Confessional', 'Intimate', 'Electric', 'Unhinged', 'Sophisticated', 'Late Night'],
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/EntryNew.tsx
git commit -m "feat(entry): add toast-specific mood tags"
```

---

### Task 12: Toast Entry Type Redirect in EntryNew

**Files:**
- Modify: `src/pages/EntryNew.tsx` — redirect toast type to The Toast app

- [ ] **Step 1: Modify `handleTypeSelect` in EntryNew.tsx**

Update the type selection handler so `toast` redirects to The Toast app (same pattern as `gathering` redirecting to its own page):

```typescript
function handleTypeSelect(type: EntryType) {
  if (type === 'gathering') {
    navigate('/gathering/new')
    return
  }
  if (type === 'toast') {
    // Launch The Toast app in a new tab
    launchToastSession(gent!.id).catch((err) => {
      console.error('Failed to launch Toast:', err)
      // Fallback: show the normal toast form
      setSelectedType(type)
      setStep('form')
    })
    return
  }
  setSelectedType(type)
  setStep('form')
}
```

Add the import at the top of `EntryNew.tsx`:
```typescript
import { launchToastSession } from '@/ai/toast'
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/EntryNew.tsx
git commit -m "feat(entry): redirect toast type to The Toast app"
```

---

### Task 13: ToastLayout Component

**Files:**
- Create: `src/components/chronicle/ToastLayout.tsx`

This is the main visual layout for toast entries in EntryDetail. Card-based, no wall of text.

- [ ] **Step 1: Write the component**

```typescript
import { motion } from 'framer-motion'
import { Clock, Users, Zap, Wine, MessageCircle } from 'lucide-react'
import { fadeIn, staggerContainer, staggerItem } from '@/lib/animations'
import { formatDate } from '@/lib/utils'
import type { EntryWithParticipants, Gent } from '@/types/app'
import type { ToastSessionFull } from '@/types/app'

interface ToastLayoutProps {
  entry: EntryWithParticipants
  session: ToastSessionFull | null
  people: Array<{ id: string; name: string; photo_url: string | null }>
  isCreator: boolean
  loreSlot?: React.ReactNode
  controlsSlot?: React.ReactNode
}

function formatDuration(seconds: number): string {
  const mins = Math.round(seconds / 60)
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  const rem = mins % 60
  return rem ? `${hrs}h ${rem}m` : `${hrs}h`
}

const VIBE_COLORS: Record<string, string> = {
  intimate: '#C9A84C',
  electric: '#FFD700',
  chaotic: '#FF6B35',
  chill: '#6B8E9B',
  wild: '#FF4757',
}

function VibeTimeline({ timeline }: { timeline: Array<{ act: number; vibe: string }> }) {
  if (!timeline.length) return null
  return (
    <div className="flex rounded-full overflow-hidden h-2 w-full">
      {timeline.map((v, i) => (
        <div
          key={i}
          className="flex-1"
          style={{ backgroundColor: VIBE_COLORS[v.vibe.toLowerCase()] || VIBE_COLORS.intimate }}
          title={`Act ${v.act}: ${v.vibe}`}
        />
      ))}
    </div>
  )
}

export function ToastLayout({ entry, session, people, isCreator, loreSlot, controlsSlot }: ToastLayoutProps) {
  if (!session) return null

  const { cocktails, confessions, wrapped } = session
  const topConfessions = confessions.slice(0, 3)
  const meta = entry.metadata as Record<string, unknown>

  return (
    <motion.div variants={fadeIn} initial="initial" animate="animate" className="space-y-6 pb-20">
      {/* Session Header */}
      <section className="bg-slate-dark rounded-2xl p-5 border border-white/5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-xl font-display text-ivory font-bold">{entry.title}</h1>
            <p className="text-ivory-dim text-sm font-body mt-1">
              {entry.location && `${entry.location} · `}{formatDate(entry.date)}
            </p>
          </div>
          <div className="flex items-center gap-3 text-gold text-xs font-body">
            <span className="flex items-center gap-1">
              <Clock size={14} />
              {formatDuration(session.session.duration_seconds)}
            </span>
            <span className="flex items-center gap-1">
              <Users size={14} />
              {session.session.guest_count + (entry.participants?.length || 0)}
            </span>
          </div>
        </div>

        {/* Participant avatars */}
        <div className="flex items-center gap-2 mt-3">
          {entry.participants?.map((g: Gent) => (
            <div key={g.id} className="flex items-center gap-1.5">
              {g.avatar_url ? (
                <img src={g.avatar_url} alt={g.alias || g.name} className="w-8 h-8 rounded-full object-cover border border-gold/30" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gold/20 flex items-center justify-center text-gold text-xs font-bold">
                  {(g.alias || g.name).charAt(0)}
                </div>
              )}
            </div>
          ))}
          {people.map((p) => (
            <div key={p.id} className="flex items-center gap-1.5">
              {p.photo_url ? (
                <img src={p.photo_url} alt={p.name} className="w-8 h-8 rounded-full object-cover border border-white/10" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-ivory-dim text-xs font-bold">
                  {p.name.charAt(0)}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Vibe timeline */}
        <div className="mt-4">
          <VibeTimeline timeline={session.session.vibe_timeline} />
          {meta.vibe_summary && (
            <p className="text-ivory-dim text-xs font-body mt-1.5 tracking-wide">
              {meta.vibe_summary as string}
            </p>
          )}
        </div>
      </section>

      {/* Cocktail Gallery */}
      {cocktails.length > 0 && (
        <section>
          <p className="text-xs tracking-widest text-gold uppercase font-body font-semibold mb-3 flex items-center gap-2">
            <Wine size={14} /> Cocktails
          </p>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 snap-x snap-mandatory">
            {cocktails.map((c) => (
              <motion.div
                key={c.id}
                variants={staggerItem}
                className="snap-start shrink-0 w-56 bg-slate-dark rounded-xl border border-gold/20 overflow-hidden"
              >
                {c.image_url && (
                  <img src={c.image_url} alt={c.name} className="w-full h-32 object-cover" />
                )}
                <div className="p-3">
                  <p className="text-ivory font-display font-bold text-sm">{c.name}</p>
                  {c.story && (
                    <p className="text-ivory-dim text-xs font-body mt-1 line-clamp-3">{c.story}</p>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* The Confessions */}
      {topConfessions.length > 0 && (
        <section>
          <p className="text-xs tracking-widest text-gold uppercase font-body font-semibold mb-3 flex items-center gap-2">
            <MessageCircle size={14} /> Confessions
          </p>
          <div className="space-y-3">
            {topConfessions.map((c) => (
              <motion.div
                key={c.id}
                variants={staggerItem}
                className="bg-slate-dark rounded-xl p-4 border border-white/5"
              >
                <p className="text-ivory font-display italic text-sm leading-relaxed">"{c.prompt}"</p>
                {c.ai_commentary && (
                  <p className="text-ivory-dim text-xs font-body mt-2 pl-3 border-l-2 border-gold/30">
                    {c.ai_commentary}
                  </p>
                )}
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* Wrapped Strip */}
      {wrapped.length > 0 && (
        <section>
          <p className="text-xs tracking-widest text-gold uppercase font-body font-semibold mb-3 flex items-center gap-2">
            <Zap size={14} /> Session Wrapped
          </p>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 snap-x snap-mandatory">
            {wrapped.map((w) => (
              <motion.div
                key={w.id}
                variants={staggerItem}
                className="snap-start shrink-0 w-44 bg-slate-dark rounded-xl p-4 border border-gold/20 text-center"
              >
                {w.ai_title && (
                  <p className="text-gold font-display font-bold text-sm">{w.ai_title}</p>
                )}
                {w.ai_note && (
                  <p className="text-ivory-dim text-xs font-body mt-2 line-clamp-3">{w.ai_note}</p>
                )}
                <div className="mt-2 text-ivory text-xs font-body">
                  {Object.entries(w.stats).slice(0, 2).map(([k, v]) => (
                    <p key={k} className="text-ivory-dim">
                      {k.replace(/_/g, ' ')}: <span className="text-ivory">{v}</span>
                    </p>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* Lore (optional, manually generated) */}
      {loreSlot}

      {/* Controls: reactions, participants, comments, actions */}
      {controlsSlot}
    </motion.div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/chronicle/ToastLayout.tsx
git commit -m "feat(ui): add ToastLayout component for toast entry detail"
```

---

### Task 14: Wire ToastLayout into EntryDetail

**Files:**
- Modify: `src/pages/EntryDetail.tsx`

- [ ] **Step 1: Import and wire ToastLayout**

Add imports:
```typescript
import { ToastLayout } from '@/components/chronicle/ToastLayout'
import { useToastSession } from '@/hooks/useToastSession'
```

Inside the component, after the existing `isMission` check, add:
```typescript
const isToast = entry?.type === 'toast'
const { session: toastSession } = useToastSession(isToast ? entry?.id : undefined)
```

In the render, extend the conditional:
```typescript
return isMission ? (
  <MissionLayout ... />
) : isToast ? (
  <PageWrapper padded scrollable>
    <ToastLayout
      entry={entry}
      session={toastSession}
      people={[]}  // TODO: resolve from guest_matches in metadata
      isCreator={isCreator}
      loreSlot={loreSection}
      controlsSlot={controlsContent}
    />
  </PageWrapper>
) : (
  /* existing generic layout */
)
```

- [ ] **Step 2: Resolve guest people for ToastLayout**

Add a fetch for the people who appeared in this entry. Use the existing `person_appearances` data:

```typescript
const [toastPeople, setToastPeople] = useState<Array<{ id: string; name: string; photo_url: string | null }>>([])

useEffect(() => {
  if (!isToast || !entry?.id) return
  supabase
    .from('person_appearances')
    .select('person_id, people(id, name, photo_url)')
    .eq('entry_id', entry.id)
    .then(({ data }) => {
      if (data) {
        setToastPeople(
          data.map((d: any) => d.people).filter(Boolean)
        )
      }
    })
}, [isToast, entry?.id])
```

Pass `toastPeople` as the `people` prop to `ToastLayout`.

- [ ] **Step 3: Commit**

```bash
git add src/pages/EntryDetail.tsx
git commit -m "feat(detail): wire ToastLayout into EntryDetail for toast entries"
```

---

### Task 15: Draft Review Screen

**Files:**
- Create: `src/pages/ToastDraftReview.tsx`
- Modify: `src/App.tsx` — add draft route

- [ ] **Step 1: Write the draft review page**

```typescript
import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Check, X, UserCheck, AlertCircle } from 'lucide-react'
import { fadeIn } from '@/lib/animations'
import { useAuthStore } from '@/stores/authStore'
import { fetchDraftEntry } from '@/data/entries'
import { publishToastDraft, deleteToastDraft } from '@/data/toast'
import { useToastSession } from '@/hooks/useToastSession'
import { ToastLayout } from '@/components/chronicle/ToastLayout'
import { PageWrapper } from '@/components/layout/PageWrapper'
import type { EntryWithParticipants } from '@/types/app'

export default function ToastDraftReview() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const gent = useAuthStore((s) => s.gent)

  const [entry, setEntry] = useState<EntryWithParticipants | null>(null)
  const [loading, setLoading] = useState(true)
  const [publishing, setPublishing] = useState(false)
  const [title, setTitle] = useState('')

  const { session } = useToastSession(entry?.id)

  useEffect(() => {
    if (!id) return
    fetchDraftEntry(id)
      .then((e) => {
        setEntry(e)
        if (e) setTitle(e.title)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <PageWrapper padded scrollable>
        <div className="flex items-center justify-center h-64">
          <div className="text-ivory-dim font-body text-sm">Loading draft...</div>
        </div>
      </PageWrapper>
    )
  }

  if (!entry) {
    return (
      <PageWrapper padded scrollable>
        <div className="flex flex-col items-center justify-center h-64 gap-2">
          <AlertCircle className="text-gold" size={32} />
          <p className="text-ivory-dim font-body text-sm">Draft not found or expired.</p>
        </div>
      </PageWrapper>
    )
  }

  // Access control: creator only
  if (gent?.id !== entry.created_by) {
    const creatorName = entry.participants?.find((p) => p.id === entry.created_by)?.name || 'another Gent'
    return (
      <PageWrapper padded scrollable>
        <div className="flex flex-col items-center justify-center h-64 gap-2">
          <UserCheck className="text-gold" size={32} />
          <p className="text-ivory-dim font-body text-sm">This draft belongs to {creatorName}.</p>
        </div>
      </PageWrapper>
    )
  }

  const meta = entry.metadata as Record<string, unknown>
  const guestMatches = (meta.guest_matches || []) as Array<{
    toast_name: string
    person_id: string | null
    status: string
  }>

  async function handlePublish() {
    if (!entry) return
    setPublishing(true)
    try {
      await publishToastDraft(entry.id, {
        title: title !== entry.title ? title : undefined,
        guest_matches: guestMatches,
      })
      navigate(`/chronicle/${entry.id}`)
    } catch (err) {
      console.error('Publish failed:', err)
    } finally {
      setPublishing(false)
    }
  }

  async function handleDiscard() {
    if (!entry || !confirm('Discard this Toast session draft? This cannot be undone.')) return
    try {
      await deleteToastDraft(entry.id)
      navigate('/chronicle')
    } catch (err) {
      console.error('Discard failed:', err)
    }
  }

  return (
    <PageWrapper padded scrollable>
      <motion.div variants={fadeIn} initial="initial" animate="animate" className="space-y-6 pb-20">
        {/* Draft banner */}
        <div className="bg-gold/10 border border-gold/30 rounded-xl p-4 flex items-center gap-3">
          <Wine className="text-gold shrink-0" size={20} />
          <div>
            <p className="text-ivory font-body text-sm font-semibold">Toast Session Draft</p>
            <p className="text-ivory-dim font-body text-xs">Review and publish to your Chronicle.</p>
          </div>
        </div>

        {/* Editable title */}
        <div>
          <label className="text-xs tracking-widest text-gold uppercase font-body font-semibold mb-1 block">
            Title
          </label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-slate-dark text-ivory font-display text-lg px-4 py-3 rounded-xl border border-white/10 focus:border-gold/50 outline-none"
          />
        </div>

        {/* Guest matching review */}
        {guestMatches.length > 0 && (
          <div>
            <p className="text-xs tracking-widest text-gold uppercase font-body font-semibold mb-2">
              Guest Matching
            </p>
            <div className="space-y-2">
              {guestMatches.map((g, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between bg-slate-dark rounded-lg p-3 border border-white/5"
                >
                  <span className="text-ivory font-body text-sm">{g.toast_name}</span>
                  <span
                    className={`text-xs font-body px-2 py-0.5 rounded-full ${
                      g.status === 'matched'
                        ? 'bg-green-900/30 text-green-400'
                        : g.status === 'created'
                          ? 'bg-gold/20 text-gold'
                          : 'bg-white/10 text-ivory-dim'
                    }`}
                  >
                    {g.status === 'matched' ? 'Matched' : g.status === 'created' ? 'New POI' : 'Unmatched'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Preview */}
        <ToastLayout
          entry={entry}
          session={session}
          people={[]}
          isCreator={true}
          loreSlot={null}
          controlsSlot={null}
        />

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={handlePublish}
            disabled={publishing}
            className="flex-1 bg-gold text-obsidian font-body font-semibold py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Check size={18} />
            {publishing ? 'Publishing...' : 'Publish'}
          </button>
          <button
            onClick={handleDiscard}
            className="px-4 py-3 bg-slate-dark text-ivory-dim font-body rounded-xl border border-white/10 flex items-center gap-2"
          >
            <X size={18} />
            Discard
          </button>
        </div>
      </motion.div>
    </PageWrapper>
  )
}
```

- [ ] **Step 2: Add route to `src/App.tsx`**

Add the lazy import:
```typescript
const ToastDraftReview = lazy(() => import('./pages/ToastDraftReview'))
```

Add the route inside the ProtectedRoute group:
```typescript
<Route path="/chronicle/draft/:id" element={<ProtectedRoute><ToastDraftReview /></ProtectedRoute>} />
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/ToastDraftReview.tsx src/App.tsx
git commit -m "feat(ui): add Toast draft review screen + route"
```

---

### Chunk 3 Checkpoint

- [ ] Run `/simplify` to review changed code for reuse, quality, and efficiency before proceeding.

---

## Chunk 4: Ledger, Studio, Profile Enrichment, Achievements

### Task 16: Toast Ledger Section

**Files:**
- Create: `src/components/ledger/ToastStatsSection.tsx`
- Modify: `src/pages/Ledger.tsx` — add the section

- [ ] **Step 1: Write the Ledger section**

```typescript
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Wine, Camera, Sparkles, MessageCircle } from 'lucide-react'
import { staggerContainer, staggerItem } from '@/lib/animations'
import { fetchAllToastStats } from '@/data/toast'
import type { ToastGentStats } from '@/types/app'

const ROLE_LABELS: Record<string, { label: string; icon: typeof Wine }> = {
  lorekeeper: { label: 'Lorekeeper', icon: Camera },
  keys: { label: 'Keys & Cocktails', icon: Wine },
  bass: { label: 'Beard & Bass', icon: MessageCircle },
}

export function ToastStatsSection() {
  const [stats, setStats] = useState<ToastGentStats[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAllToastStats()
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading || stats.length === 0) return null

  const totalSessions = stats.reduce((s, r) => s + r.sessions_hosted, 0)
  const totalCocktails = stats.reduce((s, r) => s + r.cocktails_crafted, 0)
  const totalConfessions = stats.reduce((s, r) => s + r.confessions_drawn, 0)

  return (
    <section className="mb-10">
      <p className="text-xs tracking-widest text-gold uppercase font-body font-semibold mb-4">
        The Toast — Service Record
      </p>

      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="space-y-3"
      >
        {/* Summary */}
        <motion.div
          variants={staggerItem}
          className="bg-slate-mid rounded-xl p-4 shadow-card grid grid-cols-3 gap-3 text-center"
        >
          <div>
            <p className="text-gold font-display text-xl font-bold">{totalSessions}</p>
            <p className="text-ivory-dim text-xs font-body">Sessions</p>
          </div>
          <div>
            <p className="text-gold font-display text-xl font-bold">{totalCocktails}</p>
            <p className="text-ivory-dim text-xs font-body">Cocktails</p>
          </div>
          <div>
            <p className="text-gold font-display text-xl font-bold">{totalConfessions}</p>
            <p className="text-ivory-dim text-xs font-body">Confessions</p>
          </div>
        </motion.div>

        {/* Per-gent role breakdown */}
        {stats.map((s) => {
          const role = ROLE_LABELS[s.role]
          if (!role) return null
          const Icon = role.icon

          return (
            <motion.div
              key={s.id}
              variants={staggerItem}
              className="bg-slate-mid rounded-xl p-4 shadow-card flex items-center gap-3"
            >
              <Icon size={18} className="text-gold shrink-0" />
              <div className="flex-1">
                <p className="text-ivory font-body text-sm font-semibold">{role.label}</p>
                <p className="text-ivory-dim text-xs font-body">
                  {s.sessions_hosted} sessions
                  {s.role === 'keys' && ` · ${s.cocktails_crafted} cocktails · ${s.vibe_shifts_called} vibe shifts`}
                  {s.role === 'bass' && ` · ${s.confessions_drawn} confessions · ${s.spotlights_given} spotlights`}
                  {s.role === 'lorekeeper' && ` · ${s.photos_taken} photos`}
                </p>
              </div>
            </motion.div>
          )
        })}
      </motion.div>
    </section>
  )
}
```

- [ ] **Step 2: Add to Ledger.tsx**

Import and render below existing sections (after `SommelierSection` or `SteakRatingsChart`):

```typescript
import { ToastStatsSection } from '@/components/ledger/ToastStatsSection'
// ...
<ToastStatsSection />
```

- [ ] **Step 3: Commit**

```bash
git add src/components/ledger/ToastStatsSection.tsx src/pages/Ledger.tsx
git commit -m "feat(ledger): add Toast service record stats section"
```

---

### Task 17: Studio Templates for Toast

**Files:**
- Create: `src/export/templates/ToastSessionCard.tsx`
- Modify: `src/pages/Studio.tsx` — register templates + add to TemplateRenderer

- [ ] **Step 1: Write the Toast template**

```typescript
import React from 'react'
import { FONT, COLOR, VARIANT_INNER } from './shared/utils'
import { InsetFrame } from './shared/InsetFrame'
import { BrandMark } from './shared/BrandMark'
import { BackgroundLayer } from './shared/BackgroundLayer'

interface ToastTemplateProps {
  entry: {
    title: string
    date: string
    location: string | null
    lore: string | null
    metadata: Record<string, unknown>
  }
  backgroundUrl?: string
  variant?: 1 | 2 | 3 | 4
}

const ROOT: React.CSSProperties = {
  width: '1080px',
  height: '1350px',
  backgroundColor: '#0D0B0F',
  fontFamily: FONT.body,
  overflow: 'hidden',
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
}

const Z2: React.CSSProperties = { position: 'relative', zIndex: 2 }

function V1({ entry, backgroundUrl }: ToastTemplateProps) {
  const meta = entry.metadata || {}
  const vibe = (meta.vibe_summary as string) || ''
  const guests = (meta.guest_count as number) || 0
  const duration = (meta.duration_seconds as number) || 0
  const mins = Math.round(duration / 60)

  return (
    <div style={{ ...VARIANT_INNER, justifyContent: 'flex-end' }}>
      <BackgroundLayer url={backgroundUrl} />
      <div style={{ ...Z2, padding: '60px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <p style={{ color: COLOR.gold, fontSize: '16px', letterSpacing: '4px', textTransform: 'uppercase', fontFamily: FONT.body }}>
          THE TOAST
        </p>
        <h1 style={{ color: COLOR.ivory, fontSize: '52px', fontFamily: FONT.display, fontWeight: 700, lineHeight: 1.1 }}>
          {entry.title}
        </h1>
        <p style={{ color: 'rgba(245,240,232,0.6)', fontSize: '18px', fontFamily: FONT.body }}>
          {entry.location && `${entry.location} · `}{entry.date}
        </p>
        {vibe && (
          <p style={{ color: COLOR.gold, fontSize: '16px', fontFamily: FONT.body, fontStyle: 'italic' }}>
            {vibe}
          </p>
        )}
        <div style={{ display: 'flex', gap: '24px', color: 'rgba(245,240,232,0.5)', fontSize: '14px' }}>
          {guests > 0 && <span>{guests} guests</span>}
          {mins > 0 && <span>{mins}m</span>}
        </div>
        <BrandMark size="sm" />
      </div>
    </div>
  )
}

function V2({ entry, backgroundUrl }: ToastTemplateProps) {
  const meta = entry.metadata || {}
  const vibe = (meta.vibe_summary as string) || ''

  return (
    <div style={{ ...VARIANT_INNER, justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
      <BackgroundLayer url={backgroundUrl} />
      <div style={{ ...Z2, padding: '80px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '32px' }}>
        <p style={{ color: COLOR.gold, fontSize: '14px', letterSpacing: '6px', textTransform: 'uppercase' }}>
          THE TOAST
        </p>
        <h1 style={{ color: COLOR.ivory, fontSize: '64px', fontFamily: FONT.display, fontWeight: 700, lineHeight: 1.05 }}>
          {entry.title}
        </h1>
        {vibe && (
          <p style={{ color: COLOR.gold, fontSize: '20px', fontFamily: FONT.display, fontStyle: 'italic', maxWidth: '700px' }}>
            "{vibe}"
          </p>
        )}
        <p style={{ color: 'rgba(245,240,232,0.5)', fontSize: '16px' }}>
          {entry.location && `${entry.location} · `}{entry.date}
        </p>
        <BrandMark size="sm" />
      </div>
    </div>
  )
}

function V3({ entry, backgroundUrl }: ToastTemplateProps) {
  const oneliner = (entry.metadata?.lore_oneliner as string) || entry.lore?.split('.')[0] || ''

  return (
    <div style={{ ...VARIANT_INNER, justifyContent: 'flex-end' }}>
      <BackgroundLayer url={backgroundUrl} />
      <div style={{ ...Z2, padding: '60px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <p style={{ color: COLOR.gold, fontSize: '14px', letterSpacing: '4px', textTransform: 'uppercase' }}>
          THE TOAST
        </p>
        {oneliner && (
          <p style={{ color: COLOR.ivory, fontSize: '28px', fontFamily: FONT.display, fontStyle: 'italic', lineHeight: 1.3, maxWidth: '800px' }}>
            "{oneliner}"
          </p>
        )}
        <div style={{ width: '60px', height: '2px', backgroundColor: COLOR.gold }} />
        <p style={{ color: 'rgba(245,240,232,0.6)', fontSize: '16px' }}>
          {entry.title} · {entry.date}
        </p>
        <BrandMark size="sm" />
      </div>
    </div>
  )
}

function V4({ entry, backgroundUrl }: ToastTemplateProps) {
  const meta = entry.metadata || {}
  const code = (meta.session_code as string) || ''

  return (
    <div style={{ ...VARIANT_INNER, justifyContent: 'flex-end' }}>
      <BackgroundLayer url={backgroundUrl} />
      <div style={{ ...Z2, padding: '60px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {code && (
          <p style={{ color: 'rgba(201,168,76,0.4)', fontSize: '120px', fontFamily: FONT.mono, fontWeight: 700, lineHeight: 1, letterSpacing: '16px' }}>
            {code}
          </p>
        )}
        <h1 style={{ color: COLOR.ivory, fontSize: '40px', fontFamily: FONT.display, fontWeight: 700 }}>
          {entry.title}
        </h1>
        <p style={{ color: 'rgba(245,240,232,0.5)', fontSize: '16px' }}>
          {entry.location && `${entry.location} · `}{entry.date}
        </p>
        <BrandMark size="sm" />
      </div>
    </div>
  )
}

export const ToastSessionCard = React.forwardRef<HTMLDivElement, ToastTemplateProps>(
  ({ variant = 1, ...props }, ref) => {
    const inner = (() => {
      switch (variant) {
        case 2: return <V2 {...props} />
        case 3: return <V3 {...props} />
        case 4: return <V4 {...props} />
        default: return <V1 {...props} />
      }
    })()
    return <div ref={ref} style={ROOT}><InsetFrame />{inner}</div>
  }
)

ToastSessionCard.displayName = 'ToastSessionCard'
```

- [ ] **Step 2: Register in Studio.tsx**

Add `toast_session_v1` through `toast_session_v4` to the `TemplateId` union type.

Add to `TEMPLATES_BY_TYPE`:
```typescript
toast: [
  { id: 'toast_session_v1', label: 'Classic', dims: '1080×1350', bgAspect: '3:4' },
  { id: 'toast_session_v2', label: 'Centered', dims: '1080×1350', bgAspect: '3:4' },
  { id: 'toast_session_v3', label: 'Quote', dims: '1080×1350', bgAspect: '3:4' },
  { id: 'toast_session_v4', label: 'Code', dims: '1080×1350', bgAspect: '3:4' },
],
```

Add to `TemplateRenderer` switch:
```typescript
case 'toast_session_v1':
  return <ToastSessionCard ref={innerRef} entry={entry} backgroundUrl={backgroundUrl} variant={1} />
case 'toast_session_v2':
  return <ToastSessionCard ref={innerRef} entry={entry} backgroundUrl={backgroundUrl} variant={2} />
case 'toast_session_v3':
  return <ToastSessionCard ref={innerRef} entry={entry} backgroundUrl={backgroundUrl} variant={3} />
case 'toast_session_v4':
  return <ToastSessionCard ref={innerRef} entry={entry} backgroundUrl={backgroundUrl} variant={4} />
```

- [ ] **Step 3: Commit**

```bash
git add src/export/templates/ToastSessionCard.tsx src/pages/Studio.tsx
git commit -m "feat(studio): add Toast session export templates (4 variants)"
```

---

### Task 18: Gent Profile — Toast Service Record

**Files:**
- Modify: `src/pages/Profile.tsx` (gent profile page)

- [ ] **Step 1: Add Toast stats section to gent profile**

Import and use the toast gent stats:

```typescript
import { fetchToastGentStats } from '@/data/toast'
import type { ToastGentStats } from '@/types/app'
```

Inside the profile component, fetch toast stats:

```typescript
const [toastStats, setToastStats] = useState<ToastGentStats[]>([])

useEffect(() => {
  if (!gent?.id) return
  fetchToastGentStats(gent.id)
    .then(setToastStats)
    .catch(() => {})
}, [gent?.id])
```

Render a "Toast Service Record" section (after Honours, before the bottom of the page):

```typescript
{toastStats.length > 0 && (
  <section className="mt-8">
    <p className="text-xs tracking-widest text-gold uppercase font-body font-semibold mb-3">
      Toast Service Record
    </p>
    {toastStats.map((s) => (
      <div key={s.id} className="bg-slate-dark rounded-xl p-4 border border-white/5 mb-2">
        <p className="text-ivory font-body text-sm font-semibold capitalize">{s.role === 'keys' ? 'Keys & Cocktails' : s.role === 'bass' ? 'Beard & Bass' : 'Lorekeeper'}</p>
        <div className="grid grid-cols-3 gap-2 mt-2 text-center">
          <div>
            <p className="text-gold font-display text-lg font-bold">{s.sessions_hosted}</p>
            <p className="text-ivory-dim text-xs">Sessions</p>
          </div>
          {s.role === 'keys' && (
            <>
              <div>
                <p className="text-gold font-display text-lg font-bold">{s.cocktails_crafted}</p>
                <p className="text-ivory-dim text-xs">Cocktails</p>
              </div>
              <div>
                <p className="text-gold font-display text-lg font-bold">{s.vibe_shifts_called}</p>
                <p className="text-ivory-dim text-xs">Vibe Shifts</p>
              </div>
            </>
          )}
          {s.role === 'bass' && (
            <>
              <div>
                <p className="text-gold font-display text-lg font-bold">{s.confessions_drawn}</p>
                <p className="text-ivory-dim text-xs">Confessions</p>
              </div>
              <div>
                <p className="text-gold font-display text-lg font-bold">{s.spotlights_given}</p>
                <p className="text-ivory-dim text-xs">Spotlights</p>
              </div>
            </>
          )}
          {s.role === 'lorekeeper' && (
            <>
              <div>
                <p className="text-gold font-display text-lg font-bold">{s.photos_taken}</p>
                <p className="text-ivory-dim text-xs">Photos</p>
              </div>
              <div>
                <p className="text-gold font-display text-lg font-bold">{s.reactions_sparked}</p>
                <p className="text-ivory-dim text-xs">Reactions</p>
              </div>
            </>
          )}
        </div>
      </div>
    ))}
  </section>
)}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/Profile.tsx
git commit -m "feat(profile): add Toast service record to gent profiles"
```

---

### Task 19: Dossier Enrichment — Toast Data on Person Detail

**Files:**
- Modify: `src/pages/PersonDetail.tsx`

- [ ] **Step 1: Show toast metadata on person dossier**

In the PersonDetail component, read toast-specific metadata from the person record and display if present:

```typescript
const meta = person.metadata as Record<string, unknown> | undefined
const toastAlias = meta?.toast_alias as string | undefined
const toastWrappedTitle = meta?.toast_wrapped_title as string | undefined
const toastSignatureDrink = meta?.toast_signature_drink as string | undefined
```

Render in the profile info area (after existing fields like birthday/horoscope):

```typescript
{(toastAlias || toastWrappedTitle || toastSignatureDrink) && (
  <div className="mt-4 pt-4 border-t border-white/5">
    <p className="text-xs tracking-widest text-gold uppercase font-body font-semibold mb-2">
      Toast Honours
    </p>
    {toastAlias && (
      <p className="text-ivory-dim text-sm font-body">
        Alias: <span className="text-ivory">{toastAlias}</span>
      </p>
    )}
    {toastWrappedTitle && (
      <p className="text-ivory-dim text-sm font-body">
        Title: <span className="text-gold font-semibold">{toastWrappedTitle}</span>
      </p>
    )}
    {toastSignatureDrink && (
      <p className="text-ivory-dim text-sm font-body">
        Signature Drink: <span className="text-ivory">{toastSignatureDrink}</span>
      </p>
    )}
  </div>
)}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/PersonDetail.tsx
git commit -m "feat(dossier): show Toast honours on person detail"
```

---

### Task 20: Toast Achievements

**Files:**
- Modify: `src/lib/achievements.ts` (or wherever `ACHIEVEMENT_DEFINITIONS` lives)

- [ ] **Step 1: Find the achievements file**

Search for `ACHIEVEMENT_DEFINITIONS` in the codebase and add:

```typescript
// Toast achievements
{ id: 'first_pour', name: 'First Pour', description: 'Host your first Toast session', category: 'toast', icon: 'wine' },
{ id: 'bartender', name: 'Bartender', description: 'Craft 10 cocktails as Keys & Cocktails', category: 'toast', icon: 'wine' },
{ id: 'confessor', name: 'Confessor', description: 'Draw 10 confessions as Beard & Bass', category: 'toast', icon: 'message-circle' },
{ id: 'chronicler_toast', name: 'Chronicler', description: 'Take 20 group snaps as Lorekeeper', category: 'toast', icon: 'camera' },
{ id: 'regular', name: 'Regular', description: 'Host 10 Toast sessions', category: 'toast', icon: 'wine' },
{ id: 'legendary_host', name: 'Legendary Host', description: 'Host 25 Toast sessions', category: 'toast', icon: 'crown' },
{ id: 'fifty_cocktails', name: '50 Cocktails', description: 'Craft 50 cocktails across all sessions', category: 'toast', icon: 'wine' },
```

Note: Achievement checking is handled by `checkAndAwardAchievements()` — toast achievements will need a new checker that reads from `toast_gent_stats`. This can be added as a follow-up since achievements are checked async and the stats table is already populated by `receive-toast-session`.

- [ ] **Step 2: Commit**

```bash
git add src/lib/achievements.ts
git commit -m "feat(achievements): add Toast-related achievement definitions"
```

---

### Task 21: Type Check + Build Verification

- [ ] **Step 1: Run type check**

```bash
npx tsc -b
```

Fix any type errors that arise from the new code.

- [ ] **Step 2: Verify build**

```bash
pnpm run build
```

- [ ] **Step 3: Commit any fixes**

```bash
git add -A
git commit -m "fix: resolve type errors from toast integration"
```

---

### Task 22: Toast Server-Side Bridge (The Toast App)

**Files in The Toast repo** (`C:\Users\User\...\The Gents`):
- Modify: `server/src/services/supabase.ts` — wire Supabase client
- Create: `server/src/services/bridge.ts` — session end payload assembly + edge function call
- Modify: `server/src/socket/party.ts` — call bridge at session end
- Modify: `client/src/pages/Party.tsx` — redirect to Chronicles on session end

This task is in the **Toast app repo**, not Chronicles. It connects the other end of the bridge.

- [ ] **Step 1: Wire Supabase client in Toast server**

In `server/src/services/supabase.ts`, initialize the client:

```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

Add `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `CHRONICLES_RECEIVE_URL` (the `receive-toast-session` edge function URL) to `.env.example`.

- [ ] **Step 2: Create `server/src/services/bridge.ts`**

This assembles the session payload from `RoomState` and POSTs to the Chronicles edge function:

```typescript
import { RoomState } from '@the-gents/shared'

interface BridgePayload {
  token: string
  session: {
    title: string
    date: string
    location: string | null
    city: string | null
    country: string | null
    country_code: string | null
    session_code: string
    duration_seconds: number
    act_count: number
    guest_count: number
    vibe_timeline: Array<{ act: number; vibe: string; timestamp: string }>
    vibe_summary: string
    cocktails: unknown[]
    confessions: unknown[]
    wrapped: unknown[]
    guests: unknown[]
    gent_participants: string[]
    gent_role_stats: Record<string, unknown>
    photos: unknown[]
  }
}

export async function bridgeSessionToChronicles(
  room: RoomState,
  token: string,
): Promise<{ entry_id: string } | null> {
  const receiveUrl = process.env.CHRONICLES_RECEIVE_URL
  if (!receiveUrl) {
    console.warn('CHRONICLES_RECEIVE_URL not set — skipping bridge')
    return null
  }

  // Assemble payload from RoomState
  // (Implementation depends on RoomState shape — map participants, cocktails, confessions, wrapped stats)
  const payload: BridgePayload = {
    token,
    session: {
      title: room.name || `The Toast — ${room.code}`,
      date: new Date().toISOString().split('T')[0],
      location: null,
      city: null,
      country: null,
      country_code: null,
      session_code: room.code,
      duration_seconds: Math.floor((Date.now() - room.startedAt) / 1000),
      act_count: room.currentAct,
      guest_count: room.participants.filter(p => !p.isGent).length,
      vibe_timeline: room.vibeHistory || [],
      vibe_summary: (room.vibeHistory || []).map(v => v.vibe).join(' → '),
      cocktails: room.cocktails || [],
      confessions: room.confessions || [],
      wrapped: room.wrappedCards || [],
      guests: room.participants.filter(p => !p.isGent).map(p => ({
        name: p.displayName || p.alias || 'Guest',
        alias: p.alias,
        traits: p.traits || [],
        portrait_base64: p.portraitBase64 || null,
      })),
      gent_participants: room.participants.filter(p => p.isGent).map(p => p.gentId!),
      gent_role_stats: {}, // Populated from room.gentStats
      photos: room.groupSnaps || [],
    },
  }

  try {
    const res = await fetch(receiveUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    const data = await res.json()
    if (data.error) {
      console.error('Bridge error:', data.error)
      return null
    }

    return { entry_id: data.entry_id }
  } catch (err) {
    console.error('Bridge call failed:', err)
    return null
  }
}
```

- [ ] **Step 3: Call bridge at session end**

In `server/src/socket/party.ts`, at the session end handler, call:

```typescript
import { bridgeSessionToChronicles } from '../services/bridge'

// At session end (act 4 complete or host ends):
const bridgeResult = await bridgeSessionToChronicles(room, room.bridgeToken)
if (bridgeResult) {
  // Emit redirect URL to all clients
  io.to(room.code).emit('SESSION_END', {
    redirectUrl: `${room.callbackUrl}${bridgeResult.entry_id}`,
  })
}
```

- [ ] **Step 4: Client redirect**

In the Toast client `Party.tsx`, listen for `SESSION_END` and redirect:

```typescript
socket.on('SESSION_END', ({ redirectUrl }) => {
  if (redirectUrl) {
    window.location.href = redirectUrl
  }
})
```

- [ ] **Step 5: Commit (in Toast repo)**

```bash
cd "The Gents"
git add server/src/services/bridge.ts server/src/services/supabase.ts server/src/socket/party.ts client/src/pages/Party.tsx .env.example
git commit -m "feat: add Chronicles bridge — session end writes to Supabase"
```

---

### Task 23: Final Integration Commit + Deploy

- [ ] **Step 1: Verify no type errors in Chronicles**

```bash
npx tsc -b
```

- [ ] **Step 2: Push Chronicles**

```bash
git push
```

- [ ] **Step 3: Watch deploy**

```bash
gh run watch $(gh run list --limit 1 --json databaseId -q '.[0].databaseId')
```

Verify all steps pass: Vercel, Supabase functions (including 3 new ones), DB migration.

- [ ] **Step 4: Set `TOAST_BRIDGE_SECRET` in Supabase**

In the Supabase dashboard → Edge Functions → Environment Variables, add `TOAST_BRIDGE_SECRET` with a random 32+ char string. Set the same value in The Toast server's `.env`.

---

### Chunk 4 Checkpoint

- [ ] Run `/simplify` to review changed code for reuse, quality, and efficiency before proceeding.

---

## Chunk 5: Review Fixes — Missing Spec Coverage

These tasks address items identified during plan review that were missing from the initial chunks.

### Task 24: Act Carousel in ToastLayout

**Files:**
- Modify: `src/components/chronicle/ToastLayout.tsx`

The spec requires an "Act Carousel" section — horizontal swipeable cards, one per act, showing act name, vibe mode pill, and key artifact.

- [ ] **Step 1: Add ActCarousel section after Session Header**

Insert between Session Header and Cocktail Gallery in `ToastLayout`:

```typescript
{/* Act Carousel */}
{session.session.vibe_timeline.length > 0 && (
  <section>
    <p className="text-xs tracking-widest text-gold uppercase font-body font-semibold mb-3">
      Acts
    </p>
    <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 snap-x snap-mandatory">
      {session.session.vibe_timeline.map((v, i) => {
        // Find the key artifact for this act
        const actCocktail = cocktails.find(c => c.act === v.act)
        const actConfession = confessions.find(c => c.act === v.act)

        return (
          <div
            key={i}
            className="snap-start shrink-0 w-64 bg-slate-dark rounded-xl p-4 border border-white/5"
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-ivory font-display font-bold text-sm">Act {v.act}</p>
              <span
                className="text-xs font-body px-2 py-0.5 rounded-full"
                style={{ backgroundColor: (VIBE_COLORS[v.vibe.toLowerCase()] || VIBE_COLORS.intimate) + '30', color: VIBE_COLORS[v.vibe.toLowerCase()] || VIBE_COLORS.intimate }}
              >
                {v.vibe}
              </span>
            </div>
            {actCocktail && (
              <p className="text-ivory-dim text-xs font-body line-clamp-2">
                Cocktail: {actCocktail.name}
              </p>
            )}
            {actConfession && !actCocktail && (
              <p className="text-ivory-dim text-xs font-body italic line-clamp-2">
                "{actConfession.prompt}"
              </p>
            )}
          </div>
        )
      })}
    </div>
  </section>
)}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/chronicle/ToastLayout.tsx
git commit -m "feat(toast): add act carousel section to ToastLayout"
```

---

### Task 25: Group Snaps PhotoGrid in ToastLayout

**Files:**
- Modify: `src/components/chronicle/ToastLayout.tsx`

- [ ] **Step 1: Add photos prop and PhotoGrid**

Add `photos` prop to `ToastLayoutProps`:
```typescript
import { PhotoGrid } from '@/components/chronicle/PhotoGrid'
import type { EntryPhoto } from '@/types/app'

interface ToastLayoutProps {
  // ... existing props ...
  photos: EntryPhoto[]
}
```

Add section before `loreSlot` at the bottom of the layout:

```typescript
{/* Group Snaps */}
{photos.length > 0 && (
  <section>
    <p className="text-xs tracking-widest text-gold uppercase font-body font-semibold mb-3">
      Group Snaps
    </p>
    <PhotoGrid photos={photos} entryId={entry.id} />
  </section>
)}
```

Update EntryDetail (Task 14) to pass `photos` prop from the existing `photos` state.

- [ ] **Step 2: Commit**

```bash
git add src/components/chronicle/ToastLayout.tsx src/pages/EntryDetail.tsx
git commit -m "feat(toast): add group snaps PhotoGrid to ToastLayout"
```

---

### Task 26: "Host a Toast" Button on Home Page

**Files:**
- Modify: `src/pages/Home.tsx`

- [ ] **Step 1: Add launch button**

Import the launch function:
```typescript
import { launchToastSession } from '@/ai/toast'
```

Add a "Host a Toast" card in the Home page sections (alongside existing section cards). Use the same card style as other sections:

```typescript
<button
  onClick={() => gent && launchToastSession(gent.id).catch(console.error)}
  className="w-full bg-slate-dark rounded-xl p-4 border border-gold/20 text-left flex items-center gap-3 active:scale-[0.98] transition-transform"
>
  <Wine size={20} className="text-gold shrink-0" />
  <div>
    <p className="text-ivory font-body text-sm font-semibold">Host a Toast</p>
    <p className="text-ivory-dim font-body text-xs">Launch a cocktail session</p>
  </div>
</button>
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/Home.tsx
git commit -m "feat(home): add Host a Toast launch button"
```

---

### Task 27: Fix Guest Matching Scope in Edge Function

**Files:**
- Modify: `supabase/functions/receive-toast-session/index.ts`

The guest matching query must scope to the hosting Gent's contacts via `person_gents`.

- [ ] **Step 1: Update the matching query**

Replace the simple `ilike` query (around the guest matching loop) with:

```typescript
// Scope match to hosting gent's contacts via person_gents
const { data: matches } = await db
  .from('person_gents')
  .select('person_id, people!inner(id, name, photo_url)')
  .eq('gent_id', auth.gent_id)
  .ilike('people.name', guest.name)
  .limit(1)

let personId: string | null = null
let matchStatus = 'unmatched'

if (matches && matches.length > 0) {
  personId = (matches[0] as any).people.id
  matchStatus = 'matched'
} else {
  // ... existing POI creation logic ...
}
```

- [ ] **Step 2: Commit**

```bash
git add supabase/functions/receive-toast-session/index.ts
git commit -m "fix(bridge): scope guest matching to hosting gent's contacts"
```

---

### Task 28: Draft Review — Confession Removal + Guest Match Correction

**Files:**
- Modify: `src/pages/ToastDraftReview.tsx`

- [ ] **Step 1: Add confession removal**

Add state for removed confessions:
```typescript
const [removedConfessions, setRemovedConfessions] = useState<Set<string>>(new Set())
```

In the preview section, filter out removed confessions:
```typescript
const filteredSession = session ? {
  ...session,
  confessions: session.confessions.filter(c => !removedConfessions.has(c.id)),
} : null
```

Add a confession list with remove buttons in the draft review UI (before the preview):

```typescript
{session?.confessions && session.confessions.length > 0 && (
  <div>
    <p className="text-xs tracking-widest text-gold uppercase font-body font-semibold mb-2">
      Confessions
    </p>
    <div className="space-y-2">
      {session.confessions.map((c) => (
        <div
          key={c.id}
          className={`flex items-center justify-between bg-slate-dark rounded-lg p-3 border border-white/5 ${removedConfessions.has(c.id) ? 'opacity-30' : ''}`}
        >
          <p className="text-ivory font-body text-sm italic flex-1 mr-3 line-clamp-1">"{c.prompt}"</p>
          <button
            onClick={() => {
              const next = new Set(removedConfessions)
              if (next.has(c.id)) next.delete(c.id)
              else next.add(c.id)
              setRemovedConfessions(next)
            }}
            className="text-xs text-ivory-dim font-body px-2 py-1 rounded border border-white/10"
          >
            {removedConfessions.has(c.id) ? 'Restore' : 'Remove'}
          </button>
        </div>
      ))}
    </div>
  </div>
)}
```

On publish, delete removed confessions from DB:
```typescript
// In handlePublish, before publishing:
if (removedConfessions.size > 0) {
  await supabase
    .from('toast_confessions')
    .delete()
    .in('id', Array.from(removedConfessions))
}
```

- [ ] **Step 2: Add guest match correction**

Add a simple dropdown/search for each "Unmatched" or "New POI" guest in the guest matching section. Use `fetchPeopleQuick` for search:

```typescript
import { fetchPeopleQuick } from '@/data/people'

// State for corrected matches
const [correctedMatches, setCorrectedMatches] = useState<Record<number, string>>({})
const [searchResults, setSearchResults] = useState<Record<number, Array<{ id: string; name: string }>>>({})

async function handleGuestSearch(index: number, query: string) {
  if (query.length < 2) return
  const results = await fetchPeopleQuick(query)
  setSearchResults(prev => ({ ...prev, [index]: results }))
}

function handleGuestCorrection(index: number, personId: string) {
  setCorrectedMatches(prev => ({ ...prev, [index]: personId }))
  setSearchResults(prev => ({ ...prev, [index]: [] }))
}
```

In the guest matching UI, add a search input for non-matched guests:

```typescript
{g.status !== 'matched' && (
  <div className="mt-1">
    <input
      type="text"
      placeholder="Search Circle..."
      onChange={(e) => handleGuestSearch(i, e.target.value)}
      className="w-full bg-obsidian text-ivory text-xs font-body px-2 py-1 rounded border border-white/10"
    />
    {(searchResults[i] || []).map((p) => (
      <button
        key={p.id}
        onClick={() => handleGuestCorrection(i, p.id)}
        className="block w-full text-left text-xs text-ivory font-body px-2 py-1 hover:bg-white/5"
      >
        {p.name}
      </button>
    ))}
    {correctedMatches[i] && (
      <p className="text-green-400 text-xs mt-1">Corrected</p>
    )}
  </div>
)}
```

Apply corrections on publish (update guest_matches + person_appearances).

- [ ] **Step 3: Commit**

```bash
git add src/pages/ToastDraftReview.tsx
git commit -m "feat(draft): add confession removal + guest match correction"
```

---

### Task 29: Disable full_chronicle for Toast

**Files:**
- Modify: `src/pages/EntryNew.tsx`

- [ ] **Step 1: Guard full_chronicle toggle**

Find the full_chronicle toggle section and add a condition. It should only render for `mission` and `night_out`:

```typescript
{(selectedType === 'mission' || selectedType === 'night_out') && (
  /* existing full_chronicle toggle */
)}
```

This may already be the case — verify and add guard if needed.

- [ ] **Step 2: Commit (if changed)**

```bash
git add src/pages/EntryNew.tsx
git commit -m "fix(entry): ensure full_chronicle only available for mission/night_out"
```

---

### Task 30: Add session_id to Entry Metadata in Edge Function

**Files:**
- Modify: `supabase/functions/receive-toast-session/index.ts`

- [ ] **Step 1: Update metadata write**

After creating the `toast_sessions` row and getting `sessionId`, update the entry metadata to include it:

In the metadata update call (step "Update entry metadata with guest matches"), add `session_id: sessionId`:

```typescript
await db
  .from('entries')
  .update({
    metadata: {
      session_id: sessionId,
      session_code,
      duration_seconds,
      // ... rest unchanged
    },
  })
  .eq('id', entryId)
```

- [ ] **Step 2: Commit**

```bash
git add supabase/functions/receive-toast-session/index.ts
git commit -m "fix(bridge): include session_id in entry metadata"
```

---

### Task 31: Fix staggerItem Animation Parents

**Files:**
- Modify: `src/components/chronicle/ToastLayout.tsx`

- [ ] **Step 1: Wrap scrollable card sections with staggerContainer**

Each horizontal scroll section that uses `variants={staggerItem}` on children needs `variants={staggerContainer}` on the parent. Update the Cocktail Gallery, Confessions, and Wrapped Strip parent divs:

Cocktail Gallery:
```typescript
<motion.div
  variants={staggerContainer}
  initial="initial"
  animate="animate"
  className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 snap-x snap-mandatory"
>
```

Same for Confessions (`space-y-3` div) and Wrapped Strip (horizontal scroll div).

- [ ] **Step 2: Commit**

```bash
git add src/components/chronicle/ToastLayout.tsx
git commit -m "fix(toast): wrap staggerItem sections with staggerContainer"
```

---

### Task 32: Mood Tags Auto-Derivation from Vibe Timeline

**Files:**
- Modify: `supabase/functions/receive-toast-session/index.ts`

- [ ] **Step 1: Auto-derive mood tags from vibe timeline**

Add this logic before the final metadata write:

```typescript
// Auto-derive mood tags from vibe timeline
const VIBE_TO_MOOD: Record<string, string> = {
  intimate: 'Intimate',
  electric: 'Electric',
  chaotic: 'Unhinged',
  chill: 'Sophisticated',
  wild: 'Late Night',
}

const derivedMoods = [...new Set(
  (vibe_timeline || [])
    .map((v: { vibe: string }) => VIBE_TO_MOOD[v.vibe.toLowerCase()])
    .filter(Boolean)
)]

// Include in metadata
metadata.mood_tags = derivedMoods
```

- [ ] **Step 2: Commit**

```bash
git add supabase/functions/receive-toast-session/index.ts
git commit -m "feat(bridge): auto-derive mood tags from vibe timeline"
```

---

### Task 33: Toast Entry-Type Asset

**Files:**
- Create: `public/entry-types/05.webp`

- [ ] **Step 1: Generate or add the asset**

Use Imagen or another tool to generate a noir geometric image for the Toast entry type (gold accent, cocktail glass motif, consistent with existing 01-07 entry type images). Save as `public/entry-types/05.webp`.

If the existing `05.webp` already exists and is assigned to toast, verify it matches. Otherwise create the new asset.

- [ ] **Step 2: Commit**

```bash
git add public/entry-types/05.webp
git commit -m "feat(assets): add toast entry-type image"
```

---

### Task 34: Toast Carousel Studio Template (Deferred)

The `toast_carousel` multi-slide template (session + cocktail + wrapped slides, like visa carousel) is a **follow-up task**. It requires:
- A `ToastCarouselPreview` wrapper (similar to `VisaCarouselPreview`)
- Multiple sub-slide components
- `activeSlide` state management lifted to Studio

This is significant UI complexity and should be built after the core integration is working. Register a placeholder in `TEMPLATES_BY_TYPE` with a `// TODO: toast_carousel` comment for now.

### Task 35: "Most Frequent Guest" in Ledger (Deferred)

The `top_guest_id` field on `toast_gent_stats` is populated by the bridge. Displaying a guest leaderboard requires:
- Fetching person names for `top_guest_id` values
- Ranking across all gents

Add as follow-up after the core stats section is rendering. Note in `ToastStatsSection` with a `// TODO: most frequent guest leaderboard` comment.
