-- Allow any authenticated user to delete people (not just the one who added them)
DROP POLICY IF EXISTS "people_delete" ON public.people;
CREATE POLICY "people_delete" ON public.people FOR DELETE TO authenticated USING (true);
