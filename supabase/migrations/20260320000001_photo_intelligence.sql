-- Add GPS coordinates and AI analysis to entry_photos
ALTER TABLE entry_photos ADD COLUMN IF NOT EXISTS gps_lat double precision;
ALTER TABLE entry_photos ADD COLUMN IF NOT EXISTS gps_lng double precision;
ALTER TABLE entry_photos ADD COLUMN IF NOT EXISTS ai_analysis jsonb DEFAULT NULL;

-- Index for GPS queries (finding nearby photos)
CREATE INDEX IF NOT EXISTS idx_entry_photos_gps
  ON entry_photos (gps_lat, gps_lng)
  WHERE gps_lat IS NOT NULL;

-- Index for finding photos by entry with EXIF data
CREATE INDEX IF NOT EXISTS idx_entry_photos_entry_exif
  ON entry_photos (entry_id, exif_taken_at)
  WHERE exif_taken_at IS NOT NULL;
