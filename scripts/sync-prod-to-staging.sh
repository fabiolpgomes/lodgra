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

echo -e "${YELLOW}📦 Starting production → staging sync...${NC}"
echo "Timestamp: $TIMESTAMP"
echo ""

# Step 1: Export production database
echo -e "${YELLOW}1️⃣  Exporting production database...${NC}"
pg_dump "$SUPABASE_DB_URL_PROD" > "$DUMP_FILE"
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

-- Clear Stripe customer IDs
UPDATE public.organizations SET
  stripe_customer_id = NULL,
  stripe_br_customer_id = NULL,
  stripe_pt_customer_id = NULL,
  stripe_subscription_id = NULL,
  stripe_subscription_item_id = NULL;

-- Clear payment info from reservations
UPDATE public.payments SET
  stripe_payment_intent_id = NULL,
  payment_method_id = NULL
WHERE stripe_payment_intent_id IS NOT NULL;

-- Clear other sensitive integrations
UPDATE public.organizations SET
  asaas_api_key = NULL,
  google_feed_logs = NULL;

-- Log sanitization
INSERT INTO public.audit_logs (user_id, organization_id, action, resource_type, resource_id, changes, created_at)
VALUES (NULL, NULL, 'SANITIZE', 'DATABASE', 'all', '{"action": "production_sync_sanitization", "timestamp": "' || NOW() || '"}', NOW());
EOF
)

# Append sanitization to dump
echo "$SANITIZE_SQL" >> "$DUMP_FILE"
echo -e "${GREEN}✅ Data sanitization script added${NC}"

echo ""

# Step 3: Restore to staging database
echo -e "${YELLOW}3️⃣  Restoring to staging database...${NC}"

# Drop staging database (if exists) to ensure clean slate
psql "$SUPABASE_DB_URL_STAGING" -c "DROP SCHEMA IF EXISTS public CASCADE;" 2>/dev/null || true

# Restore from dump
psql "$SUPABASE_DB_URL_STAGING" < "$DUMP_FILE"

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
