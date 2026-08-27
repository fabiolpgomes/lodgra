/**
 * WhatsApp Automation Feature Flag Helper (Story 30.6)
 * Determines if organization has access to WhatsApp automation features
 */

import { createClient } from '@/lib/supabase/server';

interface FeatureCheckResult {
  enabled: boolean;
  reason: 'premium_plan' | 'expansao_plan' | 'addon_purchased' | 'disabled';
  message: string;
}

export async function hasWhatsAppAutomation(organizationId: string): Promise<FeatureCheckResult> {
  try {
    const supabase = await createClient();

    // Get organization with subscription info
    const { data: org, error } = await supabase
      .from('organizations')
      .select(
        `
        id,
        whatsapp_automation_enabled,
        subscriptions (
          id,
          plan,
          status
        )
      `
      )
      .eq('id', organizationId)
      .single();

    if (error || !org) {
      return {
        enabled: false,
        reason: 'disabled',
        message: 'Organização não encontrada',
      };
    }

    // Check explicit feature flag
    if (org.whatsapp_automation_enabled) {
      return {
        enabled: true,
        reason: 'addon_purchased',
        message: 'Automação WhatsApp ativa',
      };
    }

    // Check subscription plan
    const subscription = Array.isArray(org.subscriptions)
      ? org.subscriptions[0]
      : org.subscriptions;

    if (!subscription || subscription.status !== 'active') {
      return {
        enabled: false,
        reason: 'disabled',
        message: 'Sem subscrição ativa',
      };
    }

    // Premium plans include WhatsApp Automation
    if (subscription.plan === 'premium') {
      return {
        enabled: true,
        reason: 'premium_plan',
        message: 'Incluído no plano Premium',
      };
    }

    if (subscription.plan === 'expansao') {
      return {
        enabled: true,
        reason: 'expansao_plan',
        message: 'Incluído no plano Expansão',
      };
    }

    // Essential plan requires add-on
    return {
      enabled: false,
      reason: 'disabled',
      message: 'A Automação WhatsApp requer upgrade ou complemento',
    };
  } catch (error) {
    console.error('Erro ao verificar a funcionalidade de Automação WhatsApp:', error);
    return {
      enabled: false,
      reason: 'disabled',
      message: 'Erro ao verificar a disponibilidade da funcionalidade',
    };
  }
}

export function isEssentialPlan(plan?: string): boolean {
  return plan === 'essential' || plan === 'free';
}

export function canUpgradeToAutomation(plan?: string): boolean {
  return isEssentialPlan(plan);
}
