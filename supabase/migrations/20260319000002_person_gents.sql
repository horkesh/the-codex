-- Many-to-many: which gents "know" a person
CREATE TABLE IF NOT EXISTS person_gents (
  person_id uuid REFERENCES people(id) ON DELETE CASCADE,
  gent_id   uuid REFERENCES gents(id)  ON DELETE CASCADE,
  PRIMARY KEY (person_id, gent_id)
);

-- RLS
ALTER TABLE person_gents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read person_gents"
  ON person_gents FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert person_gents"
  ON person_gents FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete person_gents"
  ON person_gents FOR DELETE
  TO authenticated
  USING (true);
