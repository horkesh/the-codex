-- Store appearance description extracted from portrait photo analysis
ALTER TABLE gents ADD COLUMN IF NOT EXISTS appearance_description TEXT;

-- Storage RLS for covers bucket
CREATE POLICY "covers_public_read" ON storage.objects FOR SELECT USING (bucket_id = 'covers');
CREATE POLICY "covers_any_insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'covers');
