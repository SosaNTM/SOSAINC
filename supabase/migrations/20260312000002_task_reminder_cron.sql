-- ═══════════════════════════════════════════════════════════════════
-- Task Reminder — pg_cron schedule
--
-- Prerequisites:
--   pg_cron and pg_net must be enabled in your Supabase project.
--   Dashboard → Database → Extensions → enable pg_cron and pg_net.
--
-- After applying this migration, replace the two placeholders:
--   YOUR_PROJECT_REF   — found in Project Settings → General
--   YOUR_SERVICE_ROLE_KEY — found in Project Settings → API
--
-- To update the schedule after replacing placeholders:
--   supabase db push
--
-- To verify the job was created:
--   SELECT * FROM cron.job;
--
-- To run manually from SQL:
--   SELECT cron.run_job('iconoff-daily-task-reminder');
-- ═══════════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Remove existing job if re-running migration
SELECT cron.unschedule('iconoff-daily-task-reminder')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'iconoff-daily-task-reminder');

-- Runs at 07:00 UTC = 08:00 Rome (CET, winter).
-- For CEST (summer, UTC+2): change to '0 6 * * *'
-- Per-user notification_time is stored in telegram_settings for a future
-- hourly-cron iteration that filters users by their preferred time.
SELECT cron.schedule(
  'iconoff-daily-task-reminder',
  '0 7 * * *',
  $$
    SELECT net.http_post(
      url     := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/task-reminder',
      headers := jsonb_build_object(
        'Content-Type',   'application/json',
        'Authorization',  'Bearer YOUR_SERVICE_ROLE_KEY'
      ),
      body    := '{}'::jsonb
    );
  $$
);
