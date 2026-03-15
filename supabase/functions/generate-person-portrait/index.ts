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

    const traitList = (traits as string[]).join(', ')
    const imagePrompt = `Close-up portrait photograph of a person. ${appearance} Expression conveys: ${traitList}. Photorealistic, sharp facial detail, natural skin tones exactly as described, cinematic studio lighting with subtle rim light, deep dark background, high-end editorial photography style. Face fills most of the frame. No text, no watermarks.`

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
      throw new Error(`Image generation error: ${imageResponse.status} ${await imageResponse.text()}`)
    }

    const imageResult = await imageResponse.json()
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
