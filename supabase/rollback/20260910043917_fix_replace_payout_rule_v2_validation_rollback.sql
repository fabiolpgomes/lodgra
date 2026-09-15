BEGIN;

-- Intentionally no-op. This migration only corrects the function body shipped
-- immediately before it; restoring the invalid validation expression would
-- make the RPC unusable. The preceding rollback removes the RPC and restores
-- the fail-closed v2 gate when the complete feature is rolled back.

COMMIT;
