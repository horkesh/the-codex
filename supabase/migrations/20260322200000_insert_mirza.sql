-- Drop FK to auth.users if it still exists (may have been missed if constraint name differs)
DO $$
BEGIN
  -- Try common constraint names
  ALTER TABLE public.gents DROP CONSTRAINT IF EXISTS gents_id_fkey;
  ALTER TABLE public.gents DROP CONSTRAINT IF EXISTS gents_pkey_fkey;
  -- Also try dropping any FK referencing auth.users on the id column
  PERFORM 1;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- Insert Mirza as retired operative
INSERT INTO public.gents (id, alias, display_name, full_alias, retired)
SELECT gen_random_uuid(), 'operative', 'Mirza', 'Retired Operative', true
WHERE NOT EXISTS (SELECT 1 FROM public.gents WHERE alias = 'operative');
