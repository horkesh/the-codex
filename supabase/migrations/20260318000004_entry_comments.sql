CREATE TABLE IF NOT EXISTS entry_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id uuid NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
  gent_id uuid NOT NULL REFERENCES gents(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(body) <= 280),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE entry_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY ec_select ON entry_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY ec_insert ON entry_comments FOR INSERT TO authenticated WITH CHECK (gent_id = auth.uid());
CREATE POLICY ec_delete ON entry_comments FOR DELETE TO authenticated USING (gent_id = auth.uid());
CREATE INDEX idx_ec_entry ON entry_comments(entry_id);
