const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const STYLE_VARIANTS: Record<string, string> = {
  noir: "Minimalist geometric noir — abstract angular forms, cinematic noir lighting with dramatic shadows and highlights, moody desaturated palette with deep blacks and subtle warm accents, sophisticated high-end digital art composition",
  chiaroscuro: "Deep chiaroscuro lighting inspired by Caravaggio — intense directional light carving the face from near-total darkness, dramatic shadow play, rich warm undertones in the highlights, oil-painting texture with visible brushwork energy",
  gilded: "Gilded art-deco aesthetic — warm amber and burnished gold tones, geometric patterns framing the subject, ornamental symmetry, gatsby-era opulence, soft diffused lighting with a luxurious golden hour glow",
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { appearance, traits, scan_id, director_note, style, photo_base64 } = await req.json()
    const googleApiKey = Deno.env.get('GOOGLE_AI_API_KEY')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    if (!googleApiKey) throw new Error('GOOGLE_AI_API_KEY not set')
    if (!appearance || !traits || !scan_id) throw new Error('appearance, traits, and scan_id required')

    // If a reference photo is provided, analyse it with Gemini for additional appearance details
    let photoAppearance = ''
    if (photo_base64) {
      const ctrl = new AbortController()
      const t = setTimeout(() => ctrl.abort(), 20_000)
      try {
        const resp = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${googleApiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: ctrl.signal,
            body: JSON.stringify({
              contents: [{
                parts: [
                  {
                    text: `Analyze this photo of a person. You have a previous description of this person from an earlier analysis:
"${appearance}"

Study the photo carefully and produce a REFINED description that:
- Corrects anything the previous description got wrong (especially ethnicity, skin tone, hair)
- Adds new details visible in this photo that were missing before
- Keeps accurate details from the previous description

Return a JSON object with one field:
"appearance": a concise visual description focusing on skin tone, ethnicity, hair colour/style, eye colour, facial structure, facial hair, approximate age, build, and distinctive features.
Output PURE JSON only, no markdown.`,
                  },
                  { inline_data: { mime_type: 'image/jpeg', data: photo_base64 } },
                ],
              }],
              generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 300 },
            }),
          }
        )
        clearTimeout(t)
        if (resp.ok) {
          const result = await resp.json()
          const raw = result.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? ''
          try {
            const parsed = JSON.parse(raw)
            if (parsed.appearance) photoAppearance = parsed.appearance
          } catch { /* ignore parse errors */ }
        }
      } catch {
        clearTimeout(t)
        console.error('Photo analysis failed, proceeding with text-only description')
      }
    }

    const traitList = (traits as string[]).join(', ')
    const styleDesc = STYLE_VARIANTS[style as string] ?? STYLE_VARIANTS.noir

    // When a new photo is provided, its analysis is the PRIMARY appearance source.
    // The old scan description becomes fallback context only.
    let fullAppearance: string
    if (photoAppearance) {
      fullAppearance = photoAppearance
    } else {
      fullAppearance = appearance
    }
    const directorClause = director_note
      ? ` Additional notes (these corrections take priority where they contradict the description above): ${director_note}.`
      : ''

    const imagePrompt = `Abstract artistic portrait avatar of a real person. Subject: ${fullAppearance}.${directorClause} Personality: ${traitList}. Style: ${styleDesc} — while preserving the subject's actual skin tone, hair colour, and facial features. No text or words.`

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 25_000)
    let imageResult
    try {
      const imageResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${googleApiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            instances: [{ prompt: imagePrompt }],
            parameters: { sampleCount: 1, aspectRatio: '1:1', safetyFilterLevel: 'block_only_high' },
          }),
        }
      )
      clearTimeout(timeout)

      if (!imageResponse.ok) {
        throw new Error(`Image generation error: ${imageResponse.status} ${await imageResponse.text()}`)
      }
      imageResult = await imageResponse.json()
    } catch (e) {
      clearTimeout(timeout)
      throw e
    }
    const base64Image: string | null = imageResult.predictions?.[0]?.bytesBase64Encoded ?? null
    if (!base64Image) throw new Error('No image returned from Imagen')

    const { createClient } = await import('npm:@supabase/supabase-js@2')
    const db = createClient(supabaseUrl, supabaseServiceKey)

    const imageBytes = Uint8Array.from(atob(base64Image), (c) => c.charCodeAt(0))
    const fileName = `scans/${scan_id}/portrait-${Date.now()}.webp`

    const { error: uploadError } = await db.storage
      .from('portraits')
      .upload(fileName, imageBytes, { contentType: 'image/webp', upsert: true })

    if (uploadError) throw new Error(`Storage upload error: ${uploadError.message}`)

    const { data: { publicUrl } } = db.storage.from('portraits').getPublicUrl(fileName)

    // If we got a fresh appearance from the new photo, persist it to the scan
    // so future regenerations (without photo) use the updated description
    if (photoAppearance && scan_id) {
      await db.from('person_scans').update({ appearance_description: photoAppearance }).eq('id', scan_id).catch(() => {})
    }

    return new Response(JSON.stringify({ portrait_url: publicUrl }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('generate-person-portrait error:', error)
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
