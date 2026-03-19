const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const STYLE_VARIANTS = [
  {
    label: 'chiaroscuro',
    style: 'Deep chiaroscuro lighting inspired by Caravaggio — intense directional light carving the face from near-total darkness, dramatic shadow play, rich warm undertones in the highlights, oil-painting texture with visible brushwork energy.',
  },
  {
    label: 'gilded',
    style: 'Gilded art-deco aesthetic — warm amber and burnished gold tones, geometric patterns framing the subject, ornamental symmetry, gatsby-era opulence, soft diffused lighting with a luxurious golden hour glow.',
  },
  {
    label: 'noir',
    style: 'Minimalist geometric noir — abstract angular forms, cinematic noir lighting with dramatic shadows and highlights, moody desaturated palette with deep blacks and subtle warm accents, sophisticated high-end digital art composition, preserving the subject\'s actual skin tone, hair colour, and facial features.',
  },
]

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
      const analysisTimeout = setTimeout(() => analysisController.abort(), 55_000)
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
        console.error('Photo analysis failed, falling back to stored appearance:', e)
        // Fall through — try stored appearance below instead of dying
      }

      // Save appearance for future use (scene generation, re-generation without photo)
      if (appearance) {
        await db.from('gents').update({ appearance_description: appearance }).eq('id', gent_id)
      }
    }

    // If we still have no appearance (analysis failed or no photo), try stored/canonical descriptions
    if (!appearance) {
      // Step 1b: No photo — use stored appearance_description from DB
      const { data: gentRow } = await db
        .from('gents')
        .select('appearance_description, alias, display_name')
        .eq('id', gent_id)
        .single()

      if (gentRow?.appearance_description) {
        appearance = gentRow.appearance_description
      } else {
        // Fall back to canonical gent identity descriptions
        // GENT_APPEARANCES keys are first names, DB has aliases — need mapping
        const { GENT_APPEARANCES } = await import('../_shared/gent-identities.ts')
        const ALIAS_TO_NAME: Record<string, string> = {
          lorekeeper: 'haris',
          keys: 'almedin',
          bass: 'vedad',
        }
        const gentName = ALIAS_TO_NAME[gentRow?.alias || '']
          || (gentRow?.display_name || '').toLowerCase()
        appearance = GENT_APPEARANCES[gentName] ?? ''
      }
    }

    if (!appearance) {
      throw new Error('No appearance description available. Upload a photo first to generate an initial portrait.')
    }

    // Step 2: Generate 3 portrait variants in parallel with different artistic styles
    const traitList = traits.join(', ')
    const timestamp = Date.now()

    const variantPromises = STYLE_VARIANTS.map(async (variant, idx) => {
      const imagePrompt = `Abstract artistic portrait avatar of a real person. Subject: ${appearance}. Personality: ${traitList}. Style: ${variant.style} — while faithfully preserving the subject's exact skin tone, hair colour, facial structure, and distinguishing features. The person must be clearly recognisable. No text or words.`

      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 55_000)
      try {
        const response = await fetch(
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

        if (!response.ok) {
          throw new Error(`Image generation error (${variant.label}): ${response.status} ${await response.text()}`)
        }

        const result = await response.json()
        const base64Image: string | null = result.predictions?.[0]?.bytesBase64Encoded ?? null
        if (!base64Image) throw new Error(`No image returned for variant ${variant.label}`)

        // Upload to storage
        const imageBytes = Uint8Array.from(atob(base64Image), (c) => c.charCodeAt(0))
        const fileName = `${gent_id}/portrait-${variant.label}-${timestamp}-${idx}.webp`

        const { error: uploadError } = await db.storage
          .from('portraits')
          .upload(fileName, imageBytes, { contentType: 'image/webp', upsert: true })

        if (uploadError) throw new Error(`Storage upload error: ${uploadError.message}`)

        const { data: { publicUrl } } = db.storage.from('portraits').getPublicUrl(fileName)
        return { url: publicUrl, label: variant.label }
      } catch (e) {
        clearTimeout(timeout)
        throw e
      }
    })

    const results = await Promise.allSettled(variantPromises)
    const portraits = results
      .filter((r): r is PromiseFulfilledResult<{ url: string; label: string }> => r.status === 'fulfilled')
      .map((r) => r.value)

    const failures = results.filter((r) => r.status === 'rejected')
    if (failures.length > 0) {
      console.error('Some portrait variants failed:', failures.map((r) => (r as PromiseRejectedResult).reason))
    }

    if (portraits.length === 0) {
      throw new Error('All portrait variants failed to generate. Try again.')
    }

    // Update portrait_url to the first successful variant as default
    await db.from('gents').update({ portrait_url: portraits[0].url }).eq('id', gent_id)

    return new Response(JSON.stringify({
      portrait_urls: portraits.map((p) => p.url),
      portrait_labels: portraits.map((p) => p.label),
      appearance,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('generate-portrait error:', error)
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
