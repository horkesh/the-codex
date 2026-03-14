-- Add 'threshold' to the achievements type constraint
-- The original constraint may vary by name; drop any existing check and re-add.
ALTER TABLE achievements DROP CONSTRAINT IF EXISTS achievements_type_check;
ALTER TABLE achievements ADD CONSTRAINT achievements_type_check
  CHECK (type IN ('milestone', 'streak', 'legendary', 'threshold'));
