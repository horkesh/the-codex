const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ArcEntry {
  title: string
  date: string
  type: string
  lore: string | null
  location: string | null
  city: string | null
  country: string | null
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { story_title, entries, gent_names } = await req.json() as {
      story_title: string
      entries: ArcEntry[]
      gent_names: string[]
    }

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set')

    if (!story_title) throw new Error('story_title is required')
    if (!entries || entries.length === 0) throw new Error('entries array is required and must not be empty')

    const entrySummaries = entries
      .map(e => {
        const locationStr = [e.city, e.country].filter(Boolean).join(', ') || e.location || 'unknown location'
        const loreLine = e.lore ? `\n  Lore: ${e.lore}` : ''
        return `- ${e.date}: ${e.title} (${e.type}) in ${locationStr}${loreLine}`
      })
      .join('\n')

    const prompt = `You are the chronicler of The Gents — three sophisticated gentlemen who document their lives together. You are writing a chapter narrative for their Passport — a curated story spanning multiple chronicle entries.

Story Title: ${story_title}
The Gents Present: ${gent_names.join(', ')}
Entries in this story (${entries.length}):
${entrySummaries}

Write a chapter-level narrative (200-300 words) that weaves these moments into one coherent arc. Cinematic, eloquent, slightly self-aware. Third-person. The kind of prose that reads like the opening of a travel memoir or a film voiceover. No emojis, no quotes around the text. Just the narrative.`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 600,
        messages: [{ role: 'user', content: prompt }],
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
    console.error('generate-story-arc error:', error)
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
