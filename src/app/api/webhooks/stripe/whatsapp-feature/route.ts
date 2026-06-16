/**
 * Stripe Webhook Handler: Activate WhatsApp Automation on subscription changes
 * Triggered on: upgrade to Premium/Expansão, add-on purchase, cancellation
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, data } = body;

    // Verify webhook signature (in production, use stripe.webhooks.constructEvent)
    const stripeSignature = request.headers.get('stripe-signature');
    if (!stripeSignature) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
    }

    const supabase = await createClient();

    // Handle subscription events
    if (type === 'customer.subscription.updated') {
      const { customer, items } = data.object;
      const planId = items.data[0]?.plan.product;

      // Get organization by Stripe customer ID
      const { data: org } = await supabase
        .from('organizations')
        .select('id')
        .eq('stripe_customer_id', customer)
        .single();

      if (!org) return NextResponse.json({ success: true });

      // Check plan and enable feature
      const isPremium = planId === process.env.STRIPE_PREMIUM_PLAN_ID;
      const isExpansao = planId === process.env.STRIPE_EXPANSAO_PLAN_ID;

      if (isPremium || isExpansao) {
        await supabase
          .from('organizations')
          .update({ whatsapp_automation_enabled: true })
          .eq('id', org.id);

        console.log(`✅ WhatsApp Automation enabled for org ${org.id} (${isPremium ? 'Premium' : 'Expansão'})`);
      }
    }

    // Handle add-on purchase
    if (type === 'invoice.payment_succeeded') {
      const { customer, lines } = data.object;

      // Check if invoice contains WhatsApp add-on
      const hasWhatsAppAddon = lines.data.some(
        (line: Record<string, unknown>) =>
          (line.price as Record<string, unknown>).product === process.env.STRIPE_WHATSAPP_ADDON_ID
      );

      if (hasWhatsAppAddon) {
        const { data: org } = await supabase
          .from('organizations')
          .select('id')
          .eq('stripe_customer_id', customer)
          .single();

        if (org) {
          await supabase
            .from('organizations')
            .update({ whatsapp_automation_enabled: true })
            .eq('id', org.id);

          console.log(`✅ WhatsApp Automation enabled for org ${org.id} (add-on purchase)`);
        }
      }
    }

    // Handle subscription cancellation
    if (type === 'customer.subscription.deleted') {
      const { customer, items } = data.object;
      const planId = items.data[0]?.plan.product;

      // Only disable if plan was Essential (Premium/Expansão auto-include feature)
      const isEssential = planId !== process.env.STRIPE_PREMIUM_PLAN_ID &&
                         planId !== process.env.STRIPE_EXPANSAO_PLAN_ID;

      if (isEssential) {
        const { data: org } = await supabase
          .from('organizations')
          .select('id')
          .eq('stripe_customer_id', customer)
          .single();

        if (org) {
          // Check if they have active add-on subscription
          const { data: addOnSub } = await supabase
            .from('subscriptions')
            .select('id')
            .eq('organization_id', org.id)
            .eq('product_id', process.env.STRIPE_WHATSAPP_ADDON_ID)
            .eq('status', 'active')
            .single();

          // Only disable if no active add-on
          if (!addOnSub) {
            await supabase
              .from('organizations')
              .update({ whatsapp_automation_enabled: false })
              .eq('id', org.id);

            console.log(`⛔ WhatsApp Automation disabled for org ${org.id} (subscription cancelled)`);
          }
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Stripe webhook error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
