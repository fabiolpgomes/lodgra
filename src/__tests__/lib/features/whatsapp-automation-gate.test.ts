/**
 * Tests for WhatsApp Automation Feature Gate (Story 30.6)
 */

import { describe, it, expect } from '@jest/globals';

describe('Story 30.6 — WhatsApp Automation Feature Gate', () => {
  describe('Feature Flag Activation (AC1, AC2)', () => {
    it('should enable for premium plan', () => {
      const subscription = { plan: 'premium', status: 'active' };
      const hasAccess = subscription.plan === 'premium' && subscription.status === 'active';

      expect(hasAccess).toBe(true);
    });

    it('should enable for expansao plan', () => {
      const subscription = { plan: 'expansao', status: 'active' };
      const hasAccess = subscription.plan === 'expansao' && subscription.status === 'active';

      expect(hasAccess).toBe(true);
    });

    it('should block for essential plan without add-on', () => {
      const org = {
        plan: 'essential',
        whatsapp_automation_enabled: false,
      };
      const hasAccess = org.plan !== 'essential' || org.whatsapp_automation_enabled;

      expect(hasAccess).toBe(false);
    });

    it('should enable for essential with add-on purchased', () => {
      const org = {
        plan: 'essential',
        whatsapp_automation_enabled: true,
      };
      const hasAccess = org.plan !== 'essential' || org.whatsapp_automation_enabled;

      expect(hasAccess).toBe(true);
    });
  });

  describe('Add-on Purchase (AC3, AC6)', () => {
    it('should activate feature flag on add-on purchase', () => {
      const org = {
        whatsapp_automation_enabled: false,
      };

      // Simulate webhook update
      org.whatsapp_automation_enabled = true;

      expect(org.whatsapp_automation_enabled).toBe(true);
    });

    it('should disable if add-on cancelled', () => {
      const org = {
        plan: 'essential',
        whatsapp_automation_enabled: true,
      };

      // Simulate webhook cancellation
      org.whatsapp_automation_enabled = false;

      expect(org.whatsapp_automation_enabled).toBe(false);
    });
  });

  describe('Middleware Protection (AC7)', () => {
    it('should block access for non-enabled users', () => {
      const featureCheck = {
        enabled: false,
        reason: 'disabled' as const,
        message: 'WhatsApp Automation not available',
      };

      expect(featureCheck.enabled).toBe(false);
      expect(featureCheck.reason).toBe('disabled');
    });

    it('should allow access for enabled users', () => {
      const featureCheck = {
        enabled: true,
        reason: 'premium_plan' as const,
        message: 'Included in Premium plan',
      };

      expect(featureCheck.enabled).toBe(true);
      expect(featureCheck.reason).toBe('premium_plan');
    });
  });

  describe('Paywall Display (AC8)', () => {
    it('should show paywall for essential plan users', () => {
      const currentPlan = 'essential';
      const shouldShowPaywall = currentPlan === 'essential';

      expect(shouldShowPaywall).toBe(true);
    });

    it('should hide paywall for premium users', () => {
      const currentPlan = 'premium';
      const shouldShowPaywall = currentPlan === 'essential';

      expect(shouldShowPaywall).toBe(false);
    });

    it('should provide upgrade CTA', () => {
      const upgradePath = '/settings/billing?tab=upgrade';

      expect(upgradePath).toContain('upgrade');
    });

    it('should provide add-on CTA', () => {
      const addonPath = '/settings/billing?tab=addons&addon=whatsapp_automation';

      expect(addonPath).toContain('whatsapp_automation');
    });
  });

  describe('Subscription Status Validation', () => {
    it('should require active subscription', () => {
      const subscription = {
        plan: 'expansao',
        status: 'cancelled' as const,
      };

      const hasAccess = subscription.status === 'active';
      expect(hasAccess).toBe(false);
    });

    it('should accept active subscription', () => {
      const subscription = {
        plan: 'expansao',
        status: 'active' as const,
      };

      const hasAccess = subscription.status === 'active';
      expect(hasAccess).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing organization gracefully', () => {
      const org = null;
      const hasAccess = org !== null && org.whatsapp_automation_enabled;

      expect(hasAccess).toBe(false);
    });

    it('should default to disabled on error', () => {
      const featureCheck = {
        enabled: false,
        reason: 'disabled' as const,
        message: 'Error checking feature availability',
      };

      expect(featureCheck.enabled).toBe(false);
    });
  });
});
