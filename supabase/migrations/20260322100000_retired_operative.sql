-- Extend alias CHECK to include 'operative'
ALTER TABLE public.gents DROP CONSTRAINT IF EXISTS gents_alias_check;
ALTER TABLE public.gents ADD CONSTRAINT gents_alias_check CHECK (alias IN ('keys', 'bass', 'lorekeeper', 'operative'));

-- Add retired flag (default false for existing gents)
ALTER TABLE public.gents ADD COLUMN IF NOT EXISTS retired boolean DEFAULT false;

-- NOTE: The actual gent row for Mirza must be inserted manually after
-- creating a Supabase Auth user, since gents.id references auth.users.id.
-- This migration only prepares the schema.
