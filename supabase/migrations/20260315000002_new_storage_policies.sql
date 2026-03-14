-- Storage RLS policies for new buckets: scene-images, story-stamps

-- SCENE-IMAGES: service role uploads (via generate-scene Edge Function); public can read
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'scene_images_public_read') THEN
    CREATE POLICY "scene_images_public_read" ON storage.objects FOR SELECT USING (bucket_id = 'scene-images');
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'scene_images_any_insert') THEN
    CREATE POLICY "scene_images_any_insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'scene-images');
  END IF;
END $$;

-- STORY-STAMPS: service role uploads (via generate-story-stamp Edge Function); public can read
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'story_stamps_public_read') THEN
    CREATE POLICY "story_stamps_public_read" ON storage.objects FOR SELECT USING (bucket_id = 'story-stamps');
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'story_stamps_any_insert') THEN
    CREATE POLICY "story_stamps_any_insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'story-stamps');
  END IF;
END $$;
