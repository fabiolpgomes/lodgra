# Google Service Account Credential Rotation

## Overview

Lodgra uses Google Service Accounts to authenticate with Google My Business API for syncing reviews. This document explains how to rotate credentials when they expire or need to be renewed.

---

## When to Rotate Credentials

- **Regular rotation:** Every 90 days (security best practice)
- **Key expiration:** Google service account keys expire after 10 years by default, but should be rotated sooner
- **Security incident:** If credentials are compromised, rotate immediately
- **CI/CD migration:** When updating deployment environments

---

## Step 1: Generate New Service Account Key

### In Google Cloud Console:

1. Navigate to **IAM & Admin** → **Service Accounts**
2. Select the service account: `lodgra-reviews-sync` (or similar)
3. Go to the **Keys** tab
4. Click **Create new key** → **JSON** format
5. Download the new JSON key file

Example key file structure:
```json
{
  "type": "service_account",
  "project_id": "lodgra-gcp-project",
  "private_key_id": "new-key-id-xyz",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "lodgra-reviews-sync@lodgra-gcp-project.iam.gserviceaccount.com",
  "client_id": "123456789",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs"
}
```

---

## Step 2: Update Environment Variables

### Option A: Path-based (Current Implementation)

If using `GOOGLE_SERVICE_ACCOUNT_PATH`:

```bash
# Development
1. Replace the key file at the path specified in .env.local
2. Test locally: npm run test:reviews

# Staging/Production (Vercel)
1. Update the Vercel environment variable:
   vercel env add GOOGLE_SERVICE_ACCOUNT_PATH
   # Or via Vercel dashboard: Project Settings → Environment Variables
2. Upload the new key file to Vercel Blob Storage or a secure location
3. Update GOOGLE_SERVICE_ACCOUNT_PATH to point to the new location
```

### Option B: Individual Env Vars (Alternative)

If you prefer to break down the key into individual env vars:

```bash
# Extract values from downloaded JSON key
GOOGLE_SERVICE_ACCOUNT_EMAIL="lodgra-reviews-sync@lodgra-gcp-project.iam.gserviceaccount.com"
GOOGLE_SERVICE_ACCOUNT_KEY_ID="new-key-id-xyz"
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Update in Vercel:
vercel env add GOOGLE_SERVICE_ACCOUNT_EMAIL
vercel env add GOOGLE_SERVICE_ACCOUNT_KEY_ID
vercel env add GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
```

---

## Step 3: Test New Credentials

### Local Testing:

```bash
# Set new key in .env.local
export GOOGLE_SERVICE_ACCOUNT_PATH="/path/to/new-key.json"

# Run reviews sync test
npm run test -- src/__tests__/api/reviews/sync.e2e.test.ts

# Trigger manual sync (if endpoint available)
curl -X POST http://localhost:3000/api/reviews/sync \
  -H "Authorization: Bearer YOUR_REVIEWS_SYNC_SECRET"
```

### Staging Testing:

```bash
# Deploy to staging
vercel --env staging

# Monitor sync job
# Check Vercel logs: https://vercel.com/project-settings/analytics
# Check Sentry: https://sentry.io/organizations/lodgra/issues/

# Wait for next scheduled cron (02:00 UTC)
# Or trigger manually if endpoint allows
```

---

## Step 4: Deactivate Old Key

### In Google Cloud Console:

1. Go back to **Service Accounts** → **Keys**
2. Find the old key
3. Click the **Delete** button (🗑️)
4. Confirm deletion

⚠️ **Warning:** Deleting the old key will immediately break any services still using it. Ensure all deployments are updated first.

---

## Step 5: Verify Rotation Success

### Checklist:

- [ ] New key generates JWT token successfully
- [ ] Google My Business API accepts the new credentials
- [ ] Reviews sync endpoint returns 200 OK
- [ ] Sentry shows no authentication errors
- [ ] Old key is deleted from Google Cloud Console
- [ ] Team members notified of credential change

### Monitoring:

- Watch Vercel logs for 24 hours to ensure no authentication failures
- Check Sentry for any JWT signing errors
- Verify at least one successful sync cycle completes

---

## Troubleshooting

### "Invalid Service Account" Error

**Symptom:** `403 Forbidden` or `401 Unauthorized`

**Cause:** Service account lacks required scopes or roles

**Fix:**
```
1. Go to IAM & Admin → Service Accounts
2. Click on the service account
3. Grant role: "Merchant Center Editor" or "Business.Manage"
4. Retry sync
```

### "Key File Not Found" Error

**Symptom:** `Error: ENOENT: no such file or directory`

**Cause:** `GOOGLE_SERVICE_ACCOUNT_PATH` points to wrong location

**Fix:**
```bash
# Verify path exists
ls -la /path/to/key.json

# Update env var in Vercel
vercel env ls
vercel env add GOOGLE_SERVICE_ACCOUNT_PATH
```

### "Quota Exceeded" Error

**Symptom:** `429 Too Many Requests`

**Cause:** Service account rate limit (1000 req/min) exceeded

**Fix:**
- Wait 1 minute
- Check GoogleClient.ts for exponential backoff (should handle this)
- Verify only one sync job is running

---

## Security Best Practices

1. **Never commit keys to git**
   ```bash
   # Verify .env files are in .gitignore
   cat .gitignore | grep .env
   ```

2. **Store keys securely**
   - Use Vercel Environment Variables (encrypted at rest)
   - Use GitHub Secrets for CI/CD pipelines
   - Use Google Cloud Secret Manager for production

3. **Limit key scope**
   - Service account should only have "Business.Manage" scope (minimal)
   - Avoid using "Editor" or "Owner" roles

4. **Audit key usage**
   - Google Cloud Console logs all API calls
   - Monitor Sentry for auth failures
   - Check Vercel logs for sync errors

5. **Rotate regularly**
   - Set a calendar reminder for 90 days
   - Document rotation dates in this file

---

## Rotation Schedule

| Date | Old Key ID | New Key ID | Status |
|------|-----------|-----------|--------|
| 2026-06-06 | (initial) | xyz-2026-06 | ✅ Active |
| TBD | xyz-2026-06 | (next) | ⏳ Scheduled |

---

## Questions?

- **Team:** Ask in #infrastructure Slack channel
- **Google Cloud:** Check Google Cloud documentation: https://cloud.google.com/docs/authentication/getting-started#create_service_account
- **Vercel:** Check Vercel docs: https://vercel.com/docs/concepts/projects/environment-variables
