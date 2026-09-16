-- Intentionally no-op: validation changes catalog evidence, not accepted values,
-- columns, or financial rows. Keep the already-enforced checks and their verified
-- state when reverting application code. Do not reintroduce NOT VALID debt.
BEGIN;
COMMIT;
