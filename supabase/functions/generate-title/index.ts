const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/** Type-specific instructions for title generation. */
const typeInstructions: Record<string, string> = {
  steak: `This is a Table entry (steak dinner). Identify the dish — the cut of meat, how it's prepared (grilled, pan-seared, etc.), notable sides or accompaniments. Example titles: "Bone-in Ribeye at Craft", "Wagyu Tataki, Truffle Mash", "Sunday Fillet at Home". If a restaurant name is visible, include it.`,
  night_out: `This is a Night Out entry. Identify the venue, vibe, or occasion from the photo — a rooftop bar, a club, a late-night spot. Example titles: "Rooftop at Sky Lounge", "Afrobeats Night, Victoria Island", "Late Ones at the Jazz Bar".`,
  toast: `This is a Toast entry (cocktail/drinks session). Identify the drinks — cocktails, whisky, wine — or the bar setting. Example titles: "Old Fashioneds at The Alchemist", "Whisky Flight, Three Deep", "Aperol Hour on the Terrace".`,
  mission: `This is a Mission entry (travel/trip). Capture the destination or the defining moment of the trip. Example titles: "48 Hours in Marrakech", "The Amalfi Drive", "First Morning in Lisbon".`,
  gathering: `This is a Gathering entry (hosted event). Identify the occasion or setting — a dinner party, a barbecue, a birthday. Example titles: "Friendsgiving at Ade's", "The Rooftop BBQ", "Birthday Supper, Round Two".`,
  interlude: `This is an Interlude entry (a small moment). Keep it brief and observational. Example titles: "Coffee Before the Storm", "A Quick One at Noon", "The Bench by the Canal".`,
  playstation: `This is a Pitch entry (PlayStation session). Reference the game if visible, or the setup. Example titles: "FC 25 Derby Night", "Three-Man Bracket, NBA 2K", "The Rematch".`,
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { photo, lore, entryType, location, city, country, date } = await req.json()
    const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set')

    const locationStr = [location, city, country].filter(Boolean).join(', ') || ''
    const typeInstruction = typeInstructions[entryType] || 'Identify the key subject, setting, or activity.'

    // Two modes: lore-based (text only) or photo-based (vision)
    let prompt: string
    let content: Array<Record<string, unknown>>

    if (lore) {
      // Generate title from lore text — no photo needed
      prompt = `You are naming an entry for a private lifestyle chronicle of three gentlemen called "The Gents".

Given the lore narrative below, generate a short, evocative title (3-8 words). The title should feel editorial and specific — distilling the essence of the lore into a punchy, memorable name.

${typeInstruction}
${locationStr ? `\nKnown location: ${locationStr}` : ''}${date ? `\nDate: ${date}` : ''}

Lore:
${lore}

Rules:
- Return ONLY the title text, nothing else — no quotes, no explanation, no prefix
- 3-8 words max
- No emojis
- Be specific to what the lore describes — pull a defining detail, mood, or moment
- If location is mentioned in the lore, you may incorporate it naturally but don't force it
- Do not use generic filler words like "A Night of...", "An Evening of...", "The Art of..."`

      content = [{ type: 'text', text: prompt }]
    } else {
      // Generate title from photo
      prompt = `You are naming an entry for a private lifestyle chronicle of three gentlemen called "The Gents".

Given the photo, generate a short, evocative title (3-8 words). The title should feel editorial and specific — not generic. It must reflect what is actually happening or visible in the photo.

${typeInstruction}
${locationStr ? `\nKnown location: ${locationStr}` : ''}${date ? `\nDate: ${date}` : ''}

Rules:
- Return ONLY the title text, nothing else — no quotes, no explanation, no prefix
- 3-8 words max
- No emojis
- Be specific to what you see (if it's a ribeye, say ribeye, not "steak")
- If a venue or restaurant name is visible in the photo, use it
- If location is provided, you may incorporate it naturally but don't force it
- Do not use generic filler words like "A Night of...", "An Evening of...", "The Art of..."`

      content = [
        { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: photo } },
        { type: 'text', text: prompt },
      ]
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 60,
        messages: [{ role: 'user', content }],
      }),
    })

    if (!response.ok) {
      throw new Error(`Claude API error: ${response.status}`)
    }

    const result = await response.json()
    const title = result.content?.[0]?.text?.trim().replace(/^["']|["']$/g, '') ?? ''

    return new Response(JSON.stringify({ title }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('generate-title error:', error)
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
