CREATE TABLE IF NOT EXISTS prospect_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id uuid NOT NULL REFERENCES prospects(id) ON DELETE CASCADE,
  gent_id uuid NOT NULL REFERENCES gents(id) ON DELETE CASCADE,
  vote text NOT NULL CHECK (vote IN ('in', 'pass')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(prospect_id, gent_id)
);
ALTER TABLE prospect_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY pv_select ON prospect_votes FOR SELECT TO authenticated USING (true);
CREATE POLICY pv_insert ON prospect_votes FOR INSERT TO authenticated WITH CHECK (gent_id = auth.uid());
CREATE POLICY pv_upsert ON prospect_votes FOR UPDATE TO authenticated USING (gent_id = auth.uid());
