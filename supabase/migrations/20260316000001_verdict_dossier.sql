-- ─── 1. people: add portrait_url and instagram_source_url ──────────────────
ALTER TABLE people ADD COLUMN IF NOT EXISTS portrait_url text;
ALTER TABLE people ADD COLUMN IF NOT EXISTS instagram_source_url text;

-- ─── 2. person_scans table ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS person_scans (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by              uuid NOT NULL REFERENCES gents(id) ON DELETE CASCADE,
  person_id               uuid REFERENCES people(id) ON DELETE SET NULL,

  -- Source
  source_type             text NOT NULL CHECK (source_type IN ('photo', 'instagram_screenshot')),
  source_photo_url        text,
  instagram_handle        text,
  instagram_source_url    text,

  -- AI verdict output
  generated_avatar_url    text,
  appearance_description  text,
  trait_words             text[],
  score                   numeric(4,2),
  verdict_label           text,
  confidence              numeric(4,2),
  recommended_category    text CHECK (recommended_category IN ('contact', 'person_of_interest')),

  -- Dossier fields (review-editable)
  display_name            text,
  bio                     text,
  why_interesting         text,
  best_opener             text,
  green_flags             text[],
  watchouts               text[],

  -- Full AI payload for audit
  review_payload          jsonb,

  -- Lifecycle
  status                  text DEFAULT 'draft' CHECK (status IN ('draft', 'confirmed', 'discarded')),
  created_at              timestamptz DEFAULT now(),
  updated_at              timestamptz DEFAULT now()
);

ALTER TABLE person_scans ENABLE ROW LEVEL SECURITY;

CREATE POLICY ps_select ON person_scans FOR SELECT TO authenticated
  USING (created_by = auth.uid());
CREATE POLICY ps_insert ON person_scans FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());
CREATE POLICY ps_update ON person_scans FOR UPDATE TO authenticated
  USING (created_by = auth.uid());
CREATE POLICY ps_delete ON person_scans FOR DELETE TO authenticated
  USING (created_by = auth.uid());

CREATE INDEX idx_ps_created_by ON person_scans(created_by);
CREATE INDEX idx_ps_person_id   ON person_scans(person_id);

-- ─── 3. Global unique index on Instagram handle ────────────────────────────
-- One row per Instagram handle across the entire circle (all gents)
CREATE UNIQUE INDEX IF NOT EXISTS uidx_people_instagram_lower
  ON people (lower(instagram))
  WHERE instagram IS NOT NULL;
