-- Rollback for 20261009120000_sync_action_states.sql (drops dismissals and alert history).
DROP TABLE IF EXISTS public.sync_action_states;
