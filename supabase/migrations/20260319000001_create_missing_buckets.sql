-- Create storage buckets that were previously only referenced in policy migrations
-- but never explicitly created. ON CONFLICT keeps this idempotent.

INSERT INTO storage.buckets (id, name, public)
VALUES
  ('entry-photos',  'entry-photos',  true),
  ('people-photos', 'people-photos', true),
  ('person-scans',  'person-scans',  true)
ON CONFLICT (id) DO NOTHING;
