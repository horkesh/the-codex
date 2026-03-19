const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { createClient } = await import('npm:@supabase/supabase-js@2')
    const db = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()

    const { data: stale, error: fetchErr } = await db
      .from('entries')
      .select('id')
      .eq('type', 'toast')
      .eq('status', 'draft')
      .lt('created_at', cutoff)

    if (fetchErr) throw new Error(`Fetch stale drafts: ${fetchErr.message}`)

    if (!stale || stale.length === 0) {
      return new Response(JSON.stringify({ deleted: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const ids = stale.map((e: { id: string }) => e.id)

    const { error: delErr } = await db
      .from('entries')
      .delete()
      .in('id', ids)

    if (delErr) throw new Error(`Delete stale drafts: ${delErr.message}`)

    console.log(`Cleaned up ${ids.length} stale toast drafts`)

    return new Response(JSON.stringify({ deleted: ids.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('cleanup-toast-drafts error:', error)
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
