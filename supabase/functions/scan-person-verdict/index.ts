const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ── Shared Gemini call ──────────────────────────────────────────────────────

async function callGemini(photo_base64: string, mime_type: string, prompt: string): Promise<unknown> {
  const apiKey = Deno.env.get('GOOGLE_AI_API_KEY')
  if (!apiKey) throw new Error('GOOGLE_AI_API_KEY not set')

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
          generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 4096 },
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
  const parts: Array<{ text?: string }> = result.candidates?.[0]?.content?.parts ?? []
  const rawText = parts.find((p) => p.text)?.text ?? '{}'
  console.log('Gemini raw:', rawText.slice(0, 200))
  return JSON.parse(rawText)
}

// ── Prompts ─────────────────────────────────────────────────────────────────

const BASE_FIELDS = `{
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
}`

const SCORE_RUBRIC = `
Score rubric:
9.0-10.0 → "Immediate Interest"
8.0-8.9  → "Circle Material"
6.5-7.9  → "On the Radar"
0.0-6.4  → "Observe Further"`

const PHOTO_PROMPT = `You are a sharp social intelligence analyst for a private gentlemen's collective.
Analyze this photo of a person. First perform eligibility checks:
- Is there exactly one clearly visible adult human face?
- Is the content appropriate (no explicit/adult content, no minors, no uncertain age)?

If any eligibility check fails, return JSON with only: {"eligible": false, "rejection_reason": "brief reason"}

If eligible, return JSON with exactly these fields:
${BASE_FIELDS}
${SCORE_RUBRIC}`

const INSTAGRAM_PROMPT = `You are a sharp social intelligence analyst for a private gentlemen's collective.
Analyze this Instagram screenshot. It may be a profile page, a post, a story, or a photo from a conversation.

Focus on the MAIN VISIBLE PERSON in the image — whether that's a full photo in a post/story, or a profile picture thumbnail. Score based on the best available image of the person, not penalizing for Instagram UI chrome around it.

If this is a profile page, also extract:
- "display_name": the profile display name shown (or null if not visible)
- "instagram_handle": the @username shown, without the @ symbol (or null if not visible)
- Use bio text, follower/following counts, and post count to enrich your trait_words, vibe, and why_interesting.

First perform eligibility checks:
- Is there at least one clearly visible adult human face (in post photo, story, or profile pic)?
- Is the content appropriate (no explicit/adult content, no minors, no uncertain age)?

If any eligibility check fails, return JSON with only: {"eligible": false, "rejection_reason": "brief reason"}

If eligible, return JSON with exactly these fields:
${BASE_FIELDS.slice(0, -1)},
  "display_name": "extracted profile display name or null",
  "instagram_handle": "extracted @username without the @ symbol, or null"
}
${SCORE_RUBRIC}

If this is NOT a profile page (e.g. a post, story, or DM photo), set display_name and instagram_handle to null and focus entirely on the person visible in the image.`

// ── Handler ──────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { photo_base64, mime_type = 'image/webp', source_type = 'photo' } = await req.json()
    if (!photo_base64) throw new Error('photo_base64 required')

    const prompt = source_type === 'instagram_screenshot' ? INSTAGRAM_PROMPT : PHOTO_PROMPT
    const parsed = await callGemini(photo_base64, mime_type, prompt)

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
