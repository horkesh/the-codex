const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { gent_id, photo_base64, display_name } = await req.json()
    const googleApiKey = Deno.env.get('GOOGLE_AI_API_KEY')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    if (!googleApiKey) throw new Error('GOOGLE_AI_API_KEY not set')
    if (!gent_id || !photo_base64) throw new Error('Missing gent_id or photo_base64')

    // Step 1: Analyze the photo with Gemini Vision to extract appearance + traits
    const analysisResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${googleApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              {
                text: `Analyze this person's photo. Return a JSON object with two fields:
1. "appearance": a detailed visual description of their face, hair (color, length, style), eye color, skin tone, beard/facial hair if any, distinctive features, approximate age. Be specific and precise.
2. "traits": an array of 3 personality/vibe traits inferred from their look (e.g. "sharp", "laid-back", "intense").
Output PURE JSON only, no markdown.`,
              },
              {
                inline_data: { mime_type: 'image/jpeg', data: photo_base64 },
              },
            ],
          }],
          generationConfig: {
            responseMimeType: 'application/json',
            maxOutputTokens: 512,
          },
        }),
      }
    )

    if (!analysisResponse.ok) {
      throw new Error(`Gemini analysis error: ${analysisResponse.status} ${await analysisResponse.text()}`)
    }

    const analysisData = await analysisResponse.json()
    const rawText = analysisData.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
    if (!rawText) throw new Error('Could not extract appearance from photo')

    let appearance = rawText
    let traits: string[] = []
    try {
      const parsed = JSON.parse(rawText)
      appearance = parsed.appearance ?? rawText
      traits = parsed.traits ?? []
    } catch {
      // fallback: use raw text as appearance
    }

    // Save appearance to gents table for future scene generation
    const { createClient: createEarly } = await import('npm:@supabase/supabase-js@2')
    await createEarly(supabaseUrl, supabaseServiceKey)
      .from('gents')
      .update({ appearance_description: appearance })
      .eq('id', gent_id)

    // Step 2: Generate portrait with Gemini native image generation (gemini-2.5-flash-image)
    const traitList = traits.length > 0 ? traits.join(', ') : 'distinguished, sharp, sophisticated'
    const imagePrompt = `Abstract cinematic portrait avatar of a gentleman: ${appearance}. Personality: ${traitList}. Style: minimalist geometric forms, cinematic noir lighting, moody desaturated colour palette with deep obsidian blacks and subtle gold accents, high-end digital art, dramatic shadows and highlights, sophisticated composition. No text, no words, no watermarks. Square format.`

    const imageResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${googleApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: imagePrompt }] }],
          generationConfig: {
            responseModalities: ['TEXT', 'IMAGE'],
          },
        }),
      }
    )

    if (!imageResponse.ok) {
      throw new Error(`Gemini image generation error: ${imageResponse.status} ${await imageResponse.text()}`)
    }

    const imageResult = await imageResponse.json()
    const parts = imageResult.candidates?.[0]?.content?.parts ?? []
    let base64Image: string | null = null
    let mimeType = 'image/png'
    for (const part of parts) {
      if (part.inlineData?.data) {
        base64Image = part.inlineData.data
        mimeType = part.inlineData.mimeType ?? 'image/png'
        break
      }
    }
    if (!base64Image) throw new Error('No image returned from Gemini image generation')

    // Step 3: Upload to Supabase Storage
    const ext = mimeType.split('/')[1] ?? 'png'
    const imageBytes = Uint8Array.from(atob(base64Image), (c) => c.charCodeAt(0))
    const fileName = `${gent_id}/portrait-${Date.now()}.${ext}`

    const { createClient } = await import('npm:@supabase/supabase-js@2')
    const storageClient = createClient(supabaseUrl, supabaseServiceKey)

    const { error: uploadError } = await storageClient.storage
      .from('portraits')
      .upload(fileName, imageBytes, { contentType: mimeType, upsert: true })

    if (uploadError) throw new Error(`Storage upload error: ${uploadError.message}`)

    const { data: { publicUrl } } = storageClient.storage.from('portraits').getPublicUrl(fileName)

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
