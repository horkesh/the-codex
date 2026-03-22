const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

let cachedToken: { token: string; expires: number } | null = null

async function getToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expires) return cachedToken.token

  const clientId = Deno.env.get('SPOTIFY_CLIENT_ID') ?? ''
  const clientSecret = Deno.env.get('SPOTIFY_CLIENT_SECRET') ?? ''

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + btoa(`${clientId}:${clientSecret}`),
    },
    body: 'grant_type=client_credentials',
  })

  const data = await res.json()
  cachedToken = { token: data.access_token, expires: Date.now() + (data.expires_in - 60) * 1000 }
  return cachedToken.token
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { query, limit = 5 } = await req.json()
    if (!query) {
      return new Response(JSON.stringify({ error: 'query required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const token = await getToken()
    const res = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=${limit}`,
      { headers: { Authorization: `Bearer ${token}` } },
    )

    const data = await res.json()
    // deno-lint-ignore no-explicit-any
    const tracks = (data.tracks?.items ?? []).map((t: any) => ({
      name: t.name,
      artist: t.artists?.[0]?.name ?? '',
      album: t.album?.name ?? '',
      spotify_url: t.external_urls?.spotify ?? '',
      album_art: t.album?.images?.[1]?.url ?? t.album?.images?.[0]?.url ?? '',
    }))

    return new Response(JSON.stringify({ tracks }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
