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

    // Step 1: Analyse photo — Tonight's exact approach
    const analysisResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${googleApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              {
                text: `Analyze this user photo. Return a JSON object with exactly two fields:
"appearance": a detailed visual description including skin tone, hair colour and style, eye colour, facial structure, any facial hair, approximate age, and overall style/vibe.
"traits": an array of exactly 6 personality trait words guessed from the photo.
Output PURE JSON only, no markdown, no explanation.`,
              },
              { inline_data: { mime_type: 'image/jpeg', data: photo_base64 } },
            ],
          }],
          generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 500 },
        }),
      }
    )

    if (!analysisResponse.ok) {
      throw new Error(`Analysis error: ${analysisResponse.status} ${await analysisResponse.text()}`)
    }

    const analysisResult = await analysisResponse.json()
    const rawText = analysisResult.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? ''

    let appearance = 'A mysterious figure'
    let traits = ['mysterious', 'enigmatic', 'distinguished', 'confident', 'refined', 'intense']
    try {
      const parsed = JSON.parse(rawText)
      if (parsed.appearance) appearance = parsed.appearance
      if (Array.isArray(parsed.traits) && parsed.traits.length > 0) traits = parsed.traits
    } catch { /* use defaults */ }

    // Save appearance for scene generation
    const { createClient } = await import('npm:@supabase/supabase-js@2')
    const db = createClient(supabaseUrl, supabaseServiceKey)

    await db.from('gents').update({ appearance_description: appearance }).eq('id', gent_id)

    // Step 2: Generate avatar — Tonight's buildAvatarPrompt
    const traitList = traits.join(', ')
    const imagePrompt = `Stylised portrait avatar of a real person. Subject: ${appearance}. Personality: ${traitList}. Style: High-end digital painting, cinematic dramatic lighting, rich natural colours preserving the subject's actual skin tone and hair colour, sharp facial detail, sophisticated artistic composition, dark elegant background. No text or labels.`

    const imageResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${googleApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: imagePrompt }] }],
          generationConfig: {
            responseModalities: ['TEXT', 'IMAGE'],
            imageConfig: { aspectRatio: '1:1' },
          },
        }),
      }
    )

    if (!imageResponse.ok) {
      throw new Error(`Image generation error: ${imageResponse.status} ${await imageResponse.text()}`)
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

    const { error: uploadError } = await db.storage
      .from('portraits')
      .upload(fileName, imageBytes, { contentType: mimeType, upsert: true })

    if (uploadError) throw new Error(`Storage upload error: ${uploadError.message}`)

    const { data: { publicUrl } } = db.storage.from('portraits').getPublicUrl(fileName)

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
