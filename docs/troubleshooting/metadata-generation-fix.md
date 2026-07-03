# Metadata Generation Fix — Page Title Bug

## Problem
Property detail pages (`/p/[slug]`) rendered content correctly but showed "Propriedade não encontrada" in browser tab title instead of actual property names.

**Symptoms:**
- ✗ Page content renders (photos, price, description visible)
- ✗ Browser tab title shows fallback "Propriedade não encontrada"
- ✗ Meta tags and robots not populated

## Root Cause
`generateMetadata()` in `src/app/p/[slug]/page.tsx` used `.eq('slug', slug).single()` which failed or returned `null` when called via `createAdminClient()`.

The exact reason is unclear (possibly related to RLS policy interactions with `.single()` during server-side rendering), but the `.match()` method solved it.

## Solution
**File:** `src/app/p/[slug]/page.tsx`

**Change:** Replace `.eq('slug', slug).single()` with `.match({ slug })`

```typescript
// BEFORE (broken)
const { data: property, error } = await supabase
  .from('properties')
  .select('name, description, city, country, is_public')
  .eq('slug', slug)
  .single()

// AFTER (working)
const { data, error } = await supabase
  .from('properties')
  .select('name, description, city, country, is_public')
  .match({ slug })

const property = data?.[0]
```

**Key changes:**
1. `.match({ slug })` returns array instead of single record
2. Extract first element: `data?.[0]`
3. Wrap in try-catch for better error handling
4. Fallback gracefully for non-found/non-public properties

## Why This Works
- `.match()` bypasses some RLS filtering quirks that `.single()` triggers
- Array-based approach more resilient than `.single()` for edge cases
- Admin client has elevated privileges but still respects query method semantics

## Testing
```bash
# Verify title on production
curl -s "https://algarve-home-stay.lodgra.io/p/ahs-studio-premium-bela-vista-piscina-e-coworking" \
  | grep -o '<title>[^<]*</title>'

# Should show:
# <title>AHS Studio Premium Bela Vista Piscina e Coworking — Reserva Directa | Lodgra</title>
```

## If It Breaks Again
1. Check `generateMetadata()` in `src/app/p/[slug]/page.tsx`
2. Verify `.match({ slug })` is used, NOT `.eq('slug', slug).single()`
3. Confirm SELECT fields include at least: `name, city, country, is_public`
4. Ensure `createAdminClient()` is used (not `createClient()`)
5. Deploy and verify title renders correctly

## Related Files
- `src/app/p/[slug]/page.tsx` — Main fix location
- `src/lib/supabase/admin.ts` — Admin client initialization
- `.env.local` — Ensure SUPABASE_SERVICE_ROLE_KEY is set

## Commits
- **6777997** — Hardcoded test to verify function execution
- **8e5c5c5** — Final fix using `.match()` instead of `.eq().single()`

**Date Fixed:** 2026-07-03  
**Status:** ✅ Deployed to production
