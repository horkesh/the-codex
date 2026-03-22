INSERT INTO storage.buckets (id, name, public)
VALUES ('narrations', 'narrations', true)
ON CONFLICT (id) DO NOTHING;
