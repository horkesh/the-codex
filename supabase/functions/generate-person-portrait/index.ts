const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { appearance, traits, scan_id } = await req.json()
    const googleApiKey = Deno.env.get('GOOGLE_AI_API_KEY')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    if (!googleApiKey) throw new Error('GOOGLE_AI_API_KEY not set')
    if (!appearance || !traits || !scan_id) throw new Error('appearance, traits, and scan_id required')

    // Same portrait prompt template as generate-portrait
    const traitList = (traits as string[]).join(', ')
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

    const { createClient } = await import('npm:@supabase/supabase-js@2')
    const db = createClient(supabaseUrl, supabaseServiceKey)

    const ext = mimeType.split('/')[1] ?? 'png'
    const imageBytes = Uint8Array.from(atob(base64Image), (c) => c.charCodeAt(0))
    const fileName = `scans/${scan_id}/portrait-${Date.now()}.${ext}`

    const { error: uploadError } = await db.storage
      .from('portraits')
      .upload(fileName, imageBytes, { contentType: mimeType, upsert: true })

    if (uploadError) throw new Error(`Storage upload error: ${uploadError.message}`)

    const { data: { publicUrl } } = db.storage.from('portraits').getPublicUrl(fileName)

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
