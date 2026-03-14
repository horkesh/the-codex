-- 1. Tier column on people
ALTER TABLE people ADD COLUMN IF NOT EXISTS tier text DEFAULT 'acquaintance';
ALTER TABLE people ADD CONSTRAINT people_tier_check
  CHECK (tier IN ('inner_circle', 'outer_circle', 'acquaintance'));

-- 2. person_appearances table
CREATE TABLE IF NOT EXISTS person_appearances (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id  uuid NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  entry_id   uuid NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
  noted_by   uuid NOT NULL REFERENCES gents(id),
  created_at timestamptz DEFAULT now(),
  UNIQUE(person_id, entry_id)
);
ALTER TABLE person_appearances ENABLE ROW LEVEL SECURITY;

-- RLS: authenticated can read/insert; only noter can delete
CREATE POLICY pa_select ON person_appearances FOR SELECT TO authenticated USING (true);
CREATE POLICY pa_insert ON person_appearances FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY pa_delete ON person_appearances FOR DELETE TO authenticated USING (noted_by = auth.uid());

CREATE INDEX idx_pa_entry ON person_appearances(entry_id);
CREATE INDEX idx_pa_person ON person_appearances(person_id);
