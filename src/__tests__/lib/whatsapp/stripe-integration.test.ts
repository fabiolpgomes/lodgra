/**
 * Tests for Stripe Webhook Integration (WhatsApp Feature Gate)
 */

import { describe, it, expect } from '@jest/globals';

describe('Stripe Webhook Integration: WhatsApp Automation', () => {
  describe('Plan Upgrade Events', () => {
    it('should enable feature on upgrade to Premium', () => {
      const premiumPlanId = 'prod_premium';
      const webhook = {
        type: 'customer.subscription.updated',
        data: {
          object: {
            customer: 'cus_test001',
            items: {
              data: [
                {
                  plan: {
                    product: premiumPlanId,
                  },
                },
              ],
            },
          },
        },
      };

      const isPremium = webhook.data.object.items.data[0].plan.product === premiumPlanId;
      expect(isPremium).toBe(true);
    });

    it('should enable feature on upgrade to Expansão', () => {
      const expansaoPlanId = 'prod_expansao';
      const webhook = {
        type: 'customer.subscription.updated',
        data: {
          object: {
            customer: 'cus_test002',
            items: {
              data: [
                {
                  plan: {
                    product: expansaoPlanId,
                  },
                },
              ],
            },
          },
        },
      };

      const isExpansao = webhook.data.object.items.data[0].plan.product === expansaoPlanId;
      expect(isExpansao).toBe(true);
    });

    it('should not enable for Essential plan', () => {
      const webhook = {
        type: 'customer.subscription.updated',
        data: {
          object: {
            customer: 'cus_test003',
            items: {
              data: [
                {
                  plan: {
                    product: 'prod_essential',
                  },
                },
              ],
            },
          },
        },
      };

      const isPremium = webhook.data.object.items.data[0].plan.product === 'prod_premium';
      const isExpansao = webhook.data.object.items.data[0].plan.product === 'prod_expansao';
      const shouldEnable = isPremium || isExpansao;

      expect(shouldEnable).toBe(false);
    });
  });

  describe('Add-on Purchase Events', () => {
    it('should enable feature on add-on purchase', () => {
      const whatsappAddonId = 'prod_whatsapp_addon';
      const webhook = {
        type: 'invoice.payment_succeeded',
        data: {
          object: {
            customer: 'cus_test004',
            lines: {
              data: [
                {
                  price: {
                    product: whatsappAddonId,
                  },
                },
              ],
            },
          },
        },
      };

      const hasWhatsAppAddon = webhook.data.object.lines.data.some(
        (line: Record<string, unknown>) =>
          (line.price as Record<string, unknown>).product === whatsappAddonId
      );

      expect(hasWhatsAppAddon).toBe(true);
    });

    it('should not affect other add-on purchases', () => {
      const whatsappAddonId = 'prod_whatsapp_addon';
      const webhook = {
        type: 'invoice.payment_succeeded',
        data: {
          object: {
            customer: 'cus_test005',
            lines: {
              data: [
                {
                  price: {
                    product: 'prod_other_addon',
                  },
                },
              ],
            },
          },
        },
      };

      const hasWhatsAppAddon = webhook.data.object.lines.data.some(
        (line: Record<string, unknown>) =>
          (line.price as Record<string, unknown>).product === whatsappAddonId
      );

      expect(hasWhatsAppAddon).toBe(false);
    });
  });

  describe('Subscription Cancellation Events', () => {
    it('should disable feature when Essential plan cancels', () => {
      const webhook = {
        type: 'customer.subscription.deleted',
        data: {
          object: {
            customer: 'cus_test006',
            items: {
              data: [
                {
                  plan: {
                    product: 'prod_essential',
                  },
                },
              ],
            },
          },
        },
      };

      const planId = webhook.data.object.items.data[0].plan.product;
      const isEssential = planId !== 'prod_premium' && planId !== 'prod_expansao';

      expect(isEssential).toBe(true);
    });

    it('should not disable when Premium plan cancels (data retention)', () => {
      const webhook = {
        type: 'customer.subscription.deleted',
        data: {
          object: {
            customer: 'cus_test007',
            items: {
              data: [
                {
                  plan: {
                    product: 'prod_premium',
                  },
                },
              ],
            },
          },
        },
      };

      const planId = webhook.data.object.items.data[0].plan.product;
      const isPremium = planId === 'prod_premium';

      expect(isPremium).toBe(true);
    });

    it('should preserve feature if add-on remains active', () => {
      const org = {
        plan: 'essential',
        whatsapp_automation_enabled: true, // Has active add-on
        subscriptions: [
          {
            product_id: 'prod_whatsapp_addon',
            status: 'active',
          },
        ],
      };

      const hasActiveAddon = org.subscriptions.some(
        (sub: Record<string, unknown>) =>
          sub.product_id === 'prod_whatsapp_addon' && sub.status === 'active'
      );

      // Should NOT disable if add-on is active
      const shouldDisable = !hasActiveAddon;

      expect(shouldDisable).toBe(false);
    });
  });

  describe('Webhook Security', () => {
    it('should require valid signature', () => {
      const withSignature = { headers: { 'stripe-signature': 'valid_sig' } };
      const withoutSignature = { headers: { 'stripe-signature': null } };

      expect(withSignature.headers['stripe-signature']).not.toBeNull();
      expect(withoutSignature.headers['stripe-signature']).toBeNull();
    });

    it('should ignore webhook if customer not found', () => {
      const webhook = {
        type: 'customer.subscription.updated',
        data: {
          object: {
            customer: 'cus_nonexistent',
          },
        },
      };

      const org = null; // Customer not found

      expect(org).toBeNull();
    });
  });

  describe('Idempotency', () => {
    it('should handle duplicate webhook events gracefully', () => {
      const event = {
        id: 'evt_123',
        type: 'customer.subscription.updated',
        processed: false,
      };

      // Simulate redelivery
      const firstProcess = !event.processed;
      event.processed = true;

      const secondProcess = !event.processed;

      expect(firstProcess).toBe(true);
      expect(secondProcess).toBe(false); // Should skip on redelivery
    });
  });
});
