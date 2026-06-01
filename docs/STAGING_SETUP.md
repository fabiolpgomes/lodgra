# Staging Environment Setup

## Overview

This document describes the staging environment setup for Lodgra. The staging environment mirrors production and allows safe testing of new features before production deployment.

**Staging Supabase Project:** `wrqjpyyopwgyqluqkcga`

---

## Architecture

```
Production (main branch)
    ↓ (Daily sync at 02:00 UTC)
Staging (staging branch)
    ↓ (Feature implementation)
Feature branches
    ↓ (After testing)
Back to Production
```

---

## 1. Vercel Configuration

### Environment Variables

The staging environment uses the `staging` branch. Configure these environment variables in Vercel for the `staging` branch preview deployment:

```bash
# Supabase Staging Project
NEXT_PUBLIC_SUPABASE_URL=https://wrqjpyyopwgyqluqkcga.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-staging-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-staging-service-role-key>

# App Configuration
NEXT_PUBLIC_APP_URL=https://staging.lodgra.io
NODE_ENV=production

# Stripe (use test keys)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_BR_SECRET_KEY=sk_test_...
STRIPE_PT_SECRET_KEY=sk_test_...

# Other services
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=<staging-key>
RESEND_API_KEY=<staging-key>
# ... etc
```

### Steps to Configure in Vercel

1. Go to Vercel Dashboard → lodgra project
2. Settings → Environment Variables
3. Add a new environment for "Preview" (or edit existing one)
4. Set the variables listed above
5. Ensure they apply to the `staging` branch only

---

## 2. Database Sync

### Automatic Daily Sync

The GitHub Actions workflow `.github/workflows/sync-staging.yml` automatically syncs production → staging:

- **Schedule:** Daily at 02:00 UTC
- **Trigger:** `workflow_dispatch` for manual sync

**What happens:**
1. Database is exported from production
2. Sensitive data is sanitized (emails, Stripe IDs, payment info)
3. Database is restored to staging
4. Data integrity is verified
5. Smoke tests run on the new staging database

### Manual Sync

To manually trigger staging sync:

```bash
# Via GitHub CLI
gh workflow run sync-staging.yml

# Or via command line (requires env vars)
export SUPABASE_DB_URL_PROD="postgresql://..." 
export SUPABASE_DB_URL_STAGING="postgresql://..."
./scripts/sync-prod-to-staging.sh
```

### Data Sanitization

The sync script automatically:
- Changes all user emails to `user_xxxxx@test.lodgra.io` format
- Clears all Stripe customer IDs and subscription IDs
- Clears payment information
- Clears API keys for integrations (Asaas, etc.)

This ensures staging is a safe replica without exposing production payment data.

---

## 3. Working on Staging

### Branching Strategy

```bash
# For feature development on staging:
git checkout staging
git pull origin staging
git checkout -b staging/your-feature-name

# Make changes, test on staging.lodgra.io
# Once approved, create PR to main
git push origin staging/your-feature-name
```

### Testing Features

1. **Feature branch:** Push to feature branch from `staging`
2. **Vercel Preview:** Vercel automatically creates preview URL for the branch
3. **Test on preview:** Verify feature works with production-like data
4. **Merge to staging:** After review, merge PR to `staging`
5. **Test on staging:** `https://staging.lodgra.io` reflects your changes
6. **PR to main:** Once approved, PR the feature to `main`

### Database Migrations

If your feature requires database schema changes:

```bash
# Create migration (from staging branch)
supabase migration new your_migration_name

# Edit the migration file
vim supabase/migrations/YYYYMMDDHHMMSS_your_migration_name.sql

# Test migration on staging
supabase db push --db-url $SUPABASE_DB_URL_STAGING

# Commit migration
git add supabase/migrations/
git commit -m "migrate: your migration description"
```

Migrations are applied to both staging and production in the deploy pipeline.

---

## 4. Monitoring Staging

### Staging URLs

- **App:** https://staging.lodgra.io
- **Supabase Console:** https://supabase.com/dashboard → wrqjpyyopwgyqluqkcga

### Checking Staging Status

```bash
# Check if staging database is synced
psql $SUPABASE_DB_URL_STAGING -c "SELECT COUNT(*) FROM public.organizations;"

# Check if Vercel deployment is successful
vercel env list
vercel logs --env staging
```

---

## 5. Best Practices

✅ **Do:**
- Test all features on staging before production
- Use staging database for realistic data volume testing
- Run smoke tests after each staging deploy
- Keep staging branch updated with latest production changes
- Document breaking changes in migration files

❌ **Don't:**
- Manually modify staging database (use migrations)
- Push directly to `main` without testing on staging
- Commit production secrets to staging env vars
- Modify user emails after sync (they're automatically changed)

---

## 6. Troubleshooting

### Staging Deploy Fails

```bash
# Check env vars
vercel env list

# Rebuild
vercel deploy --prod --cwd=staging

# Check Supabase connectivity
NEXT_PUBLIC_SUPABASE_URL=https://wrqjpyyopwgyqluqkcga.supabase.co \
NEXT_PUBLIC_SUPABASE_ANON_KEY=<key> \
npm run build
```

### Database Sync Fails

```bash
# Check credentials
echo $SUPABASE_DB_URL_STAGING

# Test connection
psql $SUPABASE_DB_URL_STAGING -c "SELECT version();"

# Run sync manually
./scripts/sync-prod-to-staging.sh
```

### Data Missing After Sync

The sync script only copies tables and RLS policies. If data is missing:

1. Verify production has the data: `psql $SUPABASE_DB_URL_PROD -c "SELECT COUNT(*) FROM public.your_table;"`
2. Re-run sync: `gh workflow run sync-staging.yml`
3. Check audit logs: `psql $SUPABASE_DB_URL_STAGING -c "SELECT * FROM public.audit_logs ORDER BY created_at DESC LIMIT 10;"`

---

## 7. Cleanup

### Deleting a Feature Branch

```bash
# After merging to main
git checkout staging
git pull origin staging
git branch -d staging/your-feature-name
git push origin --delete staging/your-feature-name
```

### Clearing Staging Cache

If you need to clear Vercel's cache for staging:

```bash
vercel env list  # verify staging config
vercel redeploy  # redeploy from latest
```

---

## Contacts & Escalation

- **Questions about staging?** Contact the DevOps team
- **Database sync issues?** Check GitHub Actions logs: `.github/workflows/sync-staging.yml`
- **Supabase access?** Contact the tech lead with your Supabase user email
