const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { photo_base64, mime_type = 'image/jpeg' } = await req.json()
    const googleApiKey = Deno.env.get('GOOGLE_AI_API_KEY')

    if (!googleApiKey) throw new Error('GOOGLE_AI_API_KEY not set')
    if (!photo_base64) throw new Error('photo_base64 required')

    const prompt = `You are a sharp social intelligence analyst for a private gentlemen's collective.
Analyze this photo of a person. First perform eligibility checks:
- Is there exactly one clearly visible adult human face?
- Is the content appropriate (no explicit/adult content, no minors, no uncertain age)?

If any eligibility check fails, return JSON with only: {"eligible": false, "rejection_reason": "brief reason"}

If eligible, return JSON with exactly these fields:
{
  "eligible": true,
  "appearance": "detailed visual description: skin tone, hair colour and style, eye colour, facial structure, any facial hair, approximate age range, style and fashion sense, overall vibe",
  "trait_words": ["trait1","trait2","trait3","trait4","trait5","trait6"],
  "score": <number 0.0–10.0 to one decimal place>,
  "verdict_label": <"Immediate Interest" | "Circle Material" | "On the Radar" | "Observe Further">,
  "confidence": <number 0.00–1.00>,
  "vibe": "one sentence vibe read",
  "style_read": "one sentence style and fashion observation",
  "why_interesting": "two to three sentences on what makes this person worth noting",
  "best_opener": "a single natural confident opening line for meeting this person",
  "green_flags": ["up to 3 positive signals observed"],
  "watchouts": ["up to 2 caution notes — be diplomatic"]
}

Score rubric:
9.0–10.0 → "Immediate Interest"
8.0–8.9  → "Circle Material"
6.5–7.9  → "On the Radar"
0.0–6.4  → "Observe Further"

Output PURE JSON only. No markdown, no explanation.`

    const analysisResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${googleApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              { inline_data: { mime_type, data: photo_base64 } },
            ],
          }],
          generationConfig: {
            responseMimeType: 'application/json',
            maxOutputTokens: 1000,
          },
        }),
      }
    )

    if (!analysisResponse.ok) {
      throw new Error(`Gemini API error: ${analysisResponse.status} ${await analysisResponse.text()}`)
    }

    const analysisResult = await analysisResponse.json()
    const rawText = analysisResult.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? ''
    const parsed = JSON.parse(rawText)

    if (!parsed.eligible) {
      return new Response(
        JSON.stringify({ eligible: false, rejection_reason: parsed.rejection_reason ?? 'Image not eligible' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('scan-person-verdict error:', error)
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
