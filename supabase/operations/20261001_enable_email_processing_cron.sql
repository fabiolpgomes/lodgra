-- Apply only AFTER the process-pending runtime is deployed and verified.
-- Preserve the deployed hostname, vault lookup, cadence and timeout.
BEGIN;
DO $$
DECLARE v_job record; v_command text;
BEGIN
  SELECT * INTO STRICT v_job FROM cron.job WHERE jobname='enrich-reservations-15min';
  IF position('/api/email-extraction/process-pending' IN v_job.command)>0 THEN RETURN; END IF;
  IF position('/api/cron/enrich-reservations' IN v_job.command)=0
     OR position('net.http_get' IN v_job.command)=0 THEN
    RAISE EXCEPTION 'Unexpected previous cron command; inspect before applying';
  END IF;
  v_command := replace(replace(v_job.command,'/api/cron/enrich-reservations','/api/email-extraction/process-pending'),'net.http_get','net.http_post');
  PERFORM cron.alter_job(v_job.jobid,command:=v_command);
END $$;
COMMIT;
