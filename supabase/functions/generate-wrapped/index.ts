import Anthropic from 'npm:@anthropic-ai/sdk'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { year, stats } = await req.json()

    const client = new Anthropic({
      apiKey: Deno.env.get('ANTHROPIC_API_KEY') ?? '',
    })

    // Build a summary of each gent's stats for the prompt
    const statsSummary = (stats as Array<Record<string, unknown>>).map((s) =>
      `${s.alias}: ${s.missions} missions, ${s.nights_out} nights out, ${s.steaks} steaks, ${s.ps5_sessions} PS5 sessions, ${s.countries_visited} countries`
    ).join('\n')

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 512,
      messages: [{
        role: 'user',
        content: `You are the Chronicler of The Gentlemen's Chronicles. Write an annual Wrapped narrative for the year ${year}.

Stats:
${statsSummary}

Write 4-6 sentences in first person plural ("We"), past tense, in an eloquent private journal voice. Mention the gents by their aliases (Keys, Bass, Lorekeeper). Make it feel like an end-of-year toast — celebratory but intimate. Do not use headers or bullet points. Just prose.`,
      }],
    })

    const narrative = message.content[0].type === 'text' ? message.content[0].text : ''

    return new Response(JSON.stringify({ narrative }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
