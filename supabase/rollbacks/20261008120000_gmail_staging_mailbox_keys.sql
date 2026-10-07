-- Rollback for 20261008120000_gmail_staging_mailbox_keys.sql
-- Data-only migration. Deleted duplicates and discarded security-code bodies cannot be rebuilt from SQL:
-- restore the raw_emails table from the backup taken by ./scripts/backup-producao.sh before applying.
-- The rekey alone is harmless to keep: the application code from this release reads only "<mailbox>:<gmail id>".
SELECT 1;
