-- Push subscriptions for Web Push API
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gent_id    uuid NOT NULL REFERENCES gents(id) ON DELETE CASCADE,
  endpoint   text NOT NULL,
  keys_p256dh text NOT NULL,
  keys_auth  text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(endpoint)
);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY ps_select ON push_subscriptions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY ps_insert ON push_subscriptions
  FOR INSERT TO authenticated WITH CHECK (gent_id = auth.uid());

CREATE POLICY ps_delete ON push_subscriptions
  FOR DELETE TO authenticated USING (gent_id = auth.uid());

CREATE INDEX idx_ps_gent ON push_subscriptions(gent_id);
