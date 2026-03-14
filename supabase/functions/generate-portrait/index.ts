const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { gent_id, display_name, alias } = await req.json()
    const googleApiKey = Deno.env.get('GOOGLE_AI_API_KEY')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    if (!googleApiKey) throw new Error('GOOGLE_AI_API_KEY not set')
    if (!gent_id || !display_name || !alias) throw new Error('Missing required fields: gent_id, display_name, alias')

    const imagePrompt = `A sophisticated portrait illustration for '${display_name}' aka '${alias}', in the style of a vintage gentleman's society membership card. Dark background, gold filigree details, classical portraiture style, elegant and distinguished.`

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
    const fileName = `${gent_id}/portrait-${Date.now()}.webp`

    const { createClient } = await import('npm:@supabase/supabase-js@2')
    const storageClient = createClient(supabaseUrl, supabaseServiceKey)

    const { error: uploadError } = await storageClient.storage
      .from('portraits')
      .upload(fileName, imageBytes, { contentType: 'image/webp', upsert: true })

    if (uploadError) throw new Error(`Storage upload error: ${uploadError.message}`)

    const { data: { publicUrl } } = storageClient.storage.from('portraits').getPublicUrl(fileName)

    return new Response(JSON.stringify({ portrait_url: publicUrl }), {
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
