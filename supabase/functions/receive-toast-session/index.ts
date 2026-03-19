import { verifyToken } from '../_shared/hmac-token.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
    const secret = Deno.env.get('TOAST_BRIDGE_SECRET')
    if (!secret) {
      return new Response(JSON.stringify({ error: 'Bridge secret not configured' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const auth = await verifyToken(secret, token)
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

    // 1. Create draft entry with minimal metadata (enriched later in step 4)
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
        metadata: { session_code },
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
    // Fix 2: Batch fetch ALL hosting gent's contacts in one query
    const { data: allContacts } = await db
      .from('person_gents')
      .select('person_id, people!inner(id, name, photo_url)')
      .eq('gent_id', auth.gent_id)

    const contactsByName = new Map(
      (allContacts || []).map((c: any) => [c.people.name.toLowerCase(), c.people])
    )

    const guestMatches: Array<{ toast_name: string; person_id: string | null; status: string }> = []

    // Fix 3: Collect new guest creation promises and run in parallel
    type GuestResult = { toast_name: string; person_id: string | null; status: string }

    const guestPromises: Array<Promise<GuestResult>> = (guests || []).map(
      async (guest: any): Promise<GuestResult> => {
        // In-memory name match instead of per-guest DB query
        const matched = contactsByName.get(guest.name.toLowerCase())

        if (matched) {
          // Create appearance for matched contact
          await db.from('person_appearances').upsert(
            { person_id: matched.id, entry_id: entryId, noted_by: auth.gent_id },
            { onConflict: 'person_id,entry_id' },
          )
          return { toast_name: guest.name, person_id: matched.id, status: 'matched' }
        }

        // Create new POI — upload portrait if provided
        let portraitUrl: string | null = null
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
            metadata: { toast_alias: guest.alias || null },
          })
          .select('id')
          .single()

        if (personErr || !newPerson) {
          return { toast_name: guest.name, person_id: null, status: 'unmatched' }
        }

        const personId = newPerson.id

        // Link to hosting gent + create appearance in parallel
        await Promise.all([
          db.from('person_gents').upsert(
            { person_id: personId, gent_id: auth.gent_id },
            { onConflict: 'person_id,gent_id' },
          ),
          db.from('person_appearances').upsert(
            { person_id: personId, entry_id: entryId, noted_by: auth.gent_id },
            { onConflict: 'person_id,entry_id' },
          ),
        ])

        return { toast_name: guest.name, person_id: personId, status: 'created' }
      }
    )

    const guestResults = await Promise.all(guestPromises)
    guestMatches.push(...guestResults)

    // Auto-derive mood tags from vibe timeline
    const derivedMoods = [...new Set(
      (vibe_timeline || [])
        .map((v: { vibe: string }) => VIBE_TO_MOOD[v.vibe.toLowerCase()])
        .filter(Boolean)
    )]

    // Fix 5: Single metadata update with all final data (no redundant initial write)
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

    // 5. Insert cocktails — Fix 3: parallelize image uploads
    const cocktailImagePromises = (cocktails || []).map(async (c: any) => {
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

      return {
        session_id: sessionId,
        name: c.name,
        story: c.story || null,
        image_url: imageUrl,
        round_number: c.round_number || 1,
        act: c.act || 1,
        crafted_for: craftedForMatch?.person_id || null,
      }
    })

    const cocktailRows = await Promise.all(cocktailImagePromises)
    if (cocktailRows.length) {
      await db.from('toast_cocktails').insert(cocktailRows)
    }

    // 6. Insert confessions
    const confessionRows = (confessions || []).map((c: Record<string, unknown>) => {
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

    // 7b. Insert tracks (setlist)
    const trackRows = (session.tracks || []).map((t: any, i: number) => ({
      session_id: sessionId,
      name: t.name,
      artist: t.artist,
      album_art_url: t.album_art_url || null,
      spotify_url: t.spotify_url || null,
      act: t.act || null,
      play_order: t.play_order ?? i,
      is_track_of_night: !!t.is_track_of_night,
    }))
    if (trackRows.length) {
      await db.from('toast_tracks').insert(trackRows)
    }

    // 8. Upload group snap photos (max 10) — Fix 3: parallelize uploads
    const photoSlice = (photos || []).slice(0, 10)
    const photoResults = await Promise.all(
      photoSlice.map(async (p: any, i: number) => {
        const fileName = `${entryId}/toast_snap_${i}.webp`
        const imgBytes = Uint8Array.from(atob(p.base64), (ch: string) => ch.charCodeAt(0))
        const { error: upErr } = await db.storage
          .from('entry-photos')
          .upload(fileName, imgBytes, { contentType: p.mime_type || 'image/webp', upsert: true })

        if (upErr) return null

        const { data: { publicUrl } } = db.storage.from('entry-photos').getPublicUrl(fileName)
        await db.from('entry_photos').insert({
          entry_id: entryId,
          url: publicUrl,
          sort_order: i,
        })
        return { index: i, publicUrl }
      })
    )

    // First successful photo becomes cover
    const firstPhoto = photoResults.find(r => r !== null && r.index === 0)
    if (firstPhoto) {
      await db.from('entries').update({ cover_image_url: firstPhoto.publicUrl }).eq('id', entryId)
    }

    // 9. Update gent role stats — Fix 4: parallelize with Promise.all
    const statEntries = Object.entries(gent_role_stats || {})
    await Promise.all(
      statEntries.map(async ([gentId, roleStats]) => {
        const rs = roleStats as Record<string, unknown>
        const role = rs.role as string
        if (!role) return

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
      })
    )

    // 10. Enrich matched guest profiles with wrapped data — Fix 6: batch metadata reads
    const guestWrapped = (wrapped || []).filter(
      (w: any) => !w.is_gent && w.participant_name
    )
    const enrichPersonIds = guestWrapped
      .map((w: any) => guestMatches.find(g => g.toast_name === w.participant_name)?.person_id)
      .filter(Boolean) as string[]

    if (enrichPersonIds.length > 0) {
      // Batch fetch all person metadata in one query
      const { data: allPersonMeta } = await db
        .from('people')
        .select('id, metadata')
        .in('id', enrichPersonIds)

      const metaById = new Map(
        (allPersonMeta || []).map((p: any) => [p.id, (p.metadata || {}) as Record<string, unknown>])
      )

      // Build all updates in memory, then write
      const enrichPromises = guestWrapped.map(async (w: any) => {
        const match = guestMatches.find(g => g.toast_name === w.participant_name)
        if (!match?.person_id) return

        const existingMeta = metaById.get(match.person_id) || {}
        const newFields: Record<string, unknown> = {}

        if (w.ai_title) {
          newFields.toast_wrapped_title = w.ai_title
        }

        const personalCocktail = cocktailRows.find(c => c.crafted_for === match.person_id)
        if (personalCocktail) {
          newFields.toast_signature_drink = personalCocktail.name
        }

        if (Object.keys(newFields).length > 0) {
          await db.from('people')
            .update({ metadata: { ...existingMeta, ...newFields } })
            .eq('id', match.person_id)
        }
      })

      await Promise.all(enrichPromises)
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
