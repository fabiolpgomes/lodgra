/**
 * WhatsApp Message Templates API (Story 30.2)
 * GET: List templates for organization
 * POST: Create/update template
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/requireRole';
import { createClient } from '@/lib/supabase/server';
import { getDefaultTemplate, validateRequiredVariables } from '@/lib/whatsapp/default-templates';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireRole(['admin', 'gestor']);
    if (!auth.authorized) return auth.response!;

    const organizationId = auth.organizationId;
    if (!organizationId) {
      return NextResponse.json({ error: 'No organization found' }, { status: 400 });
    }

    const supabase = await createClient();
    const language = request.nextUrl.searchParams.get('language') || 'pt-BR';

    // Get custom templates for this org
    const { data: customTemplates, error } = await supabase
      .from('whatsapp_message_templates')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('language', language);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      templates: customTemplates || [],
      language,
    });
  } catch (error) {
    console.error('GET /api/whatsapp-templates error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireRole(['admin', 'gestor']);
    if (!auth.authorized) return auth.response!;

    const organizationId = auth.organizationId;
    if (!organizationId) {
      return NextResponse.json({ error: 'No organization found' }, { status: 400 });
    }

    const { template_key, language, body } = await request.json() as {
      template_key: string;
      language: string;
      body: string;
    };

    if (!template_key || !body) {
      return NextResponse.json(
        { error: 'template_key and body are required' },
        { status: 400 }
      );
    }

    // Validate required variables (AC2, AC10)
    const validation = validateRequiredVariables(body);
    if (!validation.valid) {
      return NextResponse.json(
        {
          error: 'Missing required variables',
          missing: validation.missing,
        },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const { data, error } = await supabase
      .from('whatsapp_message_templates')
      .upsert(
        {
          organization_id: organizationId,
          template_key,
          language: language || 'pt-BR',
          body,
          is_custom: true,
        },
        { onConflict: 'organization_id,template_key,language' }
      )
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      template: data,
    });
  } catch (error) {
    console.error('POST /api/whatsapp-templates error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Reset template to default (AC6)
 */
export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireRole(['admin', 'gestor']);
    if (!auth.authorized) return auth.response!;

    const organizationId = auth.organizationId;
    if (!organizationId) {
      return NextResponse.json({ error: 'No organization found' }, { status: 400 });
    }

    const { template_key, language } = await request.json() as {
      template_key: string;
      language: string;
    };

    const supabase = await createClient();

    const { error } = await supabase
      .from('whatsapp_message_templates')
      .delete()
      .eq('organization_id', organizationId)
      .eq('template_key', template_key)
      .eq('language', language);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: 'Template reset to default',
    });
  } catch (error) {
    console.error('DELETE /api/whatsapp-templates error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
