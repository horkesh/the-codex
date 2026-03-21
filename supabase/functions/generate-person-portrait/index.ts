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
    const { appearance, traits, scan_id, director_note, style, photo_base64, fresh_analysis } = await req.json()
    const googleApiKey = Deno.env.get('GOOGLE_AI_API_KEY')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    if (!googleApiKey) throw new Error('GOOGLE_AI_API_KEY not set')
    if (!traits || !scan_id) throw new Error('traits and scan_id required')
    if (!appearance && !photo_base64) throw new Error('appearance or photo_base64 required')

    // If a reference photo is provided, analyse it with Gemini for appearance details
    let photoAppearance = ''
    let analysisDebug = ''
    if (photo_base64) {
      console.log(`[portrait] Photo provided, ${photo_base64.length} chars base64. fresh=${fresh_analysis}, appearance empty=${!appearance}`)
      const ctrl = new AbortController()
      const t = setTimeout(() => ctrl.abort(), 30_000)
      try {
        const analysisPrompt = (fresh_analysis || !appearance)
          ? `Analyze this photo of a person from scratch. Ignore any prior descriptions — describe ONLY what you see in the photo.

Return a JSON object with one field:
"appearance": a concise visual description focusing on skin tone, ethnicity, hair colour/style, eye colour, facial structure, facial hair, approximate age, build, and distinctive features.
Output PURE JSON only, no markdown.`
          : `Analyze this photo of a person. A previous analysis described them as:
"${appearance}"

The previous description may contain errors. The PHOTO is ground truth — trust what you see over what the text says.
Produce a refined description that:
- Corrects anything the previous description got wrong (especially ethnicity, skin tone, hair)
- Adds new details visible in this photo that were missing before
- Keeps accurate details from the previous description that match the photo

Return a JSON object with one field:
"appearance": a concise visual description focusing on skin tone, ethnicity, hair colour/style, eye colour, facial structure, facial hair, approximate age, build, and distinctive features.
Output PURE JSON only, no markdown.`

        const resp = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${googleApiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: ctrl.signal,
            body: JSON.stringify({
              contents: [{ parts: [
                { text: analysisPrompt },
                { inline_data: { mime_type: 'image/jpeg', data: photo_base64 } },
              ] }],
              generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 1024 },
            }),
          }
        )
        clearTimeout(t)
        console.log(`[portrait] Gemini response status: ${resp.status}`)

        if (resp.ok) {
          const result = await resp.json()
          let raw = result.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? ''
          console.log(`[portrait] Gemini raw response: ${raw.slice(0, 200)}`)
          // Gemini sometimes wraps JSON in prose or markdown — extract the JSON object
          const jsonMatch = raw.match(/\{[\s\S]*\}/)
          if (jsonMatch) raw = jsonMatch[0]
          try {
            const parsed = JSON.parse(raw)
            if (parsed.appearance) {
              photoAppearance = parsed.appearance
              analysisDebug = 'success'
              console.log(`[portrait] Photo analysis success: ${photoAppearance.slice(0, 100)}`)
            } else {
              analysisDebug = `parsed but no appearance field: ${JSON.stringify(Object.keys(parsed))}`
              console.error(`[portrait] ${analysisDebug}`)
            }
          } catch (parseErr) {
            analysisDebug = `JSON parse failed: ${(parseErr as Error).message}. Raw: ${raw.slice(0, 100)}`
            console.error(`[portrait] ${analysisDebug}`)
          }
        } else {
          const errText = await resp.text()
          analysisDebug = `Gemini ${resp.status}: ${errText.slice(0, 200)}`
          console.error(`[portrait] ${analysisDebug}`)
        }
      } catch (e) {
        clearTimeout(t)
        analysisDebug = `fetch error: ${(e as Error).message}`
        console.error(`[portrait] Photo analysis failed: ${(e as Error).message}`)
      }
    }

    const traitList = (traits as string[]).join(', ')
    const styleDesc = STYLE_VARIANTS[style as string] ?? STYLE_VARIANTS.noir

    // When a new photo is provided, its analysis is the PRIMARY appearance source.
    let baseAppearance = photoAppearance || appearance

    // Director's note goes FIRST in the subject — Imagen weighs early tokens more.
    // This ensures corrections like "NOT Asian" override conflicting details.
    let subjectDesc: string
    if (director_note) {
      subjectDesc = `${director_note}. ${baseAppearance}`
    } else {
      subjectDesc = baseAppearance
    }

    const imagePrompt = `Abstract artistic portrait avatar of a real person. Subject: ${subjectDesc}. Personality: ${traitList}. Style: ${styleDesc} — while faithfully preserving the described skin tone, ethnicity, hair colour, and facial features. No text or words.`

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

    console.log(`[portrait] Done. photoAppearance=${photoAppearance ? 'set' : 'empty'}, fullAppearance=${fullAppearance.slice(0, 60)}`)
    return new Response(JSON.stringify({ portrait_url: publicUrl, updated_appearance: photoAppearance || null, analysis_debug: analysisDebug || null }), {
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
