# Migration Deployment Instructions

## Issue

The amenities are not displaying on the public booking page (`/booking`) because the `property_amenities` table lacks a public RLS policy.

## Solution

Two artifacts need deployment:

### 1. Database Migration (RLS Policy)

**File**: `supabase/migrations/20260611000000_property_amenities_public_policy.sql`

**What it does**: Adds a public read policy to the `property_amenities` table to allow unauthenticated users to read amenities for public properties.

**How to apply**:

**Option A: Via Supabase CLI** (recommended)
```bash
supabase db push
# If timeout, try:
supabase migration repair --status applied 20260611000000
```

**Option B: Via Supabase Dashboard** (if CLI fails)
1. Go to https://app.supabase.com/project/YOUR_PROJECT/sql/new
2. Copy the SQL from `supabase/migrations/20260611000000_property_amenities_public_policy.sql`
3. Run the SQL in the SQL Editor
4. Verify the policy was created: `SELECT * FROM pg_policies WHERE tablename = 'property_amenities';`

**Option C: Via Direct Connection** (psql)
```bash
psql "postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres" < supabase/migrations/20260611000000_property_amenities_public_policy.sql
```

### 2. Code Deployment (Backend + Frontend)

**Files Modified**:
- `src/app/booking/page.tsx` - Load structuredAmenities
- `src/app/api/properties/route.ts` - Return structuredAmenities
- `src/components/common/public/properties/PropertyCard.tsx` - Add interface field

**How to deploy**:

```bash
# Code is already pushed to GitHub (PR #12)
# Vercel will auto-deploy when PR is merged to main
# Or deploy manually:
vercel deploy --prod
```

## Verification Steps

After applying the migration and deploying the code:

1. **Local test**:
   ```bash
   npm run dev
   curl http://localhost:3000/api/properties?limit=1 | jq '.data.properties[0].structuredAmenities'
   ```

2. **Production test**:
   - Visit: `https://[nomedaempresa].lodgra.io/booking`
   - Check if amenities appear on property cards
   - Verify `/p/[slug]` detail page also shows amenities

3. **Database verification**:
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'property_amenities' AND policyname = 'property_amenities_select_public';
   ```

## Rollback

If needed, rollback the migration:

```bash
supabase db reset
# Or manually run the rollback script:
psql ... < supabase/rollback/20260611000000_property_amenities_public_policy_rollback.sql
```

## Timeline

- **PR Created**: 2026-06-11 17:44 UTC
- **Code Status**: Ready to merge (all tests passing)
- **Migration Status**: Ready to apply
- **Expected Timeline**:
  - Apply migration: immediate via CLI or dashboard
  - Merge PR to main: immediate
  - Vercel auto-deploy: ~5 minutes
  - Full availability: ~10 minutes

## Support

If Supabase CLI timeout persists:
1. Check network connectivity: `ping db.brjumbfpvijrkhrherpt.supabase.co`
2. Try Dashboard SQL editor (Option B above)
3. Contact Supabase support if connectivity issues persist
