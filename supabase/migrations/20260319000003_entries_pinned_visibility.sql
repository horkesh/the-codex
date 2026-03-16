-- Add pinned column to entries
ALTER TABLE entries ADD COLUMN IF NOT EXISTS pinned boolean NOT NULL DEFAULT false;

-- Add visibility column to entries
ALTER TABLE entries ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'shared';

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'entries_visibility_check') THEN
    ALTER TABLE entries ADD CONSTRAINT entries_visibility_check CHECK (visibility IN ('shared', 'private'));
  END IF;
END $$;
