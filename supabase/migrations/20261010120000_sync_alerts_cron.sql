-- Sync alerts: e-mails tenant admins about sync problems (once, then one reminder a day).
-- Runs 5 minutes after the iCal / Gmail / enrichment jobs so it reads fresh state.
SELECT cron.unschedule('sync-alerts-15min') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'sync-alerts-15min');
SELECT cron.schedule('sync-alerts-15min', '5-59/15 * * * *', $$SELECT net.http_get(url := 'https://www.lodgra.io/api/cron/sync-alerts', headers := jsonb_build_object('Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'lodgra_cron_secret')), timeout_milliseconds := 120000) AS request_id$$);
