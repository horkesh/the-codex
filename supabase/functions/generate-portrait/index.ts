const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { gent_id, photo_base64 } = await req.json()
    const googleApiKey = Deno.env.get('GOOGLE_AI_API_KEY')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    if (!googleApiKey) throw new Error('GOOGLE_AI_API_KEY not set')
    if (!gent_id) throw new Error('Missing gent_id')

    const { createClient } = await import('npm:@supabase/supabase-js@2')
    const db = createClient(supabaseUrl, supabaseServiceKey)

    let appearance = ''
    let traits = ['mysterious', 'enigmatic', 'distinguished', 'confident', 'refined', 'intense']

    if (photo_base64) {
      // Step 1a: Analyse photo with Gemini
      const analysisController = new AbortController()
      const analysisTimeout = setTimeout(() => analysisController.abort(), 20_000)
      try {
        const analysisResponse = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${googleApiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: analysisController.signal,
            body: JSON.stringify({
              contents: [{
                parts: [
                  {
                    text: `Analyze this user photo. Return a JSON object with exactly two fields:
"appearance": a detailed visual description including skin tone, hair colour and style, eye colour, facial structure, any facial hair, approximate age, and overall style/vibe.
"traits": an array of exactly 6 personality trait words guessed from the photo.
Output PURE JSON only, no markdown, no explanation.`,
                  },
                  { inline_data: { mime_type: 'image/webp', data: photo_base64 } },
                ],
              }],
              generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 500 },
            }),
          }
        )
        clearTimeout(analysisTimeout)

        if (!analysisResponse.ok) {
          throw new Error(`Analysis error: ${analysisResponse.status} ${await analysisResponse.text()}`)
        }

        const analysisResult = await analysisResponse.json()
        const rawText = analysisResult.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? ''

        try {
          const parsed = JSON.parse(rawText)
          if (parsed.appearance) appearance = parsed.appearance
          if (Array.isArray(parsed.traits) && parsed.traits.length > 0) traits = parsed.traits
        } catch { /* use defaults below */ }
      } catch (e) {
        clearTimeout(analysisTimeout)
        throw e
      }

      // Save appearance for future use (scene generation, re-generation without photo)
      if (appearance) {
        await db.from('gents').update({ appearance_description: appearance }).eq('id', gent_id)
      }
    } else {
      // Step 1b: No photo — use stored appearance_description from DB
      const { data: gentRow } = await db
        .from('gents')
        .select('appearance_description, alias')
        .eq('id', gent_id)
        .single()

      if (gentRow?.appearance_description) {
        appearance = gentRow.appearance_description
      } else if (gentRow?.alias) {
        // Fall back to canonical gent identity descriptions
        const { GENT_APPEARANCES } = await import('../_shared/gent-identities.ts')
        appearance = GENT_APPEARANCES[gentRow.alias] ?? ''
      }
    }

    if (!appearance) {
      throw new Error('No appearance description available. Upload a photo first to generate an initial portrait.')
    }

    // Step 2: Generate portrait with Imagen
    const traitList = traits.join(', ')
    const imagePrompt = `Abstract artistic portrait avatar of a real person. Subject: ${appearance}. Personality: ${traitList}. Style: Minimalist geometric forms, cinematic noir lighting, moody desaturated color palette, high-end digital art, dramatic shadows and highlights, sophisticated composition — while faithfully preserving the subject's exact skin tone, hair colour, facial structure, and distinguishing features. The person must be clearly recognisable. No text or words.`

    const imageController = new AbortController()
    const imageTimeout = setTimeout(() => imageController.abort(), 20_000)
    let imageResult
    try {
      const imageResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${googleApiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: imageController.signal,
          body: JSON.stringify({
            instances: [{ prompt: imagePrompt }],
            parameters: { sampleCount: 1, aspectRatio: '1:1', safetyFilterLevel: 'block_only_high' },
          }),
        }
      )
      clearTimeout(imageTimeout)

      if (!imageResponse.ok) {
        throw new Error(`Image generation error: ${imageResponse.status} ${await imageResponse.text()}`)
      }
      imageResult = await imageResponse.json()
    } catch (e) {
      clearTimeout(imageTimeout)
      throw e
    }

    const base64Image: string | null = imageResult.predictions?.[0]?.bytesBase64Encoded ?? null
    if (!base64Image) throw new Error('No image returned from Imagen')

    // Step 3: Upload to Supabase Storage
    const imageBytes = Uint8Array.from(atob(base64Image), (c) => c.charCodeAt(0))
    const fileName = `${gent_id}/portrait-${Date.now()}.webp`

    const { error: uploadError } = await db.storage
      .from('portraits')
      .upload(fileName, imageBytes, { contentType: 'image/webp', upsert: true })

    if (uploadError) throw new Error(`Storage upload error: ${uploadError.message}`)

    const { data: { publicUrl } } = db.storage.from('portraits').getPublicUrl(fileName)

    // Update portrait_url in the database
    await db.from('gents').update({ portrait_url: publicUrl }).eq('id', gent_id)

    return new Response(JSON.stringify({ portrait_url: publicUrl, appearance }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('generate-portrait error:', error)
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
