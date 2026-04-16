# E2E Tests — Quick Reference

## Running Tests Locally

```bash
# Install dependencies first (if not done)
npm install

# Run tests in UI mode (recommended for development)
npm run test:e2e:ui

# Run tests headless (background)
npm run test:e2e

# Run specific test file
npx playwright test e2e/commission-flow.spec.ts

# Run specific test by name
npx playwright test -g "Commission dashboard"

# Debug mode (step-through debugging)
npx playwright test --debug

# Update snapshots
npx playwright test --update-snapshots
```

## Viewing Results

```bash
# Open HTML report after tests run
npx playwright show-report

# View test videos (on failure)
ls test-results/
```

## GitHub Actions

### Trigger E2E Tests
- Push to `main` or `develop` branch
- Create/update PR to `main` or `develop` branch
- Or manually trigger from GitHub Actions UI

### Check Results
1. Go to **Actions** tab
2. Click **E2E Tests** workflow
3. Click specific run
4. View "Playwright E2E Tests" job

### Download Artifacts
- Workflow run → Artifacts
- Download `playwright-report` (HTML results)
- Download `playwright-videos` (failure recordings)

## Common Tasks

### Add New Test
```typescript
test('new test name', async ({ page }) => {
  await page.goto('/path')
  await expect(page.locator('selector')).toBeVisible()
})
```

Then run: `npm run test:e2e:ui`

### Fix Failing Test
1. Open test in UI mode: `npm run test:e2e:ui`
2. Click failing test
3. See exact failure point
4. Update locators or assertions
5. Re-run test

### Debug in Browser
```bash
npx playwright test --debug --headed
```
- Opens browser with DevTools
- Step through test
- Inspect DOM in real-time

### Check Browser Compatibility
Currently testing **Chromium** only. To add others:

Edit `playwright.config.ts`:
```typescript
projects: [
  { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
  { name: 'webkit', use: { ...devices['Desktop Safari'] } },
]
```

## GitHub Secrets

### List Secrets
```bash
gh secret list
```

### Update Secret
```bash
gh secret set SECRET_NAME --body "new_value"
```

### Delete Secret
```bash
gh secret delete SECRET_NAME
```

### Required Secrets for CI/CD
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_APP_URL
TEST_USER_EMAIL
TEST_USER_PASSWORD
STRIPE_SECRET_KEY (optional)
STRIPE_PRICE_ID (optional)
```

## Performance Tips

### Speed Up Local Tests
```bash
# Single worker (faster)
npx playwright test --workers=1

# Headed mode (see browser)
npx playwright test --headed

# Specific project only
npx playwright test --project=chromium
```

### Reduce CI Time
- Run only affected tests
- Disable videos/screenshots for passing tests
- Use parallel workers (advanced)

## Troubleshooting

### Tests Pass Locally, Fail in CI
- Check environment variables match secrets
- Verify test data exists in Supabase
- Check for hardcoded URLs (use `baseURL`)

### "Port 3000 already in use"
```bash
# Kill process using port 3000
lsof -i :3000 | grep node | awk '{print $2}' | xargs kill -9
```

### "Timeout waiting for server"
```bash
# Manually start server in another terminal
npm run build
npm run start
```

### "Page could not be opened"
- Check network connectivity
- Verify app is running
- Check baseURL in config

## Test Structure

```typescript
import { test, expect } from '@playwright/test'

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    // Setup: navigate, login, etc.
  })

  test('test case name', async ({ page }) => {
    // Arrange: setup state
    // Act: perform action
    // Assert: verify result
    await expect(page.locator('selector')).toBeVisible()
  })

  test('another case', async ({ page }) => {
    // Another test
  })
})
```

## Assertions Cheat Sheet

```typescript
// Visibility
await expect(locator).toBeVisible()
await expect(locator).toBeHidden()

// Content
await expect(locator).toHaveText('text')
await expect(locator).toContainText('partial')

// Value
await expect(input).toHaveValue('value')
await expect(input).toHaveAttribute('class', /value/)

// Count
expect(await locator.count()).toBe(5)

// State
await expect(button).toBeEnabled()
await expect(button).toBeDisabled()
```

## Selectors Guide

```typescript
// By text
page.locator('text=Login')
page.locator('button:has-text("Submit")')

// By role (recommended)
page.getByRole('button', { name: 'Submit' })
page.getByRole('heading', { name: 'Title' })

// By placeholder
page.getByPlaceholder('Email')

// By label
page.getByLabel('Email')

// CSS
page.locator('.className')
page.locator('#elementId')

// XPath (last resort)
page.locator('//button[@class="submit"]')
```

## Useful Links

- [Playwright Docs](https://playwright.dev/)
- [Selectors API](https://playwright.dev/docs/selectors)
- [Assertions](https://playwright.dev/docs/assertions)
- [Debugging Guide](https://playwright.dev/docs/debug)
- [CI/CD Setup](./E2E_CI_CD_SETUP.md)

---

**Status:** ✅ Ready to use
**Last Updated:** 2026-03-27
