import { GENT_APPEARANCES, GENT_VISUAL_ID } from '../_shared/gent-identities.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const ASPECT_RATIOS: Record<string, string> = {
  '1:1':  '1:1',
  '4:5':  '3:4',   // Imagen doesn't support 4:5 — closest is 3:4, CSS cover handles the diff
  '9:16': '9:16',
}

// Prompts for generating from scratch (no cover image available)
// All prompts use the noir geometric style — abstract minimalist forms, not photorealistic
const TYPE_PROMPTS: Record<string, (location: string) => string> = {
  mission:     (loc) => `Abstract geometric artwork of three stylish silhouetted figures exploring ${loc || 'a city'} at night. Minimalist angular architecture, dramatic noir lighting with gold accents, sharp geometric city forms in background. Dark moody palette.`,
  night_out:   (_)   => `Abstract geometric artwork of three figures at an upscale bar. Angular minimalist bar interior, amber geometric light shapes, sharp silhouettes, dramatic rim lighting. Dark moody palette with warm gold accents.`,
  steak:       (_)   => `Abstract geometric artwork of a fine dining scene. Minimalist angular table setting with geometric steak and wine glass forms, three silhouetted figures, warm candlelight rendered as sharp geometric shapes. Dark palette with gold and amber accents.`,
  playstation: (_)   => `Abstract geometric artwork of three figures gaming. Minimalist angular living room, screen glow rendered as geometric blue-purple light shapes, sharp silhouettes with controllers. Dark palette with neon accents.`,
  toast:       (_)   => `Abstract geometric artwork of three figures raising crystal glasses in a toast. Minimalist angular room, amber liquid as geometric light forms, dramatic rim lighting, sharp silhouettes. Dark palette with gold accents.`,
  gathering:   (loc) => `Abstract geometric artwork of an elegant gathering${loc ? ` in ${loc}` : ''}. Minimalist angular event space, three silhouetted host figures, warm geometric candlelight forms. Dark moody palette with gold accents.`,
  interlude:   (_)   => `Abstract geometric artwork of a solitary figure at a window overlooking city lights. Minimalist angular shapes, rain rendered as sharp geometric lines, contemplative silhouette. Dark noir palette with subtle warm accents.`,
}

// Noir style directive appended to the generation prompt
const NOIR_STYLE = 'Style: dark cinematic digital art, minimalist geometric forms, noir lighting with dramatic shadows and rim lights, moody desaturated palette with warm gold accents, dark background, sharp recognisable facial features, high-end illustration quality.'

// Step 1: Analyze the cover photo — describe the scene using known gent identities
async function analyzeScene(
  coverBase64: string,
  mimeType: string,
  apiKey: string,
): Promise<string> {
  const gentDescriptions = Object.entries(GENT_APPEARANCES)
    .map(([name, desc]) => `- ${name.charAt(0).toUpperCase() + name.slice(1)}: ${desc}`)
    .join('\n')

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 20_000)

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { inline_data: { mime_type: mimeType, data: coverBase64 } },
              { text: `Describe this photograph for an image generation model. Identify each person using the known appearances below.

Known people — match by hair and facial hair:
${gentDescriptions}

Describe in this order:
1. Each person: name, their key physical features (face, hair, facial hair, build), clothing, pose, position (left/center/right). Describe ALL people visible.
2. Table contents: name every food item and drink specifically (e.g. "grilled steak on wooden cutting board with golden fries").
3. Setting: venue type, atmosphere. Keep brief.

Output one paragraph. No preamble.` },
            ],
          }],
          generationConfig: {
            maxOutputTokens: 2048,
            thinkingConfig: { thinkingBudget: 0 },
          },
        }),
      }
    )

    if (!response.ok) {
      throw new Error(`Scene analysis error: ${response.status} ${await response.text()}`)
    }

    const result = await response.json()
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? ''
    if (!text) throw new Error('Scene analysis returned empty description')

    console.log('Scene analysis:', text.slice(0, 200))
    return text
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw new Error('Scene analysis timed out after 20s')
    throw e
  } finally {
    clearTimeout(timeout)
  }
}

// Step 2: Generate noir artwork from scene description using Gemini Flash Image
// No photo input — forces generation from scratch instead of applying a filter
async function generateNoirScene(
  sceneDescription: string,
  lightingHint: string,
  apiKey: string,
): Promise<string> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 20_000)
  const lightingLine = lightingHint ? `\nOriginal lighting context: ${lightingHint}. Adapt the noir lighting to reflect this time of day.` : ''

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: `Generate a dark cinematic digital artwork of this scene:\n\n${sceneDescription}\n\n${NOIR_STYLE}${lightingLine}\n\nEach person's facial features, hair, and facial hair must be sharp and distinctive as described. The artwork should have a dark moody atmosphere with dramatic lighting. Generate the image.` },
            ],
          }],
          generationConfig: {
            responseModalities: ['IMAGE'],
          },
        }),
      }
    )

    if (!response.ok) {
      throw new Error(`Gemini generate error: ${response.status} ${await response.text()}`)
    }

    const result = await response.json()
    const parts = result.candidates?.[0]?.content?.parts ?? []
    const imagePart = parts.find((p: { inlineData?: { data: string } }) => p.inlineData?.data)

    if (!imagePart?.inlineData?.data) {
      throw new Error('Gemini returned no image in generate response')
    }

    return imagePart.inlineData.data
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw new Error('Noir generation timed out after 20s')
    throw e
  } finally {
    clearTimeout(timeout)
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { entry_type, title, location, city, country, date, time_of_day, aspect, cover_image_url } = await req.json()
    const googleApiKey = Deno.env.get('GOOGLE_AI_API_KEY')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    if (!googleApiKey) throw new Error('GOOGLE_AI_API_KEY not set')

    const { createClient } = await import('npm:@supabase/supabase-js@2')
    const db = createClient(supabaseUrl, supabaseServiceKey)

    const locationStr = location || city || (country ? `${country}` : '')

    // Derive lighting context from time of day
    let lightingHint = ''
    if (time_of_day) {
      const hour = parseInt(time_of_day.split(':')[0], 10)
      if (hour >= 5 && hour < 10) lightingHint = 'early morning light, soft golden dawn'
      else if (hour >= 10 && hour < 14) lightingHint = 'midday light'
      else if (hour >= 14 && hour < 17) lightingHint = 'warm afternoon light'
      else if (hour >= 17 && hour < 20) lightingHint = 'golden hour sunset light'
      else lightingHint = 'nighttime, artificial lighting'
    }
    const aspectRatio = ASPECT_RATIOS[aspect] ?? '1:1'

    // If cover image exists, download it for restyling
    let coverBase64: string | null = null
    let coverMimeType = 'image/jpeg'
    let coverDownloadError: string | null = null
    if (cover_image_url) {
      try {
        const controller = new AbortController()
        setTimeout(() => controller.abort(), 10_000)
        const imgRes = await fetch(cover_image_url, { signal: controller.signal })
        if (imgRes.ok) {
          coverMimeType = imgRes.headers.get('content-type') ?? 'image/jpeg'
          const buf = new Uint8Array(await imgRes.arrayBuffer())
          let binary = ''
          for (let i = 0; i < buf.length; i++) binary += String.fromCharCode(buf[i])
          coverBase64 = btoa(binary)
        } else {
          coverDownloadError = `HTTP ${imgRes.status} ${imgRes.statusText}`
        }
      } catch (e) {
        coverDownloadError = (e as Error).message
      }
    }

    let base64Image: string
    let sceneDescription: string | null = null
    const mode = coverBase64 ? 'restyle' : 'from_scratch'

    if (coverBase64) {
      // Two-step restyle: analyze scene → generate noir rendition
      sceneDescription = await analyzeScene(coverBase64, coverMimeType, googleApiKey)
      base64Image = await generateNoirScene(sceneDescription, lightingHint, googleApiKey)
    } else {
      // From-scratch mode: use Imagen to generate a new background
      const promptFn = TYPE_PROMPTS[entry_type] ?? TYPE_PROMPTS['mission']
      const imagePrompt = `${promptFn(locationStr)} ${NOIR_STYLE} No text, no words, no watermarks. Suitable as full-bleed text background.`

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
      base64Image = imageResult.predictions?.[0]?.bytesBase64Encoded
      if (!base64Image) throw new Error('No image returned from Imagen')
    }

    const imageBytes = Uint8Array.from(atob(base64Image), (c) => c.charCodeAt(0))
    const fileName = `template-bgs/${entry_type}-${Date.now()}.webp`

    const { error: uploadError } = await db.storage
      .from('covers')
      .upload(fileName, imageBytes, { contentType: 'image/webp', upsert: true })

    if (uploadError) throw new Error(`Storage upload error: ${uploadError.message}`)

    const { data: { publicUrl } } = db.storage.from('covers').getPublicUrl(fileName)

    return new Response(JSON.stringify({
      bg_url: publicUrl,
      _debug: {
        mode,
        cover_image_url: cover_image_url ?? null,
        cover_downloaded: !!coverBase64,
        cover_download_error: coverDownloadError,
        scene_description: sceneDescription ?? null,
        imagen_prompt: sceneDescription ? `${sceneDescription}. ${NOIR_STYLE} No text, no words, no watermarks.` : null,
      },
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    const stack = error instanceof Error ? error.stack : undefined
    console.error('generate-template-bg error:', msg, stack)
    return new Response(JSON.stringify({ error: msg, stack }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
