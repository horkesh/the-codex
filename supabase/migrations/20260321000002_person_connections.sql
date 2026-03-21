-- Explicit person-to-person connections (mutual, optional label)
CREATE TABLE IF NOT EXISTS person_connections (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_a   uuid NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  person_b   uuid NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  label      text,
  created_by uuid NOT NULL REFERENCES gents(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE (person_a, person_b),
  CHECK (person_a < person_b)  -- canonical ordering, ensures no duplicates
);

ALTER TABLE person_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all" ON person_connections FOR ALL USING (auth.role() = 'authenticated');
