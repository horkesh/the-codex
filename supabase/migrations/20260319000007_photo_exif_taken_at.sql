-- Add EXIF timestamp to entry_photos for day-episode grouping
ALTER TABLE entry_photos ADD COLUMN IF NOT EXISTS exif_taken_at TEXT;

-- Add story metadata column for day episodes
ALTER TABLE stories ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
