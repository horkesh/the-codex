-- Atomically increment a numeric counter in the JSONB metadata column
CREATE OR REPLACE FUNCTION public.increment_metadata_counter(
  p_entry_id uuid,
  p_key text
) RETURNS void
LANGUAGE sql
AS $$
  UPDATE entries
  SET metadata = jsonb_set(
    COALESCE(metadata, '{}'::jsonb),
    ARRAY[p_key],
    to_jsonb(COALESCE((metadata->>p_key)::int, 0) + 1)
  )
  WHERE id = p_entry_id;
$$;
