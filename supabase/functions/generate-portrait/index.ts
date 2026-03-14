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
    if (!gent_id || !photo_base64) throw new Error('Missing gent_id or photo_base64')

    // Step 1: Extract detailed appearance description
    const analysisResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${googleApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              {
                text: `Describe this person's appearance in precise detail. Include: approximate age, skin tone, face shape, eye colour, hair colour and style, and ALL facial hair in exact detail (e.g. "thick dark moustache", "short beard", "clean-shaven" — whatever applies). Also note any other distinctive features. One paragraph, no commentary.`,
              },
              { inline_data: { mime_type: 'image/jpeg', data: photo_base64 } },
            ],
          }],
          generationConfig: { maxOutputTokens: 300 },
        }),
      }
    )

    if (!analysisResponse.ok) {
      throw new Error(`Gemini analysis error: ${analysisResponse.status} ${await analysisResponse.text()}`)
    }

    const analysisData = await analysisResponse.json()
    const appearance = analysisData.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? ''

    // Save appearance for future scene generation
    const { createClient: createEarly } = await import('npm:@supabase/supabase-js@2')
    await createEarly(supabaseUrl, supabaseServiceKey)
      .from('gents')
      .update({ appearance_description: appearance })
      .eq('id', gent_id)

    // Step 2: img2img — photo + appearance description reinforces features, style transforms the look
    const imagePrompt = `Paint a cinematic digital portrait of the person in this photo. Subject: ${appearance}. Render their face and all features faithfully — do not omit or alter facial hair, hair style, or distinctive features. Style: dramatic Rembrandt lighting, dark obsidian background, warm gold rim light on the edges, rich shadows, high-end digital painting — photorealistic enough to be recognisable, not abstract. No text, no watermarks. Square format.`

    const imageResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${googleApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: imagePrompt },
              { inline_data: { mime_type: 'image/jpeg', data: photo_base64 } },
            ],
          }],
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
    if (!base64Image) throw new Error('No image returned from Gemini')

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
