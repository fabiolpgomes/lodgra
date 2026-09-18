BEGIN;

-- Intentionally no-op. Restoring retroactive contract mutation would reopen
-- a data-integrity defect. The base feature rollback removes the RPC and
-- reinstates the fully frozen v2 mutation trigger.

COMMIT;
