/**
 * WhatsApp Automation Feature Gate Middleware (Story 30.6)
 * Protects WhatsApp configuration routes based on subscription plan
 */

import { NextRequest, NextResponse } from 'next/server';
import { hasWhatsAppAutomation } from '@/lib/features/whatsapp-automation';

export async function whatsappAutomationGate(
  request: NextRequest,
  organizationId: string
): Promise<NextResponse | null> {
  try {
    const featureCheck = await hasWhatsAppAutomation(organizationId);

    if (!featureCheck.enabled) {
      return NextResponse.json(
        {
          error: 'WhatsApp Automation not available',
          reason: featureCheck.reason,
          message: featureCheck.message,
          upgrade_required: true,
        },
        { status: 403 }
      );
    }

    // Feature is enabled, allow request to proceed
    return null;
  } catch (error) {
    console.error('Error in whatsappAutomationGate:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
