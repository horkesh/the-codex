const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function verifyToken(token: string): Promise<{ gent_id: string } | null> {
  const secret = Deno.env.get('TOAST_BRIDGE_SECRET')
  if (!secret) return null

  try {
    const [payloadB64, sigB64] = token.split('.')
    if (!payloadB64 || !sigB64) return null

    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify'],
    )

    const sigBytes = Uint8Array.from(atob(sigB64), c => c.charCodeAt(0))
    const valid = await crypto.subtle.verify('HMAC', key, sigBytes, encoder.encode(payloadB64))
    if (!valid) return null

    const payload = JSON.parse(atob(payloadB64))
    if (payload.exp < Math.floor(Date.now() / 1000)) return null

    return { gent_id: payload.gent_id }
  } catch {
    return null
  }
}

const VIBE_TO_MOOD: Record<string, string> = {
  intimate: 'Intimate',
  electric: 'Electric',
  chaotic: 'Unhinged',
  chill: 'Sophisticated',
  wild: 'Late Night',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const { token, session } = body

    // Verify bridge token
    const auth = await verifyToken(token)
    if (!auth) {
      return new Response(JSON.stringify({ error: 'Invalid or expired token' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { createClient } = await import('npm:@supabase/supabase-js@2')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const db = createClient(supabaseUrl, supabaseKey)

    const {
      title,
      date,
      location,
      city,
      country,
      country_code,
      session_code,
      duration_seconds,
      act_count,
      guest_count,
      vibe_timeline,
      vibe_summary,
      cocktails,       // Array<{name, story, image_base64?, round_number, act, crafted_for_name?}>
      confessions,     // Array<{prompt, confessor_name?, confessor_is_gent, ai_commentary, act, reaction_count}>
      wrapped,         // Array<{participant_name, is_gent, gent_id?, stats, ai_note, ai_title}>
      guests,          // Array<{name, alias?, traits?, portrait_base64?, toast_profile?}>
      gent_participants, // Array<string> — gent IDs that participated
      gent_role_stats, // {gent_id: {role, photos_taken, cocktails_crafted, ...}}
      photos,          // Array<{base64, mime_type}> — group snap photos (max 10)
    } = session

    // 1. Create draft entry
    const { data: entry, error: entryErr } = await db
      .from('entries')
      .insert({
        type: 'toast',
        title: title || `The Toast — ${session_code}`,
        date,
        location: location || null,
        city: city || null,
        country: country || null,
        country_code: country_code || null,
        status: 'draft',
        visibility: 'shared',
        metadata: {
          session_code,
          duration_seconds,
          act_count,
          guest_count,
          vibe_summary: vibe_summary || '',
          guest_matches: [],
        },
        created_by: auth.gent_id,
      })
      .select('id')
      .single()

    if (entryErr) throw new Error(`Entry create: ${entryErr.message}`)
    const entryId = entry.id

    // 2. Add gent participants
    if (gent_participants?.length) {
      const participantRows = gent_participants.map((gid: string) => ({
        entry_id: entryId,
        gent_id: gid,
      }))
      await db.from('entry_participants').upsert(participantRows, { onConflict: 'entry_id,gent_id' })
    }

    // 3. Create toast_session
    const { data: tsData, error: tsErr } = await db
      .from('toast_sessions')
      .insert({
        entry_id: entryId,
        hosted_by: auth.gent_id,
        session_code,
        duration_seconds: duration_seconds || 0,
        act_count: act_count || 4,
        guest_count: guest_count || 0,
        vibe_timeline: vibe_timeline || [],
      })
      .select('id')
      .single()

    if (tsErr) throw new Error(`Toast session create: ${tsErr.message}`)
    const sessionId = tsData.id

    // 4. Match/create guests → Circle contacts
    // Scope guest matching to the hosting gent's contacts via person_gents
    const guestMatches: Array<{ toast_name: string; person_id: string | null; status: string }> = []

    for (const guest of (guests || [])) {
      // Try exact name match (case-insensitive) within hosting gent's contacts
      const { data: matches } = await db
        .from('person_gents')
        .select('person_id, people!inner(id, name, photo_url)')
        .eq('gent_id', auth.gent_id)
        .ilike('people.name', guest.name)
        .limit(1)

      let personId: string | null = null
      let matchStatus = 'unmatched'

      if (matches && matches.length > 0) {
        personId = matches[0].person_id
        matchStatus = 'matched'
      } else {
        // Create new POI
        let portraitUrl: string | null = null

        // Upload portrait if provided
        if (guest.portrait_base64) {
          const fileName = `toast_${sessionId}_${guest.name.toLowerCase().replace(/\s+/g, '_')}.webp`
          const portraitBytes = Uint8Array.from(atob(guest.portrait_base64), c => c.charCodeAt(0))
          const { error: upErr } = await db.storage
            .from('portraits')
            .upload(fileName, portraitBytes, { contentType: 'image/webp', upsert: true })
          if (!upErr) {
            const { data: { publicUrl } } = db.storage.from('portraits').getPublicUrl(fileName)
            portraitUrl = publicUrl
          }
        }

        const { data: newPerson, error: personErr } = await db
          .from('people')
          .insert({
            name: guest.name,
            photo_url: portraitUrl,
            labels: guest.traits || [],
            added_by: auth.gent_id,
            tier: 'poi',
            metadata: {
              toast_alias: guest.alias || null,
            },
          })
          .select('id')
          .single()

        if (!personErr && newPerson) {
          personId = newPerson.id
          matchStatus = 'created'

          // Link to hosting gent
          await db.from('person_gents').upsert(
            { person_id: personId, gent_id: auth.gent_id },
            { onConflict: 'person_id,gent_id' },
          )
        }
      }

      if (personId) {
        // Create appearance
        await db.from('person_appearances').upsert(
          { person_id: personId, entry_id: entryId, tagged_by: auth.gent_id },
          { onConflict: 'person_id,entry_id' },
        )
      }

      guestMatches.push({ toast_name: guest.name, person_id: personId, status: matchStatus })
    }

    // Auto-derive mood tags from vibe timeline
    const derivedMoods = [...new Set(
      (vibe_timeline || [])
        .map((v: { vibe: string }) => VIBE_TO_MOOD[v.vibe.toLowerCase()])
        .filter(Boolean)
    )]

    // Update entry metadata with guest matches, session_id, and mood_tags
    await db
      .from('entries')
      .update({
        metadata: {
          session_id: sessionId,
          session_code,
          duration_seconds,
          act_count,
          guest_count,
          vibe_summary: vibe_summary || '',
          guest_matches: guestMatches,
          mood_tags: derivedMoods,
        },
      })
      .eq('id', entryId)

    // 5. Insert cocktails
    const cocktailRows = []
    for (const c of (cocktails || [])) {
      let imageUrl: string | null = null
      if (c.image_base64) {
        const fileName = `toast_${sessionId}_cocktail_${c.round_number}.webp`
        const imgBytes = Uint8Array.from(atob(c.image_base64), ch => ch.charCodeAt(0))
        const { error: upErr } = await db.storage
          .from('entry-photos')
          .upload(fileName, imgBytes, { contentType: 'image/webp', upsert: true })
        if (!upErr) {
          const { data: { publicUrl } } = db.storage.from('entry-photos').getPublicUrl(fileName)
          imageUrl = publicUrl
        }
      }

      // Resolve crafted_for name to person_id
      const craftedForMatch = c.crafted_for_name
        ? guestMatches.find(g => g.toast_name === c.crafted_for_name)
        : null

      cocktailRows.push({
        session_id: sessionId,
        name: c.name,
        story: c.story || null,
        image_url: imageUrl,
        round_number: c.round_number || 1,
        act: c.act || 1,
        crafted_for: craftedForMatch?.person_id || null,
      })
    }
    if (cocktailRows.length) {
      await db.from('toast_cocktails').insert(cocktailRows)
    }

    // 6. Insert confessions
    const confessionRows = (confessions || []).map((c: Record<string, unknown>) => {
      // Resolve confessor name
      let confessorId: string | null = null
      if (c.confessor_name && !c.confessor_is_gent) {
        const match = guestMatches.find(g => g.toast_name === c.confessor_name)
        confessorId = match?.person_id || null
      } else if (c.confessor_is_gent && c.gent_id) {
        confessorId = c.gent_id as string
      }

      return {
        session_id: sessionId,
        prompt: c.prompt,
        confessor_id: confessorId,
        confessor_is_gent: !!c.confessor_is_gent,
        ai_commentary: c.ai_commentary || null,
        act: c.act || 1,
        reaction_count: c.reaction_count || 0,
      }
    })
    if (confessionRows.length) {
      await db.from('toast_confessions').insert(confessionRows)
    }

    // 7. Insert wrapped stats
    const wrappedRows = (wrapped || []).map((w: Record<string, unknown>) => {
      let participantId: string | null = null
      if (w.is_gent && w.gent_id) {
        participantId = w.gent_id as string
      } else if (w.participant_name) {
        const match = guestMatches.find(g => g.toast_name === w.participant_name)
        participantId = match?.person_id || null
      }

      return {
        session_id: sessionId,
        participant_id: participantId,
        is_gent: !!w.is_gent,
        stats: w.stats || {},
        ai_note: w.ai_note || null,
        ai_title: w.ai_title || null,
      }
    }).filter((r: Record<string, unknown>) => r.participant_id !== null)

    if (wrappedRows.length) {
      await db.from('toast_wrapped').insert(wrappedRows)
    }

    // 8. Upload group snap photos (max 10)
    const photoSlice = (photos || []).slice(0, 10)
    for (let i = 0; i < photoSlice.length; i++) {
      const p = photoSlice[i]
      const fileName = `${entryId}/toast_snap_${i}.webp`
      const imgBytes = Uint8Array.from(atob(p.base64), (ch: string) => ch.charCodeAt(0))
      const { error: upErr } = await db.storage
        .from('entry-photos')
        .upload(fileName, imgBytes, { contentType: p.mime_type || 'image/webp', upsert: true })

      if (!upErr) {
        const { data: { publicUrl } } = db.storage.from('entry-photos').getPublicUrl(fileName)
        await db.from('entry_photos').insert({
          entry_id: entryId,
          url: publicUrl,
          sort_order: i,
        })

        // First photo becomes cover
        if (i === 0) {
          await db.from('entries').update({ cover_image_url: publicUrl }).eq('id', entryId)
        }
      }
    }

    // 9. Update gent role stats (upsert)
    for (const [gentId, roleStats] of Object.entries(gent_role_stats || {})) {
      const rs = roleStats as Record<string, unknown>
      const role = rs.role as string
      if (!role) continue

      // Try to fetch existing stats
      const { data: existing } = await db
        .from('toast_gent_stats')
        .select('*')
        .eq('gent_id', gentId)
        .eq('role', role)
        .single()

      if (existing) {
        await db
          .from('toast_gent_stats')
          .update({
            sessions_hosted: existing.sessions_hosted + 1,
            photos_taken: existing.photos_taken + ((rs.photos_taken as number) || 0),
            cocktails_crafted: existing.cocktails_crafted + ((rs.cocktails_crafted as number) || 0),
            confessions_drawn: existing.confessions_drawn + ((rs.confessions_drawn as number) || 0),
            spotlights_given: existing.spotlights_given + ((rs.spotlights_given as number) || 0),
            vibe_shifts_called: existing.vibe_shifts_called + ((rs.vibe_shifts_called as number) || 0),
            reactions_sparked: existing.reactions_sparked + ((rs.reactions_sparked as number) || 0),
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
      } else {
        await db.from('toast_gent_stats').insert({
          gent_id: gentId,
          role,
          sessions_hosted: 1,
          photos_taken: (rs.photos_taken as number) || 0,
          cocktails_crafted: (rs.cocktails_crafted as number) || 0,
          confessions_drawn: (rs.confessions_drawn as number) || 0,
          spotlights_given: (rs.spotlights_given as number) || 0,
          vibe_shifts_called: (rs.vibe_shifts_called as number) || 0,
          reactions_sparked: (rs.reactions_sparked as number) || 0,
        })
      }
    }

    // 10. Enrich matched guest profiles with wrapped data
    for (const w of (wrapped || [])) {
      if (w.is_gent || !w.participant_name) continue
      const match = guestMatches.find(g => g.toast_name === w.participant_name)
      if (!match?.person_id) continue

      // Add wrapped title + signature drink to person metadata
      const updates: Record<string, unknown> = {}
      if (w.ai_title) {
        updates['metadata'] = { toast_wrapped_title: w.ai_title }
      }

      // Find if this person had a cocktail crafted for them
      const personalCocktail = cocktailRows.find(c => c.crafted_for === match.person_id)
      if (personalCocktail) {
        updates['metadata'] = {
          ...(updates['metadata'] as Record<string, unknown> || {}),
          toast_signature_drink: personalCocktail.name,
        }
      }

      if (Object.keys(updates).length > 0) {
        // Merge metadata rather than overwrite
        const { data: person } = await db
          .from('people')
          .select('metadata')
          .eq('id', match.person_id)
          .single()

        const existingMeta = (person?.metadata || {}) as Record<string, unknown>
        const newMeta = { ...existingMeta, ...(updates['metadata'] as Record<string, unknown>) }

        await db.from('people').update({ metadata: newMeta }).eq('id', match.person_id)
      }
    }

    return new Response(JSON.stringify({ entry_id: entryId, session_id: sessionId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('receive-toast-session error:', error)
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
