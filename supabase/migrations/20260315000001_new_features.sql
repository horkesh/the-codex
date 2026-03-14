-- 1. gents: add status, portrait_url
ALTER TABLE gents ADD COLUMN IF NOT EXISTS portrait_url text;
ALTER TABLE gents ADD COLUMN IF NOT EXISTS status text;
ALTER TABLE gents ADD COLUMN IF NOT EXISTS status_expires_at timestamptz;

-- 2. entries: add scene_url
ALTER TABLE entries ADD COLUMN IF NOT EXISTS scene_url text;

-- 3. people: add POI (Person of Interest) columns
ALTER TABLE people ADD COLUMN IF NOT EXISTS category text DEFAULT 'contact';
ALTER TABLE people ADD COLUMN IF NOT EXISTS poi_source_url text;
ALTER TABLE people ADD COLUMN IF NOT EXISTS poi_intel text;
ALTER TABLE people ADD COLUMN IF NOT EXISTS poi_source_gent uuid REFERENCES gents(id);
ALTER TABLE people ADD COLUMN IF NOT EXISTS poi_visibility text DEFAULT 'private';

-- Add check constraints safely
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'people_category_check') THEN
    ALTER TABLE people ADD CONSTRAINT people_category_check CHECK (category IN ('contact', 'person_of_interest'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'people_poi_visibility_check') THEN
    ALTER TABLE people ADD CONSTRAINT people_poi_visibility_check CHECK (poi_visibility IN ('private', 'circle'));
  END IF;
END $$;

-- 4. prospects table (possible future events, scouted from Instagram)
CREATE TABLE IF NOT EXISTS prospects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid REFERENCES gents(id) ON DELETE CASCADE,
  source_url text,
  source_thumbnail_url text,
  venue_name text,
  location text,
  city text,
  country text,
  event_date date,
  estimated_price text,
  vibe text,
  dress_code text,
  notes text,
  status text DEFAULT 'prospect' CHECK (status IN ('prospect', 'passed', 'converted')),
  converted_entry_id uuid REFERENCES entries(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- 5. stories table (curated multi-entry narrative arcs for Passport)
CREATE TABLE IF NOT EXISTS stories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  subtitle text,
  cover_url text,
  lore text,
  stamp_url text,
  created_by uuid REFERENCES gents(id) ON DELETE CASCADE,
  entry_ids uuid[] DEFAULT '{}',
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 6. reactions table (gent reactions on entries)
CREATE TABLE IF NOT EXISTS reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id uuid REFERENCES entries(id) ON DELETE CASCADE,
  gent_id uuid REFERENCES gents(id) ON DELETE CASCADE,
  reaction_type text NOT NULL CHECK (reaction_type IN ('legendary', 'classic', 'ruthless', 'noted')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(entry_id, gent_id)
);

-- 7. bucket_list table (shared wishlist)
CREATE TABLE IF NOT EXISTS bucket_list (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  category text CHECK (category IN ('mission', 'night_out', 'steak', 'playstation', 'toast', 'gathering', 'other')),
  city text,
  country text,
  notes text,
  added_by uuid REFERENCES gents(id) ON DELETE CASCADE,
  status text DEFAULT 'open' CHECK (status IN ('open', 'done', 'passed')),
  converted_entry_id uuid REFERENCES entries(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- RLS: enable on all new tables
ALTER TABLE prospects ENABLE ROW LEVEL SECURITY;
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bucket_list ENABLE ROW LEVEL SECURITY;

-- RLS policies for prospects (authenticated users only)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'prospects' AND policyname = 'prospects_select') THEN
    CREATE POLICY prospects_select ON prospects FOR SELECT TO authenticated USING (true);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'prospects' AND policyname = 'prospects_insert') THEN
    CREATE POLICY prospects_insert ON prospects FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'prospects' AND policyname = 'prospects_update') THEN
    CREATE POLICY prospects_update ON prospects FOR UPDATE TO authenticated USING (true);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'prospects' AND policyname = 'prospects_delete') THEN
    CREATE POLICY prospects_delete ON prospects FOR DELETE TO authenticated USING (created_by = auth.uid());
  END IF;
END $$;

-- RLS policies for stories
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'stories' AND policyname = 'stories_select') THEN
    CREATE POLICY stories_select ON stories FOR SELECT TO authenticated USING (true);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'stories' AND policyname = 'stories_insert') THEN
    CREATE POLICY stories_insert ON stories FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'stories' AND policyname = 'stories_update') THEN
    CREATE POLICY stories_update ON stories FOR UPDATE TO authenticated USING (true);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'stories' AND policyname = 'stories_delete') THEN
    CREATE POLICY stories_delete ON stories FOR DELETE TO authenticated USING (created_by = auth.uid());
  END IF;
END $$;

-- RLS policies for reactions
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'reactions' AND policyname = 'reactions_select') THEN
    CREATE POLICY reactions_select ON reactions FOR SELECT TO authenticated USING (true);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'reactions' AND policyname = 'reactions_insert') THEN
    CREATE POLICY reactions_insert ON reactions FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'reactions' AND policyname = 'reactions_delete') THEN
    CREATE POLICY reactions_delete ON reactions FOR DELETE TO authenticated USING (gent_id = auth.uid());
  END IF;
END $$;

-- RLS policies for bucket_list
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'bucket_list' AND policyname = 'bucket_list_select') THEN
    CREATE POLICY bucket_list_select ON bucket_list FOR SELECT TO authenticated USING (true);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'bucket_list' AND policyname = 'bucket_list_insert') THEN
    CREATE POLICY bucket_list_insert ON bucket_list FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'bucket_list' AND policyname = 'bucket_list_update') THEN
    CREATE POLICY bucket_list_update ON bucket_list FOR UPDATE TO authenticated USING (true);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'bucket_list' AND policyname = 'bucket_list_delete') THEN
    CREATE POLICY bucket_list_delete ON bucket_list FOR DELETE TO authenticated USING (added_by = auth.uid());
  END IF;
END $$;
