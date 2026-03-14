const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { entry, participant_ids } = await req.json()
    const googleApiKey = Deno.env.get('GOOGLE_AI_API_KEY')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    if (!googleApiKey) throw new Error('GOOGLE_AI_API_KEY not set')

    const { createClient } = await import('npm:@supabase/supabase-js@2')
    const db = createClient(supabaseUrl, supabaseServiceKey)

    // Fetch appearance descriptions for participants (if any)
    let appearances: string[] = []
    if (participant_ids?.length) {
      const { data: gents } = await db
        .from('gents')
        .select('appearance_description')
        .in('id', participant_ids)
      appearances = (gents ?? [])
        .map((g: { appearance_description: string | null }) => g.appearance_description)
        .filter(Boolean) as string[]
    }

    const location = entry.location || entry.city || 'an undisclosed location'
    const title = entry.title || 'The Chronicles'
    const hasPeople = appearances.length > 0

    // Build prompt based on entry type and whether we have appearance data
    let imagePrompt: string

    if ((entry.type === 'mission' || entry.type === 'night_out') && hasPeople) {
      const peopleDesc = appearances.length === 1
        ? `one gentleman: ${appearances[0]}`
        : `${appearances.length} gentlemen: ${appearances.join('; and ')}`
      const setting = entry.type === 'mission'
        ? `an iconic location in ${location}, cityscape or landmark`
        : `an upscale bar or lounge in ${location}, warm amber light, dark wood and brass`
      imagePrompt = `Cinematic wide photograph titled "${title}". Setting: ${setting}. Featuring ${peopleDesc}. Shot from a slight distance, full environment visible, subjects naturally posed. Style: editorial travel photography, film grain, atmospheric, 35mm lens, golden hour or evening light. No text.`
    } else {
      const typePrompts: Record<string, string> = {
        mission: `Three stylish well-dressed men exploring ${location}, seen from behind at a famous landmark or city street, golden hour, cinematic atmosphere`,
        night_out: `Three stylish men at an upscale bar or lounge in ${location}, warm amber lighting, dark luxury atmosphere, seen from behind or at distance`,
        steak: `Three well-dressed men at a fine dining table, candlelight, dark marble, wine glasses, hands visible, elegant atmosphere`,
        playstation: `Three friends in a dark room facing a screen, controllers in hand, ambient LED glow, relaxed and competitive`,
        toast: `Three men raising whisky glasses in a toast, dramatic rim lighting, amber tones, bokeh background`,
        gathering: `Three well-dressed men at an elegant private event, warm candlelight, intimate atmosphere, seen at middle distance`,
        interlude: `A lone silhouetted figure at a rain-streaked window overlooking city lights at night, contemplative, cinematic`,
      }
      imagePrompt = `${typePrompts[entry.type] || 'Three stylish men in a dark luxury setting, cinematic'}. Style: cinematic, high-end editorial, muted dark palette with gold accents. No text.`
    }

    // Call Imagen 4
    const imageResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${googleApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instances: [{ prompt: imagePrompt }],
          parameters: { sampleCount: 1, aspectRatio: '3:4', safetyFilterLevel: 'block_only_high' },
        }),
      }
    )

    if (!imageResponse.ok) {
      throw new Error(`Imagen API error: ${imageResponse.status} ${await imageResponse.text()}`)
    }

    const imageResult = await imageResponse.json()
    const base64Image = imageResult.predictions?.[0]?.bytesBase64Encoded
    if (!base64Image) throw new Error('No image returned from Imagen API')

    const imageBytes = Uint8Array.from(atob(base64Image), (c) => c.charCodeAt(0))
    const fileName = `${entry.id}/cover-${Date.now()}.webp`

    const { error: uploadError } = await db.storage
      .from('covers')
      .upload(fileName, imageBytes, { contentType: 'image/webp', upsert: true })

    if (uploadError) throw new Error(`Storage upload error: ${uploadError.message}`)

    const { data: { publicUrl } } = db.storage.from('covers').getPublicUrl(fileName)

    // Persist cover_url to the entry
    await db.from('entries').update({ cover_image_url: publicUrl }).eq('id', entry.id)

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
