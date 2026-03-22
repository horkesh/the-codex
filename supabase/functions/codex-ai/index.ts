const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { question, gent_id } = await req.json()
    if (!question || !gent_id) {
      return new Response(
        JSON.stringify({ error: 'question and gent_id required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!anthropicKey) throw new Error('ANTHROPIC_API_KEY not set')

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const { createClient } = await import('npm:@supabase/supabase-js@2')
    const db = createClient(supabaseUrl, supabaseServiceKey)

    // ── Fetch all context in parallel ────────────────────────────────────────

    const [
      entriesRes,
      gentsRes,
      statsRes,
      peopleCountRes,
      ps5Res,
    ] = await Promise.all([
      // Entries: compact select, latest 200
      db
        .from('entries')
        .select('id, type, title, date, city, country, lore, metadata, created_by')
        .in('status', ['published', 'gathering_post'])
        .order('date', { ascending: false })
        .limit(200),

      // Gents
      db.from('gents').select('id, display_name, alias, full_alias'),

      // Stats view
      db.from('gent_stats').select('*'),

      // People count
      db.from('people').select('id', { count: 'exact', head: true }),

      // PS5 entries for head-to-head
      db
        .from('entries')
        .select('metadata')
        .eq('type', 'playstation')
        .eq('status', 'published'),
    ])

    // ── Fetch participants for entries ──────────────────────────────────────

    const entryIds = (entriesRes.data ?? []).map((e: { id: string }) => e.id)
    const participantsRes = entryIds.length > 0
      ? await db
          .from('entry_participants')
          .select('entry_id, gent_id')
          .in('entry_id', entryIds)
      : { data: [] }

    // Build participant lookup: entry_id -> gent display names
    const gentMap: Record<string, string> = {}
    for (const g of (gentsRes.data ?? [])) {
      gentMap[g.id] = g.display_name
    }

    const participantsByEntry: Record<string, string[]> = {}
    for (const p of (participantsRes.data ?? [])) {
      if (!participantsByEntry[p.entry_id]) participantsByEntry[p.entry_id] = []
      participantsByEntry[p.entry_id].push(gentMap[p.gent_id] || 'Unknown')
    }

    // ── Build entry list ───────────────────────────────────────────────────

    const entryLines = (entriesRes.data ?? []).map((e: {
      type: string; title: string; date: string; city: string; country: string;
      lore: string | null; metadata: Record<string, unknown> | null; id: string;
    }) => {
      const participants = participantsByEntry[e.id]?.join(', ') || 'Unknown'
      const loreExcerpt = e.lore ? e.lore.substring(0, 120).replace(/\n/g, ' ') : ''
      const meta = e.metadata as Record<string, unknown> | null
      const flavour = meta?.flavour ? ` [${meta.flavour}]` : ''
      const score = meta?.score ? ` (score: ${meta.score}/10)` : ''
      const dateEnd = meta?.date_end ? ` to ${meta.date_end}` : ''
      return `- [${e.type}${flavour}] "${e.title}" | ${e.date}${dateEnd} | ${e.city || '?'}, ${e.country || '?'} | with: ${participants}${score}${loreExcerpt ? ` | ${loreExcerpt}...` : ''}`
    }).join('\n')

    // ── Build stats block ──────────────────────────────────────────────────

    const statsLines = (statsRes.data ?? []).map((s: {
      alias: string; missions: number; nights_out: number; steaks: number;
      ps5_sessions: number; toasts: number; gatherings: number;
      people_met: number; countries_visited: number; cities_visited: number;
      stamps_collected: number;
    }) => {
      const name = (gentsRes.data ?? []).find((g: { alias: string }) => g.alias === s.alias)?.display_name || s.alias
      return `${name}: ${s.missions} missions, ${s.nights_out} nights out, ${s.steaks} steaks, ${s.ps5_sessions} PS5 sessions, ${s.toasts} toasts, ${s.gatherings} gatherings, ${s.people_met} people met, ${s.countries_visited} countries, ${s.cities_visited} cities, ${s.stamps_collected} stamps`
    }).join('\n')

    // ── Build PS5 head-to-head ─────────────────────────────────────────────

    const h2h: Record<string, Record<string, number>> = {}
    for (const row of (ps5Res.data ?? [])) {
      const meta = row.metadata as Record<string, unknown> | null
      const snapshot = meta?.head_to_head_snapshot as Record<string, Record<string, number>> | undefined
      if (!snapshot) continue
      for (const [a, opponents] of Object.entries(snapshot)) {
        if (!h2h[a]) h2h[a] = {}
        for (const [b, wins] of Object.entries(opponents)) {
          h2h[a][b] = (h2h[a][b] || 0) + wins
        }
      }
    }

    const h2hLines: string[] = []
    const seen = new Set<string>()
    for (const [a, opponents] of Object.entries(h2h)) {
      for (const [b, winsA] of Object.entries(opponents)) {
        const key = [a, b].sort().join('-')
        if (seen.has(key)) continue
        seen.add(key)
        const winsB = h2h[b]?.[a] || 0
        const nameA = gentMap[a] || a
        const nameB = gentMap[b] || b
        h2hLines.push(`${nameA} ${winsA} - ${winsB} ${nameB}`)
      }
    }

    // ── Mission cities ─────────────────────────────────────────────────────

    const missionCities = [...new Set(
      (entriesRes.data ?? [])
        .filter((e: { type: string; city: string }) => e.type === 'mission' && e.city)
        .map((e: { city: string; country: string }) => `${e.city}, ${e.country}`)
    )]

    // ── Identify the asking gent ───────────────────────────────────────────

    const askingGent = (gentsRes.data ?? []).find((g: { id: string }) => g.id === gent_id)
    const askingName = askingGent?.display_name || 'Gent'

    // ── Compose system prompt ──────────────────────────────────────────────

    const systemPrompt = `You are The Codex AI — the intelligence memory of The Gents Chronicles, a private lifestyle chronicle app for a close group of friends known as "The Gents".

You speak with warmth, precision, and a touch of wit. Think of yourself as an analyst who has catalogued every dinner, every mission, every night out, every PS5 session. You know the data. You reference real entries, real dates, real cities. You never fabricate — if the data doesn't contain an answer, you say so honestly.

THE GENTS:
- Haris "Lorekeeper" — the narrator, the chronicler
- Vedad "Beard & Bass" — the tall one with the full beard
- Almedin "Keys & Cocktails" — the eldest, salt-and-pepper hair, fashion-forward
- Mirza "Retired Operative" — the tallest and broadest, retired from active duty

The person asking is: ${askingName}

CHRONICLE ENTRIES (${(entriesRes.data ?? []).length} total, latest 200):
${entryLines || '(No entries yet)'}

STATS:
${statsLines || '(No stats available)'}

PS5 HEAD-TO-HEAD RECORDS:
${h2hLines.length > 0 ? h2hLines.join('\n') : '(No PS5 records)'}

MISSION DESTINATIONS (${missionCities.length} cities):
${missionCities.join(', ') || '(None yet)'}

CIRCLE SIZE: ${peopleCountRes.count ?? 0} people

TODAY'S DATE: ${new Date().toISOString().split('T')[0]}

RULES:
- Be conversational and specific. Use names, dates, cities.
- Format dates as DD/MM/YYYY (European) when referencing them.
- Keep responses concise but thorough. No padding.
- You may be witty, but accuracy comes first.
- Never use emojis.
- If you genuinely don't know or the data doesn't cover it, say so.
- When listing entries, use the title and date for easy reference.
- Entry types: mission (travel), steak (Table/dinner), night_out (Night Out), playstation (Pitch/PS5), toast (cocktail session), gathering (hosted event), interlude (small moment).`

    // ── Call Claude ─────────────────────────────────────────────────────────

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: 'user', content: question }],
      }),
    })

    if (!res.ok) {
      const errText = await res.text()
      console.error('Claude API error:', errText)
      throw new Error(`Claude API returned ${res.status}`)
    }

    const result = await res.json()
    const answer = result.content?.[0]?.text?.trim() || 'I could not generate an answer.'

    return new Response(
      JSON.stringify({ answer }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('codex-ai error:', err)
    return new Response(
      JSON.stringify({ error: (err as Error).message || 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
