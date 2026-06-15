/**
 * WhatsApp Webhook
 * AC4: GET — webhook verification (challenge)
 * AC5: POST — status updates from Meta
 */

import { NextRequest, NextResponse } from 'next/server';
import { updateMessageStatus } from '@/lib/whatsapp/client';

const WEBHOOK_VERIFY_TOKEN = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'test-token';

/**
 * AC4: Webhook verification endpoint
 * GET /api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=TOKEN&hub.challenge=CHALLENGE
 */
export async function GET(request: NextRequest) {
  try {
    const mode = request.nextUrl.searchParams.get('hub.mode');
    const token = request.nextUrl.searchParams.get('hub.verify_token');
    const challenge = request.nextUrl.searchParams.get('hub.challenge');

    // Validate webhook token
    if (mode === 'subscribe' && token === WEBHOOK_VERIFY_TOKEN) {
      if (!challenge) {
        return NextResponse.json({ error: 'Challenge required' }, { status: 400 });
      }

      console.log('[WhatsApp] Webhook verified');
      return new NextResponse(challenge);
    }

    console.warn('[WhatsApp] Webhook verification failed - invalid token');
    return NextResponse.json({ error: 'Invalid token' }, { status: 403 });
  } catch (error) {
    console.error('[WhatsApp] Webhook GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * AC5: Webhook status updates
 * POST /api/webhooks/whatsapp
 * Body: { object: 'whatsapp_business_account', entry: [...] }
 */
export async function POST(request: NextRequest) {
  try {
    const data = await request.json() as WebhookPayload;

    // Validate webhook payload structure
    if (data.object !== 'whatsapp_business_account') {
      console.warn('[WhatsApp] Invalid webhook object type:', data.object);
      return NextResponse.json({ error: 'Invalid object type' }, { status: 400 });
    }

    // Process all entries
    if (!Array.isArray(data.entry)) {
      return NextResponse.json({ success: true });
    }

    for (const entry of data.entry) {
      if (!Array.isArray(entry.changes)) continue;

      for (const change of entry.changes) {
        if (change.field !== 'messages') continue;

        const value = change.value;
        if (!value) continue;

        // Process statuses
        if (Array.isArray(value.statuses)) {
          for (const status of value.statuses) {
            await handleStatusUpdate(status);
          }
        }

        // Process message receipts (acknowledge)
        if (Array.isArray(value.messages)) {
          for (const message of value.messages) {
            console.log('[WhatsApp] Received message:', {
              id: message.id,
              from: message.from,
              timestamp: message.timestamp,
              type: message.type,
            });
          }
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[WhatsApp] Webhook POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Handle status update from Meta
 */
async function handleStatusUpdate(statusUpdate: WebhookStatus) {
  const { id, status, errors } = statusUpdate;

  console.log('[WhatsApp] Status update:', { id, status });

  try {
    if (status === 'failed' && errors && errors.length > 0) {
      await updateMessageStatus(id, 'failed', errors[0].message);
    } else if (status === 'delivered') {
      await updateMessageStatus(id, 'delivered');
    } else if (status === 'read') {
      await updateMessageStatus(id, 'read');
    }
  } catch (error) {
    console.error('[WhatsApp] Failed to handle status update:', error);
  }
}

/**
 * Type definitions for webhook payload
 */
interface WebhookPayload {
  object: string;
  entry: WebhookEntry[];
}

interface WebhookEntry {
  id: string;
  changes: WebhookChange[];
}

interface WebhookChange {
  field: string;
  value: WebhookValue;
}

interface WebhookValue {
  messages?: WebhookMessage[];
  statuses?: WebhookStatus[];
  [key: string]: unknown;
}

interface WebhookMessage {
  id: string;
  from: string;
  timestamp: string;
  type: string;
  text?: { body: string };
  [key: string]: unknown;
}

interface WebhookStatus {
  id: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp?: string;
  recipient_id?: string;
  errors?: Array<{ code: number; title: string; message: string }>;
}
