-- Storage RLS policies for all buckets
-- Public read on all buckets (buckets are marked public, but policies are still needed for uploads)

-- AVATARS: authenticated users can upload; public can read
CREATE POLICY "avatars_public_read" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "avatars_auth_insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');
CREATE POLICY "avatars_auth_update" ON storage.objects FOR UPDATE USING (bucket_id = 'avatars' AND auth.role() = 'authenticated');
CREATE POLICY "avatars_auth_delete" ON storage.objects FOR DELETE USING (bucket_id = 'avatars' AND auth.role() = 'authenticated');

-- PHOTOS: authenticated users can upload; public can read
CREATE POLICY "photos_public_read" ON storage.objects FOR SELECT USING (bucket_id = 'photos');
CREATE POLICY "photos_auth_insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'photos' AND auth.role() = 'authenticated');
CREATE POLICY "photos_auth_update" ON storage.objects FOR UPDATE USING (bucket_id = 'photos' AND auth.role() = 'authenticated');
CREATE POLICY "photos_auth_delete" ON storage.objects FOR DELETE USING (bucket_id = 'photos' AND auth.role() = 'authenticated');

-- PORTRAITS: service role uploads (via Edge Function); public can read
CREATE POLICY "portraits_public_read" ON storage.objects FOR SELECT USING (bucket_id = 'portraits');
CREATE POLICY "portraits_any_insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'portraits');

-- STAMPS: service role uploads (via Edge Function); public can read
CREATE POLICY "stamps_public_read" ON storage.objects FOR SELECT USING (bucket_id = 'stamps');
CREATE POLICY "stamps_any_insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'stamps');
