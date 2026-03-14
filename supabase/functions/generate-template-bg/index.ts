const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const ASPECT_RATIOS: Record<string, string> = {
  '1:1':  '1:1',
  '4:5':  '3:4',   // Imagen doesn't support 4:5 — closest is 3:4, CSS cover handles the diff
  '9:16': '9:16',
}

const TYPE_PROMPTS: Record<string, (location: string) => string> = {
  mission:     (loc) => `Dark cinematic photograph of three stylish well-dressed men exploring ${loc || 'a city'} at night, seen from behind or at a slight distance, city lights and architecture around them, atmospheric shadows, dramatic urban lighting. Style: fine art travel photography, film noir, rich blacks.`,
  night_out:   (_)   => `Moody upscale bar interior, three stylish men seated or standing at a dark polished bar, deep amber candlelight, brass fixtures, shallow depth of field, bokeh highlights. Shot from behind or at distance, faces not prominent. Style: editorial nightlife photography.`,
  steak:       (_)   => `Elegant fine dining table, two or three well-dressed men sharing a meal, candlelight, dark marble, wine glasses mid-toast. Hands and forearms visible, rich warm tones, dramatic shadows. Style: high-end food photography, cinematic.`,
  playstation: (_)   => `Three friends in a dark living room, facing away from camera, lit by screens and deep blue-purple LED glow, controllers in hand, relaxed and focused. Cinematic, moody. Style: atmospheric lifestyle photography.`,
  toast:       (_)   => `Three men raising crystal whisky glasses in a dimly lit room, amber liquid catching the light, dramatic rim lighting, hands and glasses prominent, bokeh background, smoky atmosphere. Style: luxury spirits photography, deep blacks, amber gold tones.`,
  gathering:   (loc) => `Elegant private event space${loc ? ` in ${loc}` : ''}, three well-dressed men conversing warmly, warm candlelight, deep shadows, intimate atmosphere. Shot at middle distance, faces partially lit. Style: luxury events photography, dark moody.`,
  interlude:   (_)   => `A lone figure standing at a rain-streaked dark window overlooking city lights at night, silhouette against the glow, contemplative mood, deep shadows, cinematic. Style: film noir, melancholic, rich blacks.`,
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { entry_type, title, location, city, country, aspect } = await req.json()
    const googleApiKey = Deno.env.get('GOOGLE_AI_API_KEY')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    if (!googleApiKey) throw new Error('GOOGLE_AI_API_KEY not set')

    const { createClient } = await import('npm:@supabase/supabase-js@2')
    const db = createClient(supabaseUrl, supabaseServiceKey)

    const locationStr = location || city || (country ? `${country}` : '')
    const promptFn = TYPE_PROMPTS[entry_type] ?? TYPE_PROMPTS['mission']
    const basePrompt = promptFn(locationStr)
    const imagePrompt = `${basePrompt} Dark, cinematic, high contrast, suitable as full-bleed text background. Aspect ratio optimised for Instagram.`

    const aspectRatio = ASPECT_RATIOS[aspect] ?? '1:1'

    const imageResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${googleApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instances: [{ prompt: imagePrompt }],
          parameters: {
            sampleCount: 1,
            aspectRatio,
            safetyFilterLevel: 'block_only_high',
          },
        }),
      }
    )

    if (!imageResponse.ok) {
      throw new Error(`Imagen error: ${imageResponse.status} ${await imageResponse.text()}`)
    }

    const imageResult = await imageResponse.json()
    const base64Image = imageResult.predictions?.[0]?.bytesBase64Encoded
    if (!base64Image) throw new Error('No image returned from Imagen')

    const imageBytes = Uint8Array.from(atob(base64Image), (c) => c.charCodeAt(0))
    const fileName = `template-bgs/${entry_type}-${Date.now()}.webp`

    const { error: uploadError } = await db.storage
      .from('covers')
      .upload(fileName, imageBytes, { contentType: 'image/webp', upsert: true })

    if (uploadError) throw new Error(`Storage upload error: ${uploadError.message}`)

    const { data: { publicUrl } } = db.storage.from('covers').getPublicUrl(fileName)

    return new Response(JSON.stringify({ bg_url: publicUrl }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('generate-template-bg error:', error)
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
