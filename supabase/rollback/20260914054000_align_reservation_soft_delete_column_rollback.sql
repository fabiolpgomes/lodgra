-- Intentionally retain this additive compatibility column during application rollback.
-- It already existed in production before this migration and may hold soft-delete
-- history. Dropping it would destroy data and break existing production consumers.
-- Roll back the dependent RPCs with their own rollback files; no schema mutation here.
SELECT 'reservations.deleted_at retained to preserve soft-delete history' AS rollback_result;
