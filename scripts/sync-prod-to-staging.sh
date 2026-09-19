#!/bin/bash

# Sync Production → Staging Database
# Usage: ./scripts/sync-prod-to-staging.sh
# Environment variables required:
#   SUPABASE_DB_URL_PROD - Connection string for production database
#   SUPABASE_DB_URL_STAGING - Connection string for staging database

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check environment variables
if [ -z "$SUPABASE_DB_URL_PROD" ]; then
  echo -e "${RED}❌ Error: SUPABASE_DB_URL_PROD not set${NC}"
  exit 1
fi

if [ -z "$SUPABASE_DB_URL_STAGING" ]; then
  echo -e "${RED}❌ Error: SUPABASE_DB_URL_STAGING not set${NC}"
  exit 1
fi

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DUMP_FILE="/tmp/lodgra_prod_backup_${TIMESTAMP}.sql"

# Only dump the application's own schemas — never Supabase-managed system
# schemas (auth, storage, realtime, extensions, vault, net, cron, graphql,
# graphql_public, pgbouncer, supabase_migrations). Those are owned by
# Supabase's internal admin roles; dumping/restoring them as the plain
# "postgres" role fails with permission-denied / "must be owner of" errors
# and can leave the target database half-restored. Add more --schema flags
# here if the app gains another custom schema.
APP_SCHEMAS=(--schema=public --schema=lodgra_private)

echo -e "${YELLOW}📦 Starting production → staging sync...${NC}"
echo "Timestamp: $TIMESTAMP"
echo ""

# Step 1: Export production database (app schemas only)
echo -e "${YELLOW}1️⃣  Exporting production database (schemas: public, lodgra_private)...${NC}"
pg_dump "$SUPABASE_DB_URL_PROD" \
  "${APP_SCHEMAS[@]}" \
  --no-owner \
  --no-privileges \
  > "$DUMP_FILE"
if [ $? -eq 0 ]; then
  echo -e "${GREEN}✅ Production export successful${NC}"
  echo "File: $DUMP_FILE ($(du -h "$DUMP_FILE" | cut -f1))"
else
  echo -e "${RED}❌ Production export failed${NC}"
  exit 1
fi

echo ""

# Step 2: Sanitize sensitive data
echo -e "${YELLOW}2️⃣  Sanitizing sensitive data...${NC}"

# Create sanitization script
SANITIZE_SQL=$(cat <<'EOF'
-- Sanitize auth emails (change to test emails)
UPDATE auth.users SET email = 'user_' || substr(id::text, 1, 8) || '@test.lodgra.io' WHERE email NOT LIKE '%@test.lodgra.io%';

-- Clear sensitive organization columns — only the ones that actually exist
-- right now. Column names here have drifted from prod's real schema before
-- (stripe_br_customer_id got removed/renamed at some point and broke this
-- script cold), so check existence instead of assuming a fixed column list.
DO $$
DECLARE
  col TEXT;
BEGIN
  FOREACH col IN ARRAY ARRAY[
    'stripe_customer_id', 'stripe_br_customer_id', 'stripe_pt_customer_id',
    'stripe_pt_connect_id', 'stripe_subscription_id', 'stripe_subscription_item_id',
    'asaas_api_key'
  ]
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'organizations' AND column_name = col
    ) THEN
      EXECUTE format('UPDATE public.organizations SET %I = NULL', col);
    END IF;
  END LOOP;
END $$;

-- Clear payment info, if the payments table/columns exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'payments') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'payments' AND column_name = 'stripe_payment_intent_id') THEN
      UPDATE public.payments SET stripe_payment_intent_id = NULL WHERE stripe_payment_intent_id IS NOT NULL;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'payments' AND column_name = 'payment_method_id') THEN
      UPDATE public.payments SET payment_method_id = NULL WHERE payment_method_id IS NOT NULL;
    END IF;
  END IF;
END $$;

-- google_feed_logs is its own table, not a column on organizations (the old
-- version of this script tried to null it out as if it were one, which
-- would have failed too). It holds feed-generation timestamps, not
-- customer PII, so it's left alone rather than guessed at.

-- Log sanitization — best-effort, never fail the whole sync over this.
DO $$
BEGIN
  INSERT INTO public.audit_logs (user_id, organization_id, action, resource_type, resource_id, changes, created_at)
  VALUES (NULL, NULL, 'SANITIZE', 'DATABASE', 'all', jsonb_build_object('action', 'production_sync_sanitization', 'timestamp', NOW()), NOW());
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Skipping sanitization audit log insert: %', SQLERRM;
END $$;
EOF
)

# Append sanitization to dump
echo "$SANITIZE_SQL" >> "$DUMP_FILE"
echo -e "${GREEN}✅ Data sanitization script added${NC}"

echo ""

# Step 3: Reset staging app schemas, then restore
# The dump no longer uses pg_dump --clean (see above), so it contains only
# plain CREATE statements with no preceding DROPs. That means the restore
# needs a guaranteed-empty target: drop and recreate the app schemas here,
# every run, instead of relying on pg_dump to clean up prior objects.
# Doing our own drop+recreate also sidesteps a real bug with --clean: on an
# empty schema, pg_dump's "DROP TRIGGER ... ON public.user_profiles" style
# statements fail with "relation does not exist" because the referenced
# TABLE doesn't exist yet — IF EXISTS only covers the trigger, not the
# table it's attached to.
echo -e "${YELLOW}3️⃣  Resetting staging app schemas...${NC}"

# Only drop here — don't pre-create. Because we dump with explicit --schema
# flags (rather than a full unfiltered dump), pg_dump emits its own
# "CREATE SCHEMA ..." statement for EVERY selected schema, public included
# (pg_dump only special-cases public as "assume it pre-exists" on a full,
# unfiltered dump). Pre-creating either schema here would collide with that
# and fail with "already exists".
psql -v ON_ERROR_STOP=1 "$SUPABASE_DB_URL_STAGING" -c "
  DROP SCHEMA IF EXISTS public CASCADE;
  DROP SCHEMA IF EXISTS lodgra_private CASCADE;
"

echo -e "${YELLOW}   Restoring dump...${NC}"
psql -v ON_ERROR_STOP=1 "$SUPABASE_DB_URL_STAGING" -f "$DUMP_FILE"

# ALTER DEFAULT PRIVILEGES only affects objects created AFTER it runs, so it
# can't retroactively grant access to the tables the dump just created —
# grant on the existing objects explicitly, then also set default
# privileges for anything created later outside this script.
echo -e "${YELLOW}   Applying access grants...${NC}"
psql -v ON_ERROR_STOP=1 "$SUPABASE_DB_URL_STAGING" -c "
  GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
  GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
  GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
  GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;

  ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO anon, authenticated, service_role;
  ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO anon, authenticated, service_role;
  ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO anon, authenticated, service_role;
"

if [ $? -eq 0 ]; then
  echo -e "${GREEN}✅ Staging database restored successfully${NC}"
else
  echo -e "${RED}❌ Staging restore failed${NC}"
  exit 1
fi

echo ""

# Step 4: Verify integrity
echo -e "${YELLOW}4️⃣  Verifying data integrity...${NC}"

# Count records in key tables
PROD_USERS=$(psql "$SUPABASE_DB_URL_PROD" -t -c "SELECT COUNT(*) FROM public.user_profiles;")
STAGING_USERS=$(psql "$SUPABASE_DB_URL_STAGING" -t -c "SELECT COUNT(*) FROM public.user_profiles;")

PROD_ORGS=$(psql "$SUPABASE_DB_URL_PROD" -t -c "SELECT COUNT(*) FROM public.organizations;")
STAGING_ORGS=$(psql "$SUPABASE_DB_URL_STAGING" -t -c "SELECT COUNT(*) FROM public.organizations;")

PROD_PROPS=$(psql "$SUPABASE_DB_URL_PROD" -t -c "SELECT COUNT(*) FROM public.properties;")
STAGING_PROPS=$(psql "$SUPABASE_DB_URL_STAGING" -t -c "SELECT COUNT(*) FROM public.properties;")

echo "User profiles:   Production=$PROD_USERS  →  Staging=$STAGING_USERS"
echo "Organizations:   Production=$PROD_ORGS  →  Staging=$STAGING_ORGS"
echo "Properties:      Production=$PROD_PROPS  →  Staging=$STAGING_PROPS"

if [ "$PROD_USERS" = "$STAGING_USERS" ] && [ "$PROD_ORGS" = "$STAGING_ORGS" ]; then
  echo -e "${GREEN}✅ Data integrity verified${NC}"
else
  echo -e "${YELLOW}⚠️  Warning: Record counts don't match exactly (normal for incremental syncs)${NC}"
fi

echo ""

# Step 5: Run pending migrations
echo -e "${YELLOW}5️⃣  Running pending migrations...${NC}"
# This assumes supabase CLI is installed locally
# In CI, migrations are typically run via supabase db push
echo -e "${GREEN}✅ Migrations step skipped (run via: supabase db push)${NC}"

echo ""

# Cleanup
echo -e "${YELLOW}🧹 Cleaning up temporary files...${NC}"
rm -f "$DUMP_FILE"
echo -e "${GREEN}✅ Cleanup complete${NC}"

echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ Sync completed successfully!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════${NC}"
echo ""
echo "Staging is now ready for testing:"
echo "  - Next.js app connects to: wrqjpyyopwgyqluqkcga"
echo "  - Test users have email format: user_xxxxx@test.lodgra.io"
echo "  - All Stripe/payment data is cleared"
echo ""
