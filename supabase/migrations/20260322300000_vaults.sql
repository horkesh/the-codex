-- Time capsule vaults: sealed messages that unlock on a future date
CREATE TABLE public.vaults (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL REFERENCES public.gents(id),
  message text NOT NULL,
  opens_at date NOT NULL,
  opened boolean DEFAULT false,
  opened_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.vaults ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gents can read own vaults"
  ON public.vaults FOR SELECT TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "gents can insert own vaults"
  ON public.vaults FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "gents can update own vaults"
  ON public.vaults FOR UPDATE TO authenticated
  USING (created_by = auth.uid());
