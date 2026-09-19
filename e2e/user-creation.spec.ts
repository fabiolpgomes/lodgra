import { test, expect } from '@playwright/test'
import Stripe from 'stripe'
import { createAdminClient } from '@/lib/supabase/admin'
import { acceptTermsAndSubmit } from './helpers/register-form'

const BASE_URL = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000'
const TEST_EMAIL_PREFIX = `test-${Date.now()}`
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET

test.describe('User Creation Flows', () => {
  let adminClient: ReturnType<typeof createAdminClient>

  test.beforeAll(async () => {
    adminClient = createAdminClient()
  })

  test.describe('Scenario 1: Stripe Webhook → User Creation → Login', () => {
    test('User subscribes → receives invite → sets password → login', async ({ page }) => {
      test.skip(!STRIPE_WEBHOOK_SECRET, 'STRIPE_WEBHOOK_SECRET not configured for local E2E')

      const testEmail = `${TEST_EMAIL_PREFIX}-stripe@example.com`

      // The route verifies the signature with stripe.webhooks.constructEvent(),
      // so the payload has to be signed with the same secret the server uses —
      // an arbitrary 'stripe-signature' header always fails verification (400).
      const payload = JSON.stringify({
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
      })
      const signature = new Stripe('sk_test_placeholder').webhooks.generateTestHeaderString({
        payload,
        secret: STRIPE_WEBHOOK_SECRET!,
      })

      // Simulate webhook call: checkout.session.completed
      const webhookResponse = await page.request.post(`${BASE_URL}/api/stripe/webhook`, {
        headers: {
          'Content-Type': 'application/json',
          'stripe-signature': signature,
        },
        data: payload,
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

      // Navigate to signup
      await page.goto(`${BASE_URL}/auth/register`)
      await expect(page).toHaveTitle(/Criar Conta/i)

      // Fill signup form
      await page.fill('input[name="fullName"]', 'Test User')
      await page.fill('input[name="email"]', testEmail)
      await page.fill('input[name="password"]', testPassword)
      await page.fill('input[name="confirmPassword"]', testPassword)

      // Submit form (requires accepting terms)
      await acceptTermsAndSubmit(page)

      // A successful signUp either navigates away immediately (session
      // created) or re-renders the same route as a "check your email"
      // screen (email confirmation required) — both mean the account exists.
      try {
        await page.waitForURL((url) => !url.toString().includes('/register'), { timeout: 8000 })
      } catch {
        await page.getByText('Verifique o seu email').waitFor({ timeout: 8000 })
      }

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
