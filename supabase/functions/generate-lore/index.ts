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

import { GENT_VISUAL_ID as GENT_IDENTITIES } from '../_shared/gent-identities.ts'

// Type-specific narrative voice and focus
const entryTypeDirectives: Record<string, string> = {
  steak: `This is a Table entry — a steak dinner. The prose should savour the ritual: the cut of meat, the sear, the sides, how the table was set, the restaurant or kitchen atmosphere. Reference the food as a centrepiece of the occasion. If photos show the steak, plates, or table setting, describe them with appetite. The tone is reverent — these men take their steaks seriously.`,
  playstation: `This is a Pitch entry — a PlayStation gaming session. The prose should capture the competitive energy, the banter, the glory and defeat. Reference the game if the title is mentioned, or the intensity of the session. Lean into the camaraderie of grown men who still play like their honour depends on it. If photos show the screen or setup, note the battlefield.`,
  toast: `This is a Toast — a cocktail session hosted by The Gents. Focus on the social chemistry: who was there, the energy in the room, standout confessions or moments of vulnerability, the cocktails that defined the evening. Write as if recounting a legendary salon — intimate, witty, with an undercurrent of mischief. Reference specific cocktail names and guest aliases if available in the metadata. Let the vibe shifts colour the narrative arc.`,
  night_out: `This is a Night Out entry. The prose should capture the energy of the city at night — the venues, the movement between places, the escalation from civilised to less so. Capture the sense of a night that earned its place in the chronicle. If photos show the scene, draw from the setting and body language.`,
  mission: `This is a Mission entry — a trip or travel adventure. The prose should capture the thrill of displacement: new terrain, new tastes, the bond that tightens when the usual routines fall away. Reference the destination and what made this mission distinct. You may have many photos from across the full journey — weave a narrative that spans the entire trip, referencing different moments, locations, meals, and discoveries captured in the photos. Treat the photos as chapters of the story.`,
  gathering: `This is a Gathering entry — a hosted event or get-together. The prose should capture the warmth of hosting or being hosted: the extended circle, the conversations across the room, the effort someone put into making it happen. Note the scale and intimacy of the occasion.`,
  interlude: `This is an Interlude entry — a smaller moment worth recording. The prose should treat this as a quiet aside in the chronicle: a chance encounter, a brief coffee, an errand that turned into something memorable. Keep the tone lighter, more observational. Not every entry needs grandeur — some are valuable precisely because they are unhurried and small.`,
}

const liveMusicDirective = `This is a Live Music night — one of the Gents at the keys, performing live at a small venue. The prose should capture his presence at the piano, fingers on the keys, the sound filling a tight room. If photos show the performer, describe his command of the instrument and the stage. If photos show the crowd, describe the atmosphere — drinks in hand, conversations paused, eyes on the piano. Reference the song if provided. This is a night where the music came from one of their own.`

const iftarDirective = `This is an Iftar — the breaking of the fast. The prose should carry the quiet weight of a day's patience rewarded: the first sip of water, the dates, the unhurried gratitude before the feast begins. Let the ritual texture the scene — the communal table, the generosity of the spread, the way conversation deepens when it follows silence. Reference the food with reverence but not formality. If the setting is a restaurant, note the shared atmosphere; if it is intimate, honour the closeness. The tone is warm, grounded, and gently reverent — faith woven into fellowship, never preachy.`

const eidDirective = `This is an Eid gathering — Bajram, the feast that crowns the fast. The prose should carry celebration and earned joy: the morning prayers still fresh, the embraces at the door, the table set with intention. The food is abundant and deliberate — this is not restraint but reward. Reference the dishes, the generosity, the way laughter fills a room that spent weeks in quiet discipline. If family or extended circle is present, honour the warmth. The tone is festive, grateful, communal — a holiday earned, not given.`

// WMO weather code to description
const WMO_CODES: Record<number, string> = {
  0: 'clear skies', 1: 'mostly clear', 2: 'partly cloudy', 3: 'overcast',
  45: 'foggy', 48: 'rime fog', 51: 'light drizzle', 53: 'drizzle', 55: 'heavy drizzle',
  61: 'light rain', 63: 'rain', 65: 'heavy rain', 71: 'light snow', 73: 'snow', 75: 'heavy snow',
  80: 'rain showers', 81: 'heavy rain showers', 82: 'violent rain showers',
  85: 'light snow showers', 86: 'heavy snow showers', 95: 'thunderstorm',
  96: 'thunderstorm with hail', 99: 'thunderstorm with heavy hail',
}

/** Fetch weather for a date+location via Open-Meteo archive API (free, no key). */
async function fetchWeather(date: string, city: string | null, country: string | null): Promise<string | null> {
  if (!city) return null
  try {
    // Geocode city → lat/lng
    const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en`
    const geoRes = await fetch(geoUrl, { signal: AbortSignal.timeout(5000) })
    if (!geoRes.ok) return null
    const geoData = await geoRes.json()
    const loc = geoData?.results?.[0]
    if (!loc) return null
    const { latitude, longitude } = loc

    // Fetch daily weather for that date
    const weatherUrl = `https://archive-api.open-meteo.com/v1/archive?latitude=${latitude}&longitude=${longitude}&start_date=${date}&end_date=${date}&daily=temperature_2m_max,temperature_2m_min,weathercode&timezone=auto`
    const wRes = await fetch(weatherUrl, { signal: AbortSignal.timeout(5000) })
    if (!wRes.ok) return null
    const wData = await wRes.json()
    const daily = wData?.daily
    if (!daily?.temperature_2m_max?.[0]) return null

    const hi = Math.round(daily.temperature_2m_max[0])
    const lo = Math.round(daily.temperature_2m_min[0])
    const code = daily.weathercode?.[0] ?? 0
    const desc = WMO_CODES[code] ?? 'unknown conditions'
    return `${desc}, ${lo}-${hi}\u00B0C`
  } catch {
    return null // Non-critical — weather is a nice-to-have
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { entry, photoUrls, dayLabels } = await req.json()
    // dayLabels: optional string[] like ["Day 1 — Friday, 14 March", "Day 2 — Saturday, 15 March"]
    const isMultiDay = Array.isArray(dayLabels) && dayLabels.length > 1
    const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set')

    const participantNames = entry.participants?.map((p: { display_name: string }) => p.display_name).join(', ') || 'The Gents'
    // Cap photos for vision API — too many causes timeouts. Spread evenly across the set.
    const maxPhotos = entry.type === 'mission' ? 8 : entry.type === 'night_out' ? 6 : 4
    const allPhotos: string[] = Array.isArray(photoUrls) ? photoUrls : []
    const photos: string[] = allPhotos.length <= maxPhotos
      ? allPhotos
      : Array.from({ length: maxPhotos }, (_, i) => allPhotos[Math.floor(i * allPhotos.length / maxPhotos)])

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

    const flavour = entry.metadata?.flavour as string | undefined
    const typeDirective = (entry.type === 'steak' && flavour === 'iftar')
      ? iftarDirective
      : (entry.type === 'steak' && flavour === 'eid')
      ? eidDirective
      : (entry.type === 'night_out' && flavour === 'live_music')
      ? liveMusicDirective
      : (entryTypeDirectives[entry.type] || '')
    const loreHints = entry.metadata?.lore_hints as string | undefined

    // Mood tags from entry creation
    const moodTags = Array.isArray(entry.metadata?.mood_tags) ? entry.metadata.mood_tags as string[] : []
    const moodLine = moodTags.length > 0 ? `\nMood: ${moodTags.join(', ')}` : ''

    // Full Chronicle mode — extended narrative
    const isFullChronicle = entry.metadata?.full_chronicle === true

    // Weather — non-critical, 5s timeout per call
    const weather = await fetchWeather(entry.date, entry.city, entry.country)
    const weatherLine = weather ? `\nWeather: ${weather}` : ''

    const lengthInstruction = isMultiDay
      ? 'Write a mission chronicle with an overview and per-day narratives.'
      : isFullChronicle
        ? 'Write a full chronicle entry — 4-6 sentences of dense, meaningful narrative. Not longer for the sake of length: every sentence must earn its place with a specific detail, a name, a sensory moment, or an observation that only someone who was there would know. Prefer one vivid, precise image over two vague ones. Cover the arc — how it started, the turning point, and the feeling it left behind.'
        : 'Write exactly 2-3 sentences of narrative lore for their private chronicle.'

    const multiDayFormat = isMultiDay
      ? `\n\nThis is a multi-day mission spanning ${dayLabels.length} days: ${dayLabels.join('; ')}.\n\nReturn your response in this format:\n<lore>2-3 sentence overview of the entire mission — the arc, the mood, the defining character of this trip.</lore>\n${dayLabels.map((_: string, i: number) => `<day${i + 1}>1-2 sentences capturing the essence of ${dayLabels[i]} — what happened, what stood out, the energy of that day.</day${i + 1}>`).join('\n')}\n<oneliner>One punchy sentence distilled from the mission — poster-worthy.</oneliner>\n<title>A short, evocative title (3-7 words, no dates, no quotes).</title>`
      : `\n\nReturn your response in exactly this format (three lines, no labels on the first line):\n<lore>The ${isFullChronicle ? '4-6 sentence' : '2-3 sentence'} narrative.</lore>\n<oneliner>One punchy sentence distilled from the lore — the kind of line you'd put on a poster or Instagram export card.</oneliner>\n<title>A short, evocative title for this entry (3-7 words, no dates, no quotes).</title>`

    const prompt = `You are the chronicler of The Gents — three sophisticated gentlemen who document their lives together with style and wit. ${lengthInstruction} The prose should be eloquent, slightly self-aware, warm, and feel like an entry in a very exclusive private journal.

Entry Type: ${entryTypeLabels[entry.type] || entry.type}
Title: ${entry.title}
Date: ${entry.date}
${timeContext}${situationalHint ? `\nContext: ${situationalHint}` : ''}
Location: ${[entry.city, entry.country].filter(Boolean).join(', ') || entry.location || 'undisclosed location'}${weatherLine}${moodLine}
Present: ${participantNames}
Description: ${entry.description || 'No additional details provided.'}${entry.metadata?.song ? `\nSong: ${entry.metadata.song}` : ''}${loreHints ? `\nDirector's Notes (incorporate these details naturally): ${loreHints}` : ''}
${typeDirective ? `\n${typeDirective}` : ''}${moodTags.length > 0 ? `\nThe mood tags above reflect the energy of this occasion — let them subtly shape the tone and vocabulary of the narrative. Don't list or name the moods explicitly; embody them.` : ''}${photos.length > 0 ? `\n${GENT_IDENTITIES}\n\nYou have been provided ${photos.length} photo(s) sampled from ${allPhotos.length} total from this occasion. Observe the atmosphere, setting, and details carefully — including the mood, energy, and expressions of those present — and let these inform the narrative. If you can identify specific Gents in the photos, reference them by name. If someone looks subdued or distracted, let that texture show.` : ''}
IMPORTANT: The Day and Time fields above are from the camera's EXIF data and are authoritative. Always use them to set the time of day in the narrative — do NOT infer a different time of day from photo lighting or ambiance. If the Context field is present, weave that situational awareness into the prose naturally.${weather ? ` If Weather is provided, let it inform atmosphere and sensory details naturally — don't force a weather report, but let the conditions colour the scene.` : ''}
Write the lore in first person plural ("We", "The Gents"). No hashtags, no emojis, no quotes around the text.${multiDayFormat}`

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
        max_tokens: isMultiDay ? 800 : isFullChronicle ? 600 : 400,
        messages: [{ role: 'user', content }],
      }),
      signal: AbortSignal.timeout(20000),
    })

    if (!response.ok) {
      throw new Error(`Claude API error: ${response.status}`)
    }

    const result = await response.json()
    const raw = result.content?.[0]?.text?.trim() ?? ''

    // Parse structured response
    const loreMatch = raw.match(/<lore>([\s\S]*?)<\/lore>/)
    const onelinerMatch = raw.match(/<oneliner>([\s\S]*?)<\/oneliner>/)
    const titleMatch = raw.match(/<title>([\s\S]*?)<\/title>/)

    const lore = loreMatch?.[1]?.trim() || raw.replace(/<[^>]+>/g, '').trim()
    const oneliner = onelinerMatch?.[1]?.trim() || null
    const suggested_title = titleMatch?.[1]?.trim() || null

    // Extract per-day lore for multi-day missions
    let day_lore: string[] | undefined
    if (isMultiDay) {
      day_lore = []
      for (let i = 0; i < dayLabels.length; i++) {
        const dayMatch = raw.match(new RegExp(`<day${i + 1}>([\\s\\S]*?)<\\/day${i + 1}>`))
        day_lore.push(dayMatch?.[1]?.trim() || '')
      }
    }

    return new Response(JSON.stringify({ lore, oneliner, suggested_title, day_lore }), {
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
