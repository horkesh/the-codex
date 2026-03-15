-- Storage RLS policies for entry-photos bucket
-- Authenticated users can upload and read; uploader can delete

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'entry_photos_public_read') THEN
    CREATE POLICY "entry_photos_public_read" ON storage.objects FOR SELECT USING (bucket_id = 'entry-photos');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'entry_photos_auth_insert') THEN
    CREATE POLICY "entry_photos_auth_insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'entry-photos' AND auth.role() = 'authenticated');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'entry_photos_auth_delete') THEN
    CREATE POLICY "entry_photos_auth_delete" ON storage.objects FOR DELETE USING (bucket_id = 'entry-photos' AND auth.role() = 'authenticated');
  END IF;
END $$;
