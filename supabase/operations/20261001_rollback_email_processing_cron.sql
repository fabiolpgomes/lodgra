BEGIN;
DO $$
DECLARE v_job record;
BEGIN
  SELECT * INTO STRICT v_job FROM cron.job WHERE jobname='enrich-reservations-15min';
  IF position('/api/cron/enrich-reservations' IN v_job.command)>0 THEN RETURN; END IF;
  IF position('/api/email-extraction/process-pending' IN v_job.command)=0
     OR position('net.http_post' IN v_job.command)=0 THEN
    RAISE EXCEPTION 'Unexpected current cron command; inspect before rollback';
  END IF;
  PERFORM cron.alter_job(v_job.jobid,command:=replace(replace(v_job.command,'/api/email-extraction/process-pending','/api/cron/enrich-reservations'),'net.http_post','net.http_get'));
END $$;
COMMIT;
