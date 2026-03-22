-- Extend alias CHECK to include 'operative'
ALTER TABLE public.gents DROP CONSTRAINT IF EXISTS gents_alias_check;
ALTER TABLE public.gents ADD CONSTRAINT gents_alias_check CHECK (alias IN ('keys', 'bass', 'lorekeeper', 'operative'));

-- Add retired flag (default false for existing gents)
ALTER TABLE public.gents ADD COLUMN IF NOT EXISTS retired boolean DEFAULT false;

-- Drop FK to auth.users so we can insert a gent without an auth account
ALTER TABLE public.gents DROP CONSTRAINT IF EXISTS gents_id_fkey;

-- Insert Mirza as retired operative (no auth user needed)
-- Only insert if no 'operative' gent exists yet
INSERT INTO public.gents (id, alias, display_name, full_alias, retired)
SELECT gen_random_uuid(), 'operative', 'Mirza', 'Retired Operative', true
WHERE NOT EXISTS (SELECT 1 FROM public.gents WHERE alias = 'operative');

-- Allow anon to see retired gent on public showcase
CREATE POLICY IF NOT EXISTS "anon can read gents"
  ON public.gents FOR SELECT TO anon USING (true);
