const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const entryTypeLabels: Record<string, string> = {
  mission: 'Mission (travel/trip)',
  night_out: 'Night Out',
  steak: 'The Table (steak dinner)',
  playstation: 'The Pitch (PlayStation session)',
  toast: 'The Toast (cocktail session)',
  gathering: 'Gathering (hosted event)',
  interlude: 'Interlude (moment worth noting)',
}

// Visual identification guide for The Gents (used when photos are present)
const GENT_IDENTITIES = `The Gents — visual identification:
- Haris (alias "Lorekeeper"): bald, bearded
- Vedad (alias "Bass"): has hair, fully bearded
- Almedin (alias "Keys"): has hair, no beard (clean-shaven)
Use their first names naturally in the narrative when you can identify them in photos.`

// Type-specific narrative voice and focus
const entryTypeDirectives: Record<string, string> = {
  steak: `This is a Table entry — a steak dinner. The prose should savour the ritual: the cut of meat, the sear, the sides, how the table was set, the restaurant or kitchen atmosphere. Reference the food as a centrepiece of the occasion. If photos show the steak, plates, or table setting, describe them with appetite. The tone is reverent — these men take their steaks seriously.`,
  playstation: `This is a Pitch entry — a PlayStation gaming session. The prose should capture the competitive energy, the banter, the glory and defeat. Reference the game if the title is mentioned, or the intensity of the session. Lean into the camaraderie of grown men who still play like their honour depends on it. If photos show the screen or setup, note the battlefield.`,
  toast: `This is a Toast entry — a cocktail or drinks session. The prose should have a liquid warmth: reference the glasses, the spirit of choice, the clink and pour. Whether it's a refined bar or drinks at home, capture the ease of conversation that only flows freely over good drinks. If photos show cocktails or bottles, let them anchor the narrative.`,
  night_out: `This is a Night Out entry. The prose should capture the energy of the city at night — the venues, the movement between places, the escalation from civilised to less so. Capture the sense of a night that earned its place in the chronicle. If photos show the scene, draw from the setting and body language.`,
  mission: `This is a Mission entry — a trip or travel adventure. The prose should capture the thrill of displacement: new terrain, new tastes, the bond that tightens when the usual routines fall away. Reference the destination and what made this mission distinct. If photos show landmarks or scenery, weave them into the narrative.`,
  gathering: `This is a Gathering entry — a hosted event or get-together. The prose should capture the warmth of hosting or being hosted: the extended circle, the conversations across the room, the effort someone put into making it happen. Note the scale and intimacy of the occasion.`,
  interlude: `This is an Interlude entry — a smaller moment worth recording. The prose should treat this as a quiet aside in the chronicle: a chance encounter, a brief coffee, an errand that turned into something memorable. Keep the tone lighter, more observational. Not every entry needs grandeur — some are valuable precisely because they are unhurried and small.`,
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { entry, photoUrls } = await req.json()
    const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set')

    const participantNames = entry.participants?.map((p: { display_name: string }) => p.display_name).join(', ') || 'The Gents'
    const photos: string[] = Array.isArray(photoUrls) ? photoUrls.slice(0, 4) : []

    // Derive day-of-week from date; read stored time-of-day from metadata
    const dateObj = new Date(entry.date + 'T12:00:00Z')
    const dayOfWeek = dateObj.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' })
    const dayNum = dateObj.getUTCDay() // 0=Sun, 6=Sat
    const isWeekday = dayNum >= 1 && dayNum <= 5
    const rawTime = entry.metadata?.time_of_day as string | undefined
    let timeContext = `Day: ${dayOfWeek}${isWeekday ? ' (weekday)' : ' (weekend)'}`
    let situationalHint = ''
    if (rawTime) {
      const [hStr, mStr] = rawTime.split(':')
      const h = parseInt(hStr, 10)
      const m = parseInt(mStr, 10)
      const period = h < 6 ? 'early hours' : h < 12 ? 'morning' : h < 14 ? 'midday' : h < 17 ? 'afternoon' : h < 20 ? 'evening' : 'night'
      const h12 = h % 12 || 12
      timeContext += `\nTime: ${h12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'} (${period})`

      // Derive situational hint from day-of-week + time
      if (isWeekday) {
        if (h >= 11 && h < 14) situationalHint = 'This is a weekday lunch window — likely a lunch break rendezvous.'
        else if (h >= 14 && h < 17) situationalHint = 'This is a weekday afternoon — possibly an early finish or a break from the office.'
        else if (h >= 9 && h < 11) situationalHint = 'This is a weekday morning — an early meet before the workday takes over.'
        else if (h >= 17 && h < 20) situationalHint = 'This is a weekday evening — an after-work occasion.'
        else if (h >= 20) situationalHint = 'This is a weekday night — the workday is well behind them.'
      } else {
        if (h >= 6 && h < 12) situationalHint = 'Weekend morning — unhurried start to the day.'
        else if (h >= 12 && h < 17) situationalHint = 'Weekend afternoon — the day stretches ahead with no obligations.'
      }
    }

    const typeDirective = entryTypeDirectives[entry.type] || ''

    const prompt = `You are the chronicler of The Gents — three sophisticated gentlemen who document their lives together with style and wit. Write exactly 2-3 sentences of narrative lore for their private chronicle. The prose should be eloquent, slightly self-aware, warm, and feel like an entry in a very exclusive private journal.

Entry Type: ${entryTypeLabels[entry.type] || entry.type}
Title: ${entry.title}
Date: ${entry.date}
${timeContext}${situationalHint ? `\nContext: ${situationalHint}` : ''}
Location: ${[entry.city, entry.country].filter(Boolean).join(', ') || entry.location || 'undisclosed location'}
Present: ${participantNames}
Description: ${entry.description || 'No additional details provided.'}
${typeDirective ? `\n${typeDirective}` : ''}${photos.length > 0 ? `\n${GENT_IDENTITIES}\n\nYou have been provided ${photos.length} photo(s) from this occasion. Observe the atmosphere, setting, and details carefully — including the mood, energy, and expressions of those present — and let these inform the narrative. If you can identify specific Gents in the photos, reference them by name. If someone looks subdued or distracted, let that texture show.` : ''}
IMPORTANT: The Day and Time fields above are from the camera's EXIF data and are authoritative. Always use them to set the time of day in the narrative — do NOT infer a different time of day from photo lighting or ambiance. If the Context field is present, weave that situational awareness into the prose naturally.
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
