-- Store appearance description extracted from portrait photo analysis
ALTER TABLE gents ADD COLUMN IF NOT EXISTS appearance_description TEXT;

-- Storage RLS for covers bucket (idempotent)
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'covers_public_read'
  ) then
    execute 'CREATE POLICY "covers_public_read" ON storage.objects FOR SELECT USING (bucket_id = ''covers'')';
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'covers_any_insert'
  ) then
    execute 'CREATE POLICY "covers_any_insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = ''covers'')';
  end if;
end $$;
