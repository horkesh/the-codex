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

    // Step 1: Analyze the photo with Gemini Vision to extract appearance
    const analysisResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${googleApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              {
                text: `Describe this person's appearance in precise detail for a portrait artist.
Include: face shape, hair (color, length, style), eye color, skin tone, beard/facial hair if any,
distinctive features, approximate age. Be specific. Return only the description, no commentary.`,
              },
              {
                inline_data: { mime_type: 'image/jpeg', data: photo_base64 },
              },
            ],
          }],
          generationConfig: { maxOutputTokens: 256 },
        }),
      }
    )

    if (!analysisResponse.ok) {
      throw new Error(`Gemini analysis error: ${analysisResponse.status} ${await analysisResponse.text()}`)
    }

    const analysisData = await analysisResponse.json()
    const appearance = analysisData.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
    if (!appearance) throw new Error('Could not extract appearance from photo')

    // Save appearance to gents table for future scene generation
    const { createClient: createEarly } = await import('npm:@supabase/supabase-js@2')
    await createEarly(supabaseUrl, supabaseServiceKey)
      .from('gents')
      .update({ appearance_description: appearance })
      .eq('id', gent_id)

    // Step 2: Generate portrait with Imagen using extracted appearance
    const imagePrompt = `Portrait of a gentleman: ${appearance}.
Style: vintage gentleman's society membership card, dark obsidian background (#0D0D0D),
gold filigree border, oil painting technique, dramatic Rembrandt lighting, dignified and distinguished.
The subject's face must be clearly recognisable and true to the description. Square format.`

    const imageResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${googleApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instances: [{ prompt: imagePrompt }],
          parameters: { sampleCount: 1, aspectRatio: '1:1', safetyFilterLevel: 'block_only_high' },
        }),
      }
    )

    if (!imageResponse.ok) {
      throw new Error(`Imagen API error: ${imageResponse.status} ${await imageResponse.text()}`)
    }

    const imageResult = await imageResponse.json()
    const base64Image = imageResult.predictions?.[0]?.bytesBase64Encoded
    if (!base64Image) throw new Error('No image returned from Imagen API')

    // Step 3: Upload to Supabase Storage
    const imageBytes = Uint8Array.from(atob(base64Image), (c) => c.charCodeAt(0))
    const fileName = `${gent_id}/portrait-${Date.now()}.webp`

    const { createClient } = await import('npm:@supabase/supabase-js@2')
    const storageClient = createClient(supabaseUrl, supabaseServiceKey)

    const { error: uploadError } = await storageClient.storage
      .from('portraits')
      .upload(fileName, imageBytes, { contentType: 'image/webp', upsert: true })

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
