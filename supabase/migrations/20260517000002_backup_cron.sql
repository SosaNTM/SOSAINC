-- ============================================================================
-- Daily backup cron — free-tier PITR alternative
-- Exports key tables as JSON to the 'backups' storage bucket daily at 02:00 UTC
-- ============================================================================

-- Private storage bucket for backup JSON exports (service role only)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('backups', 'backups', false, 524288000, ARRAY['application/json'])
ON CONFLICT (id) DO NOTHING;

-- Only service role may read or write backup files
DROP POLICY IF EXISTS "backups_service_only" ON storage.objects;
CREATE POLICY "backups_service_only" ON storage.objects
  FOR ALL
  USING  (bucket_id = 'backups' AND auth.role() = 'service_role')
  WITH CHECK (bucket_id = 'backups' AND auth.role() = 'service_role');

-- Trigger daily backup Edge Function at 02:00 UTC
SELECT cron.schedule(
  'daily-backup-export',
  '0 2 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/backup-export',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    )
  );
  $$
);
