-- Clean up existing duplicate stamps (keep the oldest per entry+type)
DELETE FROM passport_stamps a
USING passport_stamps b
WHERE a.entry_id = b.entry_id
  AND a.type = b.type
  AND a.entry_id IS NOT NULL
  AND a.created_at > b.created_at;

-- Prevent future duplicates per entry+type (race between createMissionStamp and backfill)
CREATE UNIQUE INDEX IF NOT EXISTS uidx_passport_stamps_entry_type
  ON passport_stamps (entry_id, type)
  WHERE entry_id IS NOT NULL;
