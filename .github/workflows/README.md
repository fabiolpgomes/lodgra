# GitHub Actions Workflows

## Workflows

### e2e-tests.yml
**Purpose:** Run Playwright E2E tests on every PR and push

**Triggers:**
- Pull requests to `main` or `develop`
- Pushes to `main` or `develop`

**Steps:**
1. Checkout code
2. Setup Node.js 18
3. Install dependencies
4. Install Playwright browsers
5. Build Next.js app
6. Run E2E tests
7. Upload test reports and videos on failure
8. Comment PR with test results

**Artifacts:**
- `playwright-report/` — HTML test report (30 days)
- `test-results/` — Videos/screenshots (7 days, failure only)

**Required Secrets:**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_APP_URL`
- `TEST_USER_EMAIL`
- `TEST_USER_PASSWORD`
- `STRIPE_SECRET_KEY` (optional)
- `STRIPE_PRICE_ID` (optional)

**Setup Instructions:** See [E2E CI/CD Setup Guide](../guides/E2E_CI_CD_SETUP.md)

## Viewing Results

### In GitHub UI
1. Go to **Actions** tab
2. Click **E2E Tests** workflow
3. Click specific run to see details
4. View logs, artifacts, and annotations

### In Pull Request
1. Scroll to **Checks** section
2. Click **Details** next to "Playwright E2E Tests"
3. View test results and download artifacts

### Via GitHub CLI
```bash
# List recent runs
gh run list --workflow=e2e-tests.yml

# View specific run
gh run view <RUN_ID>

# View run logs
gh run view <RUN_ID> --log

# Download artifacts
gh run download <RUN_ID>
```

## Troubleshooting

See [E2E CI/CD Setup Guide — Troubleshooting](../guides/E2E_CI_CD_SETUP.md#troubleshooting)

## Configuration

### Retries
E2E tests automatically retry up to 2 times on failure in CI. This helps with flaky tests.

To adjust:
```yaml
# In e2e-tests.yml
retries: 3  # Change from 2 to 3
```

### Timeout
Default timeout: 30 minutes per workflow run

To adjust:
```yaml
timeout-minutes: 45  # Increase from 30 to 45
```

### Parallel Execution
Currently runs sequentially (1 worker). To enable parallel:

```typescript
// In playwright.config.ts
workers: process.env.CI ? 4 : undefined
```

## Branch Protection Rules

To require E2E tests pass before merge:

1. Go to **Settings** → **Branches**
2. Click **main** branch
3. Under "Require status checks to pass before merging"
4. Search for and select: **Playwright E2E Tests**
5. Check "Require branches to be up to date before merging"
6. Save changes

Now all PRs must pass E2E tests before merging.

## Performance

- **Install & build:** ~2-3 minutes
- **Test execution:** ~5-10 minutes
- **Upload artifacts:** ~1 minute
- **Total time:** ~8-14 minutes

To optimize:
- Use `actions/setup-node@v4` caching (already enabled)
- Limit test count if needed
- Use parallelization (advanced)

## Debugging Failed Tests

### 1. Check Test Logs
- Workflow run → E2E Tests → View logs
- Search for "FAIL" or specific test name

### 2. Download Artifacts
- Workflow run → Artifacts
- Download `playwright-report` for HTML report
- Download `playwright-videos` for failure videos

### 3. Local Reproduction
```bash
# Setup environment from GitHub Secrets
export NEXT_PUBLIC_SUPABASE_URL="..."
export NEXT_PUBLIC_SUPABASE_ANON_KEY="..."
# ... other secrets ...

# Run tests locally
npm run test:e2e

# Debug specific test
npx playwright test -g "test name" --debug
```

### 4. Update Tests
If tests need fixing:
1. Create new branch from your PR
2. Fix test in `e2e/commission-flow.spec.ts`
3. Push and verify CI passes
4. Merge to main

## Maintenance

### Monthly Tasks
- [ ] Review failed test runs
- [ ] Check test execution time trends
- [ ] Update test data if needed
- [ ] Review and update Playwright version

### Quarterly Tasks
- [ ] Update GitHub Actions versions
- [ ] Review artifact storage usage
- [ ] Audit GitHub Secrets
- [ ] Update test coverage goals

## Related Documentation

- [E2E CI/CD Setup Guide](../guides/E2E_CI_CD_SETUP.md)
- [Playwright Documentation](https://playwright.dev/)
- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [Story 6.1 — Commission Dashboard](../../docs/stories/6.1.story.md)

---

**Last Updated:** 2026-03-27
