const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const {
      winner,
      loser,
      game,
      streak,
      h2h_record,
      winner_elo,
      loser_elo,
      recent_results,
      previous_lines,
      total_matches,
      season_context,
    } = await req.json()

    if (!winner || !loser) {
      return new Response(JSON.stringify({ error: 'winner and loser required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set')

    const recentResultsStr = Array.isArray(recent_results)
      ? recent_results.join(', ')
      : 'No recent results'
    const previousLinesStr = Array.isArray(previous_lines) && previous_lines.length > 0
      ? previous_lines.map((l: string, i: number) => `${i + 1}. "${l}"`).join('\n')
      : 'None yet'

    const prompt = `You are the official sports commentator and trash talk broadcaster for The Gents PS5 Rivalry — a fierce gaming competition between three friends.

THE COMPETITORS:
- Keys (Almedin, "Keys & Cocktails"): The oldest. Sophisticated, strategic, thinks he's above everyone. When he wins, it's "calculated." When he loses, it's "the controller was lagging."
- Bass (Vedad, "Beard & Bass"): The biggest. Pure aggression, hates losing more than anything. Will blame the game, the TV, the alignment of the planets — anything but himself.
- Lorekeeper (Haris, "Lorekeeper"): The tactician. Keeps spreadsheets of results. Will remind you of a loss from 18 months ago. Plays mind games before the match even starts.

MATCH RESULT:
Winner: ${winner}
Loser: ${loser}
Game: ${game || 'PS5'}

RIVALRY CONTEXT:
- Head-to-head: ${h2h_record || 'Unknown'}
- Winner's current streak: ${streak ?? 0} wins in a row against ${loser}
- ELO ratings: ${winner} (${winner_elo ?? '?'}) vs ${loser} (${loser_elo ?? '?'})
- Recent results: ${recentResultsStr}
- Season: ${season_context || 'Unknown'}
- Total matches between them: ${total_matches ?? '?'}

PREVIOUS COMMENTARY (DO NOT repeat themes or structures from these):
${previousLinesStr}

Generate THREE things:
1. COMMENTARY: A 2-3 sentence sports-broadcast-style match report. Dramatic, vivid, reference the specific context. Like ESPN SportsCenter covering this match.
2. TRASH_TALK: ONE devastating, personalized roast of the loser. Savage but friendly. Reference their known personality. Make it hurt (lovingly).
3. ARC: ONE sentence describing where this rivalry is heading. Is this a dynasty? A comeback? A collapse? A changing of the guard?

Return as JSON: { "commentary": "...", "trash_talk": "...", "arc_narrative": "..." }`

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 500,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Claude API failed: ${res.status} ${err}`)
    }

    const data = await res.json()
    const raw = data.content?.[0]?.text?.trim() ?? ''

    // Parse JSON from response (may be wrapped in markdown code block)
    let parsed: { commentary?: string; trash_talk?: string; arc_narrative?: string }
    try {
      const jsonStr = raw.replace(/^```json?\s*/i, '').replace(/\s*```$/, '')
      parsed = JSON.parse(jsonStr)
    } catch {
      // Fallback: treat whole response as trash_talk for backward compat
      parsed = { commentary: '', trash_talk: raw, arc_narrative: '' }
    }

    return new Response(JSON.stringify({
      commentary: parsed.commentary ?? '',
      trash_talk: parsed.trash_talk ?? '',
      arc_narrative: parsed.arc_narrative ?? '',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
