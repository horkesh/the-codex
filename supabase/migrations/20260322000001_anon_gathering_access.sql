-- Allow anonymous access to gathering entries (pre and post) for public invite pages and OG meta
CREATE POLICY "anon can read gathering entries"
  ON public.entries FOR SELECT TO anon
  USING (status IN ('gathering_pre', 'gathering_post'));
