# E2E Test Setup Guide

## Current Status

E2E tests are failing because the test user account **does not exist** in Supabase or credentials don't match.

**Error:** `page.waitForURL: Timeout 15000ms exceeded` during login
**Root Cause:** Test user authentication failing

---

## What Needs to Be Done

### Step 1: Determine Test User Credentials

Get the credentials you set in GitHub Secrets:

```bash
gh secret list | grep TEST_USER
```

You should see:
- `TEST_USER_EMAIL` — Email address for test account
- `TEST_USER_PASSWORD` — Password for test account

### Step 2: Create Test User in Supabase

1. **Go to Supabase Dashboard**
   - URL: https://supabase.com/dashboard
   - Select your project

2. **Create New Auth User**
   - Click **Authentication** → **Users**
   - Click **Add user**
   - Enter:
     - **Email:** `{TEST_USER_EMAIL}` (from GitHub Secrets)
     - **Password:** `{TEST_USER_PASSWORD}` (from GitHub Secrets)
     - Confirm password
   - Click **Save user**

3. **Verify User Created**
   - User should appear in Users list
   - Note the **UID** (user ID) — you may need this later

### Step 3: Assign User to Organization

1. **Go to SQL Editor** in Supabase
2. **Run this query** (replace `{USER_ID}` with the UID from Step 3):

```sql
-- Get the organization ID (using default test org)
SELECT id FROM organizations LIMIT 1;

-- Insert user profile (replace USER_ID and ORG_ID)
INSERT INTO user_profiles (
  user_id,
  email,
  full_name,
  role,
  organization_id,
  created_at,
  updated_at
)
VALUES (
  '{USER_ID}',
  '{TEST_USER_EMAIL}',
  'E2E Test User',
  'admin',
  '{ORG_ID}',
  NOW(),
  NOW()
)
ON CONFLICT (user_id) DO NOTHING;
```

### Step 4: Verify Test User Can Login

**Locally (before pushing):**

```bash
# Start dev server
npm run dev

# Go to http://localhost:3000/login
# Sign in with test credentials
# Should redirect to dashboard
```

### Step 5: Re-run E2E Tests

Push a test commit to trigger workflow:

```bash
git push origin main
```

Check GitHub Actions → E2E Tests workflow

---

## E2E Test Architecture

### Test User Requirements

- **Email:** Must match `TEST_USER_EMAIL` GitHub Secret exactly
- **Password:** Must match `TEST_USER_PASSWORD` GitHub Secret exactly
- **Organization:** Must be assigned to an organization via `user_profiles` table
- **Role:** Minimum "viewer", recommended "admin" for full test coverage
- **Status:** Active (not disabled)

### Test Flow

1. **beforeEach hook** (pages.spec.ts:9-18, commission-flow.spec.ts:9-16)
   - Navigate to `/login`
   - Fill email and password fields
   - Click submit button
   - Wait for redirect to `/` (15 second timeout)

2. **Tests run** (if login succeeds)
   - Each test navigates to protected pages
   - Expects components to be visible

### Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| `Timeout 15000ms exceeded` | User doesn't exist or wrong credentials | Create user in Supabase with matching email/password |
| `Element(s) not found` | User exists but page not loading | Check organization assignment in user_profiles |
| `Error: invalid_credentials` | Password mismatch | Verify password in GitHub Secrets matches Supabase |
| Tests skip entirely | `TEST_USER_PASSWORD` not set | Ensure all 8 GitHub Secrets are configured |

---

## GitHub Actions Secrets Required

All secrets must be configured for E2E tests to run:

```
NEXT_PUBLIC_SUPABASE_URL        ✓ Required
NEXT_PUBLIC_SUPABASE_ANON_KEY   ✓ Required
SUPABASE_SERVICE_ROLE_KEY       ✓ Required
NEXT_PUBLIC_APP_URL             ✓ Required
TEST_USER_EMAIL                 ✓ Required
TEST_USER_PASSWORD              ✓ Required (test user must exist)
STRIPE_SECRET_KEY               ○ Optional
STRIPE_PRICE_ID                 ○ Optional
```

---

## Test User Lifecycle

### Creation
1. Create auth user in Supabase dashboard
2. Create corresponding user_profile row
3. Assign to organization

### Cleanup (Optional)
1. Delete user_profile row
2. Delete auth user from Supabase dashboard

### Why Separate Creation?
- Supabase Auth users are managed by Auth service
- User profiles are managed in your database
- Both must exist and be linked for tests to work

---

## Running Tests Locally

```bash
# Start dev server
npm run dev

# In another terminal, run tests
npm run test:e2e

# Or run specific test file
npx playwright test e2e/pages.spec.ts
```

---

## CI/CD Workflow

GitHub Actions automatically:
1. Reads TEST_USER_EMAIL and TEST_USER_PASSWORD from Secrets
2. Runs E2E tests against production app (or staging)
3. Uploads test report and videos (on failure)
4. Comments on PR with results

**Diagram:**
```
GitHub Actions
    ↓
  Build app
    ↓
  Install Playwright browsers
    ↓
  Run E2E tests (using TEST_USER credentials)
    ↓
  Upload artifacts
    ↓
  Comment on PR
```

---

## Next Steps

1. ✅ Verify GitHub Secrets are set correctly
2. ⏳ Create test user in Supabase (this is what's blocking now)
3. ⏳ Assign user to organization
4. ✅ Re-run E2E tests via GitHub Actions
5. ✅ Verify all tests pass

**You are currently on Step 2.**

---

## Support

If tests still fail after creating user:

1. Check browser console for auth errors
2. Verify user_profiles row exists
3. Verify organization assignment
4. Check RLS policies aren't blocking access

See full E2E setup guide: `docs/guides/E2E_CI_CD_SETUP.md`
