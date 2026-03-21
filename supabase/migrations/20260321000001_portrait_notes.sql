-- Add portrait_notes column to person_scans for persisting director's notes
ALTER TABLE person_scans ADD COLUMN IF NOT EXISTS portrait_notes text;
