const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ── Gemini path — used for source_type 'photo' ──────────────────────────────

async function scanWithGemini(photo_base64: string, mime_type: string): Promise<unknown> {
  const apiKey = Deno.env.get('GOOGLE_AI_API_KEY')
  if (!apiKey) throw new Error('GOOGLE_AI_API_KEY not set')

  const prompt = `You are a sharp social intelligence analyst for a private gentlemen's collective.
Analyze this photo of a person. First perform eligibility checks:
- Is there exactly one clearly visible adult human face?
- Is the content appropriate (no explicit/adult content, no minors, no uncertain age)?

If any eligibility check fails, return JSON with only: {"eligible": false, "rejection_reason": "brief reason"}

If eligible, return JSON with exactly these fields:
{
  "eligible": true,
  "appearance": "precise physical description structured as: [gender] in [age range]. [Skin tone]. [Hair: colour, length, style]. [Eyes: colour, shape]. [Facial structure and any facial hair]. [Build if visible]. [Clothing style and colours].",
  "trait_words": ["trait1","trait2","trait3","trait4","trait5","trait6"],
  "score": <number 0.0-10.0 to one decimal place>,
  "verdict_label": <"Immediate Interest" | "Circle Material" | "On the Radar" | "Observe Further">,
  "confidence": <number 0.00-1.00>,
  "vibe": "one sentence vibe read",
  "style_read": "one sentence style and fashion observation",
  "why_interesting": "two to three sentences on what makes this person worth noting",
  "best_opener": "a single natural confident opening line for meeting this person",
  "green_flags": ["up to 3 positive signals observed"],
  "watchouts": ["up to 2 caution notes — be diplomatic"]
}

Score rubric:
9.0-10.0 → "Immediate Interest"
8.0-8.9  → "Circle Material"
6.5-7.9  → "On the Radar"
0.0-6.4  → "Observe Further"`

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 20_000)

  let responseText: string
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [
            { inline_data: { mime_type, data: photo_base64 } },
            { text: prompt },
          ]}],
          generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 1024 },
        }),
      }
    )
    responseText = await response.text()
    if (!response.ok) throw new Error(`Gemini API error: ${response.status} — ${responseText.slice(0, 300)}`)
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw new Error('Gemini request timed out after 20s')
    throw e
  } finally {
    clearTimeout(timeout)
  }

  const result = JSON.parse(responseText)
  const rawText = result.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}'
  console.log('Gemini raw:', rawText.slice(0, 200))
  return JSON.parse(rawText)
}

// ── Claude path — used for source_type 'instagram_screenshot' ───────────────

async function scanWithClaude(photo_base64: string, mime_type: string): Promise<unknown> {
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set')

  const prompt = `You are a sharp social intelligence analyst for a private gentlemen's collective.
Analyze this Instagram profile screenshot of a person. First perform eligibility checks:
- Is there exactly one clearly visible adult human face?
- Is the content appropriate (no explicit/adult content, no minors, no uncertain age)?

If any eligibility check fails, return JSON with only: {"eligible": false, "rejection_reason": "brief reason"}

If eligible, return JSON with exactly these fields:
{
  "eligible": true,
  "appearance": "precise physical description structured as: [gender] in [age range]. [Skin tone]. [Hair: colour, length, style]. [Eyes: colour, shape]. [Facial structure and any facial hair]. [Build if visible]. [Clothing style and colours].",
  "trait_words": ["trait1","trait2","trait3","trait4","trait5","trait6"],
  "score": <number 0.0-10.0 to one decimal place>,
  "verdict_label": <"Immediate Interest" | "Circle Material" | "On the Radar" | "Observe Further">,
  "confidence": <number 0.00-1.00>,
  "vibe": "one sentence vibe read",
  "style_read": "one sentence style and fashion observation",
  "why_interesting": "two to three sentences on what makes this person worth noting",
  "best_opener": "a single natural confident opening line for meeting this person",
  "green_flags": ["up to 3 positive signals observed"],
  "watchouts": ["up to 2 caution notes — be diplomatic"],
  "display_name": "extracted profile display name or null",
  "instagram_handle": "extracted @username without the @ symbol, or null"
}

Score rubric:
9.0-10.0 → "Immediate Interest"
8.0-8.9  → "Circle Material"
6.5-7.9  → "On the Radar"
0.0-6.4  → "Observe Further"

Also extract from the visible text in the screenshot:
- "display_name": the profile display name shown (or null if not visible)
- "instagram_handle": the @username shown, without the @ symbol (or null if not visible)
Output PURE JSON only. No markdown, no explanation.`

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mime_type, data: photo_base64 } },
          { type: 'text', text: prompt },
        ],
      }],
    }),
  })

  if (!response.ok) throw new Error(`Claude API error: ${response.status} ${await response.text()}`)

  const result = await response.json()
  const rawText = result.content?.[0]?.text?.trim() ?? '{}'
  const jsonText = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
  return JSON.parse(jsonText)
}

// ── Handler ──────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { photo_base64, mime_type = 'image/jpeg', source_type = 'photo' } = await req.json()
    if (!photo_base64) throw new Error('photo_base64 required')

    const parsed = source_type === 'photo'
      ? await scanWithGemini(photo_base64, mime_type)
      : await scanWithClaude(photo_base64, mime_type)

    const p = parsed as Record<string, unknown>

    if (!p.eligible) {
      return new Response(
        JSON.stringify({ eligible: false, rejection_reason: p.rejection_reason ?? 'Image not eligible' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(JSON.stringify(parsed), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('scan-person-verdict error:', msg)
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
