const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { entry, photoUrls } = await req.json()
    const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set')

    // Build a rich prompt from entry data
    const entryTypeLabels: Record<string, string> = {
      mission: 'Mission (travel/trip)',
      night_out: 'Night Out',
      steak: 'The Table (steak dinner)',
      playstation: 'The Pitch (PlayStation session)',
      toast: 'The Toast (cocktail session)',
      gathering: 'Gathering (hosted event)',
      interlude: 'Interlude (moment worth noting)',
    }

    const participantNames = entry.participants?.map((p: { display_name: string }) => p.display_name).join(', ') || 'The Gents'
    const photos: string[] = Array.isArray(photoUrls) ? photoUrls.slice(0, 4) : []

    // Derive day-of-week from date; read stored time-of-day from metadata
    const dayOfWeek = new Date(entry.date + 'T12:00:00Z').toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' })
    const rawTime = entry.metadata?.time_of_day as string | undefined
    let timeContext = `Day: ${dayOfWeek}`
    if (rawTime) {
      const [hStr, mStr] = rawTime.split(':')
      const h = parseInt(hStr, 10)
      const m = parseInt(mStr, 10)
      const period = h < 12 ? 'morning' : h < 14 ? 'midday' : h < 17 ? 'afternoon' : h < 20 ? 'evening' : 'night'
      const h12 = h % 12 || 12
      timeContext += `\nTime: ${h12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'} (${period})`
    }

    const prompt = `You are the chronicler of The Gents — three sophisticated gentlemen who document their lives together with style and wit. Write exactly 2-3 sentences of narrative lore for their private chronicle. The prose should be eloquent, slightly self-aware, warm, and feel like an entry in a very exclusive private journal.

Entry Type: ${entryTypeLabels[entry.type] || entry.type}
Title: ${entry.title}
Date: ${entry.date}
${timeContext}
Location: ${[entry.city, entry.country].filter(Boolean).join(', ') || entry.location || 'undisclosed location'}
Present: ${participantNames}
Description: ${entry.description || 'No additional details provided.'}
${photos.length > 0 ? `\nYou have been provided ${photos.length} photo(s) from this occasion. Observe the atmosphere, setting, and details carefully — including the mood, energy, and expressions of those present — and let these inform the narrative. If someone looks subdued or distracted, let that texture show. If the setting suggests a stolen hour from the workday, acknowledge it.` : ''}
Write the lore in first person plural ("We", "The Gents"). No hashtags, no emojis, no quotes around the text. Just the narrative.`

    // Build message content — images first, then the text prompt
    type ContentBlock =
      | { type: 'image'; source: { type: 'url'; url: string } }
      | { type: 'text'; text: string }
    const content: ContentBlock[] = [
      ...photos.map((url) => ({ type: 'image' as const, source: { type: 'url' as const, url } })),
      { type: 'text', text: prompt },
    ]

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 400,
        messages: [{ role: 'user', content }],
      }),
    })

    if (!response.ok) {
      throw new Error(`Claude API error: ${response.status}`)
    }

    const result = await response.json()
    const lore = result.content?.[0]?.text?.trim() ?? ''

    return new Response(JSON.stringify({ lore }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('generate-lore error:', error)
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
