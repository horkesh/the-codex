const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { entry } = await req.json()
    const googleApiKey = Deno.env.get('GOOGLE_AI_API_KEY')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    if (!googleApiKey) throw new Error('GOOGLE_AI_API_KEY not set')

    // Build image generation prompt based on entry type
    const typePrompts: Record<string, string> = {
      mission: `Luxury travel photography, cinematic, ${entry.city || 'unknown city'} landmark or skyline, golden hour light, sophisticated atmosphere`,
      night_out: `Upscale nightlife, moody bar or lounge, warm amber lighting, sophisticated cocktails, dark luxury atmosphere`,
      steak: `Fine dining photography, premium steak dish, candlelight, upscale restaurant, dark elegant atmosphere`,
      playstation: `Modern gaming setup, PS5 controller, subtle ambient lighting, sleek dark aesthetic, competitive atmosphere`,
      toast: `Cocktail party, premium drinks, crystal glasses, dim warm lighting, sophisticated gathering`,
      gathering: `Elegant private event, warm ambient lighting, sophisticated guests, luxury venue aesthetic`,
      interlude: `Contemplative moment, abstract luxury, soft bokeh, dark moody tones, introspective atmosphere`,
    }

    const imagePrompt = `${typePrompts[entry.type] || 'Dark luxury lifestyle photography'}. Style: cinematic, high-end editorial photography, muted dark palette with gold accents. NO text, NO people faces.`

    // Call Imagen via Gemini API
    const imageResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:predict?key=${googleApiKey}`,
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

    // Decode and upload to Supabase Storage
    const imageBytes = Uint8Array.from(atob(base64Image), (c) => c.charCodeAt(0))
    const fileName = `${entry.id}/cover-${Date.now()}.webp`

    const { createClient } = await import('npm:@supabase/supabase-js@2')
    const storageClient = createClient(supabaseUrl, supabaseServiceKey)

    const { error: uploadError } = await storageClient.storage
      .from('covers')
      .upload(fileName, imageBytes, { contentType: 'image/webp', upsert: true })

    if (uploadError) throw new Error(`Storage upload error: ${uploadError.message}`)

    const { data: { publicUrl } } = storageClient.storage.from('covers').getPublicUrl(fileName)

    return new Response(JSON.stringify({ cover_url: publicUrl }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('generate-cover error:', error)
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
