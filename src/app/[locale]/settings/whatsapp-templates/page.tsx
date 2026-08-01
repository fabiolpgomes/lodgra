import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/requireRole';
import WhatsAppTemplatesClient from './client';

export const metadata: Metadata = {
  title: 'WhatsApp Templates',
};

export default async function WhatsAppTemplatesPage() {
  const auth = await requireRole(['admin', 'gestor']);
  if (!auth.authorized) {
    redirect('/');
  }

  const supabase = await createClient();
  const { data: templates } = await supabase
    .from('whatsapp_message_templates')
    .select('*')
    .eq('organization_id', auth.organizationId);

  return (
    <WhatsAppTemplatesClient
      organizationId={auth.organizationId!}
      initialTemplates={templates || []}
    />
  );
}
