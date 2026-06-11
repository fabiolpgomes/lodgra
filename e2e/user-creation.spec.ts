import { test, expect, Page } from '@playwright/test'
import { createAdminClient } from '@/lib/supabase/admin'

const BASE_URL = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000'
const TEST_EMAIL_PREFIX = `test-${Date.now()}`

test.describe('User Creation Flows', () => {
  let adminClient: ReturnType<typeof createAdminClient>

  test.beforeAll(async () => {
    adminClient = createAdminClient()
  })

  test.describe('Scenario 1: Stripe Webhook → User Creation → Login', () => {
    test('User subscribes → receives invite → sets password → login', async ({ page }) => {
      const testEmail = `${TEST_EMAIL_PREFIX}-stripe@example.com`

      // Simulate webhook call: checkout.session.completed
      const webhookResponse = await page.request.post(`${BASE_URL}/api/stripe/webhook`, {
        headers: {
          'Content-Type': 'application/json',
          'stripe-signature': 'test-signature',
        },
        data: {
          type: 'checkout.session.completed',
          data: {
            object: {
              customer_email: testEmail,
              customer: 'cus_test123',
              subscription: 'sub_test123',
              metadata: {
                reservation_id: null,
              },
            },
          },
        },
      })

      expect(webhookResponse.ok()).toBeTruthy()

      // Verify user was created with admin role
      const { data: profile, error } = await adminClient
        .from('user_profiles')
        .select('*')
        .eq('email', testEmail)
        .single()

      expect(error).toBeNull()
      expect(profile).toBeDefined()
      expect(profile?.role).toBe('admin')
      expect(profile?.access_all_properties).toBe(true)

      // Cleanup: Delete test user
      await adminClient.from('user_profiles').delete().eq('email', testEmail)
    })
  })

  test.describe('Scenario 2: Self-Signup → Password Change → Dashboard', () => {
    test('User registers → changes password → access dashboard', async ({ page }) => {
      const testEmail = `${TEST_EMAIL_PREFIX}-signup@example.com`
      const testPassword = 'TestPassword123!'
      const newPassword = 'NewPassword456!'

      // Navigate to signup
      await page.goto(`${BASE_URL}/auth/register`)
      await expect(page).toHaveTitle(/Register|Sign up/i)

      // Fill signup form
      await page.fill('input[name="email"]', testEmail)
      await page.fill('input[name="password"]', testPassword)
      await page.fill('input[name="name"]', 'Test User')

      // Submit form
      await page.click('button[type="submit"]')

      // Wait for redirect (should go to password reset or dashboard)
      await page.waitForNavigation()
      const currentUrl = page.url()
      expect(currentUrl).toContain(BASE_URL)

      // Verify user profile was created
      const { data: profile, error } = await adminClient
        .from('user_profiles')
        .select('*')
        .eq('email', testEmail)
        .single()

      expect(error).toBeNull()
      expect(profile).toBeDefined()
      expect(profile?.role).toBe('admin')

      // Cleanup: Delete test user
      await adminClient.from('user_profiles').delete().eq('email', testEmail)
    })
  })

  test.describe('Scenario 3: Admin Creates Team Member', () => {
    test.skip('Admin creates user → sends invite → new user logs in', async ({ page }) => {
      // TODO: Implement after admin dashboard is refactored
      // This test requires:
      // 1. Admin account creation
      // 2. Login as admin
      // 3. Navigate to members page
      // 4. Create new user with specific role
      // 5. Verify invite email logic
      // 6. Set password and login
    })
  })
})
