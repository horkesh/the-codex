CREATE POLICY "anon can read active prospects"
  ON public.prospects FOR SELECT TO anon
  USING (status = 'prospect' AND event_date IS NOT NULL);
