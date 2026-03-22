const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { winner, loser, game, streak, h2h_record } = await req.json()
    if (!winner || !loser) {
      return new Response(JSON.stringify({ error: 'winner and loser required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set')

    let context = ''
    if (streak && streak > 1) context += `\nThe winner is on a ${streak}-game win streak.`
    if (h2h_record) context += `\nHead-to-head record: ${h2h_record}.`

    const prompt = `You are the official trash talk commentator for The Gents — a group of three friends who have a fierce PS5 rivalry.

The gents and their personalities:
- Keys (Almedin, "Keys & Cocktails"): The oldest, sophisticated, thinks he's the best. Plays strategically.
- Bass (Vedad, "Beard & Bass"): The biggest, competitive, hates losing. Plays aggressively.
- Lorekeeper (Haris, "Lorekeeper"): The tactical one, analytical. Keeps records of everything.

Generate ONE devastating, funny, personalized trash talk line about this match result. Be savage but friendly — like roasting your best friend. Reference their known personality traits, past rivalries, and gaming style. Keep it to 1-2 sentences max.

Make it specific to the game, the players involved, and any streak/record context provided.

Winner: ${winner}
Loser: ${loser}
Game: ${game || 'PS5'}${context}`

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 150,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Claude API failed: ${res.status} ${err}`)
    }

    const data = await res.json()
    const trashTalk = data.content?.[0]?.text?.trim() ?? ''

    return new Response(JSON.stringify({ trash_talk: trashTalk }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
