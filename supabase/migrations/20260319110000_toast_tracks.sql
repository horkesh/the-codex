CREATE TABLE IF NOT EXISTS toast_tracks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES toast_sessions(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  artist text NOT NULL,
  album_art_url text,
  spotify_url text,
  act integer,
  play_order integer NOT NULL DEFAULT 0,
  is_track_of_night boolean NOT NULL DEFAULT false
);

ALTER TABLE toast_tracks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read toast_tracks"
  ON toast_tracks FOR SELECT TO authenticated USING (true);

CREATE INDEX idx_toast_tracks_session ON toast_tracks(session_id);
