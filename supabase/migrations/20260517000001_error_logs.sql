-- ============================================================================
-- Error logs — client-side error capture fallback (no Sentry DSN required)
-- ============================================================================

CREATE TABLE IF NOT EXISTS error_logs (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  timestamptz NOT NULL DEFAULT now(),
  user_id     uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  portal_id   text,
  module      text,
  action      text,
  severity    text        NOT NULL DEFAULT 'error'
                          CHECK (severity IN ('info', 'warning', 'error', 'fatal')),
  message     text        NOT NULL,
  stack       text,
  extra       jsonb
);

ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;

-- Authenticated users may insert their own errors (or anonymous errors with null user_id)
CREATE POLICY "error_logs_insert"
  ON error_logs FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

-- Only service role may read
CREATE POLICY "error_logs_service_select"
  ON error_logs FOR SELECT
  USING (auth.role() = 'service_role');

-- Auto-purge logs older than 90 days
SELECT cron.schedule(
  'purge-error-logs-90d',
  '0 3 * * *',
  $$DELETE FROM error_logs WHERE created_at < now() - interval '90 days';$$
);
