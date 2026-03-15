const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const {
      entry_title,
      entry_lore,
      entry_date,
      entry_type,
      years_ago,
      location,
    } = await req.json() as {
      entry_title: string
      entry_lore: string | null
      entry_date: string
      entry_type: string
      years_ago: number
      location: string | null
    }

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set')

    if (!entry_title) throw new Error('entry_title is required')
    if (!entry_date) throw new Error('entry_date is required')
    if (years_ago == null) throw new Error('years_ago is required')

    const yearLabel = `${years_ago} year${years_ago === 1 ? '' : 's'} ago`

    const prompt = `You are the chronicler of The Gents. Write a 2-3 sentence retrospective for an anniversary moment in their chronicle.

Original Entry: "${entry_title}"
Date: ${entry_date} (${yearLabel})
Location: ${location || 'undisclosed'}
Type: ${entry_type}
Original Lore: ${entry_lore || 'No lore recorded.'}

Write a short retrospective in first person plural ("We", "The Gents") from the present day, looking back. Nostalgic, warm, precise. 2-3 sentences only. No quotes, no emojis.`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 200,
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
    console.error('generate-throwback error:', error)
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
