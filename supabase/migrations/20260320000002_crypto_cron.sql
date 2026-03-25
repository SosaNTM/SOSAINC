-- ============================================================================
-- PAPER 02 — Crypto: Cron Jobs for price updates & history cleanup
-- ============================================================================
-- Requires pg_cron and pg_net extensions enabled in the Supabase project.

-- Update prices every 5 minutes
SELECT cron.schedule(
  'update-crypto-prices-5min',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/update-crypto-prices',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    )
  );
  $$
);

-- Cleanup price history older than 90 days, every night at midnight
SELECT cron.schedule(
  'cleanup-crypto-price-history',
  '0 0 * * *',
  $$DELETE FROM crypto_price_history WHERE recorded_at < now() - interval '90 days';$$
);
