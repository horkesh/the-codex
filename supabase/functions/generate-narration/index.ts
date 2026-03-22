const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

import { createClient } from 'npm:@supabase/supabase-js'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { text, entry_id, voice = 'onyx' } = await req.json()
    if (!text || !entry_id) {
      return new Response(JSON.stringify({ error: 'text and entry_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const db = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // Check cache — if narration already exists, return signed URL
    const filePath = `${entry_id}.mp3`
    const { data: existing } = await db.storage.from('narrations').createSignedUrl(filePath, 3600)
    if (existing?.signedUrl) {
      return new Response(JSON.stringify({ audio_url: existing.signedUrl }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Generate via OpenAI TTS
    const apiKey = Deno.env.get('OPENAI_API_KEY')
    if (!apiKey) throw new Error('OPENAI_API_KEY not set')

    const ttsRes = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'tts-1',
        voice,
        input: text,
      }),
    })

    if (!ttsRes.ok) {
      const err = await ttsRes.text()
      throw new Error(`OpenAI TTS failed: ${ttsRes.status} ${err}`)
    }

    const audioBlob = await ttsRes.arrayBuffer()

    // Upload to Storage
    const { error: uploadErr } = await db.storage
      .from('narrations')
      .upload(filePath, audioBlob, {
        contentType: 'audio/mpeg',
        upsert: true,
      })
    if (uploadErr) console.error('Upload error:', uploadErr)

    // Get signed URL
    const { data: signed } = await db.storage.from('narrations').createSignedUrl(filePath, 3600)

    return new Response(JSON.stringify({ audio_url: signed?.signedUrl ?? '' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
