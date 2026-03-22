const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { lore, title, city, country } = await req.json()
    const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set')

    if (!lore) {
      return new Response(JSON.stringify({ error: 'lore required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const destination = [city, country].filter(Boolean).join(', ') || 'Unknown'

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 100,
        messages: [
          {
            role: 'user',
            content: `You are a music curator for a private lifestyle chronicle of three friends. Based on the following trip narrative, suggest ONE real song that captures the mood, energy, and spirit of this experience.

The song must be a real, well-known track available on Spotify. Consider the city, the activities, the time of day, the emotional tone. Pick something with character — avoid generic pop unless it truly fits.

Return ONLY the song name and artist in this exact format: Song Name - Artist
No quotes, no explanation, no other text.

Trip: ${title || 'Untitled'}
Destination: ${destination}
Narrative: ${lore.slice(0, 1500)}`,
          },
        ],
      }),
    })

    const data = await res.json()
    const suggestion = data?.content?.[0]?.text?.trim() ?? null

    return new Response(JSON.stringify({ suggestion }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
