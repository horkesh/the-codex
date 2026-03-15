-- Add event_name column to prospects (the specific event name, distinct from the venue)
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS event_name text;
