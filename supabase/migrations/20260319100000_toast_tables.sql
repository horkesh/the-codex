-- Toast session tables for The Toast ↔ Chronicles bridge

-- 1. toast_sessions — one row per Toast party session
CREATE TABLE IF NOT EXISTS toast_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id uuid REFERENCES entries(id) ON DELETE CASCADE NOT NULL,
  hosted_by uuid REFERENCES gents(id) NOT NULL,
  session_code text NOT NULL,
  duration_seconds integer NOT NULL DEFAULT 0,
  act_count integer NOT NULL DEFAULT 4,
  guest_count integer NOT NULL DEFAULT 0,
  vibe_timeline jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE toast_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read toast_sessions"
  ON toast_sessions FOR SELECT TO authenticated USING (true);

CREATE INDEX idx_toast_sessions_entry ON toast_sessions(entry_id);

-- 2. toast_cocktails — AI cocktails generated during session
CREATE TABLE IF NOT EXISTS toast_cocktails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES toast_sessions(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  story text,
  image_url text,
  round_number integer NOT NULL DEFAULT 1,
  act integer NOT NULL DEFAULT 1,
  crafted_for uuid REFERENCES people(id) ON DELETE SET NULL
);

ALTER TABLE toast_cocktails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read toast_cocktails"
  ON toast_cocktails FOR SELECT TO authenticated USING (true);

CREATE INDEX idx_toast_cocktails_session ON toast_cocktails(session_id);

-- 3. toast_confessions — confession round highlights
-- confessor_id is polymorphic (people.id or gents.id) — no FK constraint
CREATE TABLE IF NOT EXISTS toast_confessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES toast_sessions(id) ON DELETE CASCADE NOT NULL,
  prompt text NOT NULL,
  confessor_id uuid,
  confessor_is_gent boolean NOT NULL DEFAULT false,
  ai_commentary text,
  act integer NOT NULL DEFAULT 1,
  reaction_count integer NOT NULL DEFAULT 0
);

ALTER TABLE toast_confessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read toast_confessions"
  ON toast_confessions FOR SELECT TO authenticated USING (true);

CREATE INDEX idx_toast_confessions_session ON toast_confessions(session_id);

-- 4. toast_wrapped — per-participant wrapped stats
-- participant_id is polymorphic (people.id or gents.id) — no FK constraint
CREATE TABLE IF NOT EXISTS toast_wrapped (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES toast_sessions(id) ON DELETE CASCADE NOT NULL,
  participant_id uuid NOT NULL,
  is_gent boolean NOT NULL DEFAULT false,
  stats jsonb DEFAULT '{}'::jsonb,
  ai_note text,
  ai_title text
);

ALTER TABLE toast_wrapped ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read toast_wrapped"
  ON toast_wrapped FOR SELECT TO authenticated USING (true);

CREATE INDEX idx_toast_wrapped_session ON toast_wrapped(session_id);

-- 5. toast_gent_stats — cumulative role-specific stats per gent
CREATE TABLE IF NOT EXISTS toast_gent_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gent_id uuid REFERENCES gents(id) NOT NULL,
  role text NOT NULL CHECK (role IN ('lorekeeper', 'keys', 'bass')),
  sessions_hosted integer NOT NULL DEFAULT 0,
  photos_taken integer NOT NULL DEFAULT 0,
  cocktails_crafted integer NOT NULL DEFAULT 0,
  confessions_drawn integer NOT NULL DEFAULT 0,
  spotlights_given integer NOT NULL DEFAULT 0,
  vibe_shifts_called integer NOT NULL DEFAULT 0,
  reactions_sparked integer NOT NULL DEFAULT 0,
  top_guest_id uuid REFERENCES people(id) ON DELETE SET NULL,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(gent_id, role)
);

ALTER TABLE toast_gent_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read toast_gent_stats"
  ON toast_gent_stats FOR SELECT TO authenticated USING (true);

CREATE INDEX idx_toast_gent_stats_gent ON toast_gent_stats(gent_id);
