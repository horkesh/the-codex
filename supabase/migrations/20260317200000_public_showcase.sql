-- Public showcase: allow anonymous reads on gents, published+pinned+shared entries, participants, stats

-- Gents profiles are public
CREATE POLICY "gents_anon_select" ON public.gents
  FOR SELECT TO anon USING (true);

-- Only published, shared, pinned entries visible publicly
CREATE POLICY "entries_anon_select" ON public.entries
  FOR SELECT TO anon USING (
    status IN ('published', 'gathering_post')
    AND visibility = 'shared'
    AND pinned = true
  );

-- Participants for publicly visible entries
CREATE POLICY "ep_anon_select" ON public.entry_participants
  FOR SELECT TO anon USING (
    EXISTS (
      SELECT 1 FROM public.entries e
      WHERE e.id = entry_id
        AND e.status IN ('published', 'gathering_post')
        AND e.visibility = 'shared'
        AND e.pinned = true
    )
  );

-- Grant anon access to gent_stats view
GRANT SELECT ON public.gent_stats TO anon;
