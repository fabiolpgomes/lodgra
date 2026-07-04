#!/usr/bin/env npx tsx
/**
 * Script para verificar plano da organização
 * Uso: npx tsx scripts/check-plan.ts <org-id>
 */

import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

async function main() {
  const orgId = process.argv[2] || '0000000000000001';

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Variáveis de ambiente não encontradas');
    process.exit(1);
  }

  const adminClient = createClient(supabaseUrl, supabaseKey);

  // Verificar plano atual
  const { data: org, error: fetchError } = await adminClient
    .from('organizations')
    .select('id, name, subscription_plan, plan, premium_extra_properties_count')
    .eq('id', orgId)
    .single();

  if (fetchError || !org) {
    console.error('❌ Organização não encontrada:', fetchError);
    process.exit(1);
  }

  console.log('📋 Dados da Organização:');
  console.log('---');
  console.log(`ID: ${org.id}`);
  console.log(`Nome: ${org.name}`);
  console.log(`subscription_plan: ${org.subscription_plan}`);
  console.log(`plan: ${org.plan}`);
  console.log(`premium_extra_properties_count: ${org.premium_extra_properties_count || 0}`);
  console.log('---');

  // Contar propriedades
  const { count, error: countError } = await adminClient
    .from('properties')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', orgId);

  if (countError) {
    console.error('❌ Erro ao contar propriedades:', countError);
    process.exit(1);
  }

  console.log(`🏠 Propriedades existentes: ${count}`);

  // Verificar limite
  const planLimits: Record<string, number | null> = {
    essencial: 1,
    expansao: 3,
    premium: 10,
    enterprise: null, // ilimitado
    starter: 1,
    growth: 3,
    professional: 10,
    business: 10,
    pro: 10,
  };

  const currentPlan = org.subscription_plan || org.plan || 'essencial';
  const maxProps = planLimits[currentPlan];
  const limit = maxProps === null ? 'ilimitadas' : `${maxProps}${(org.premium_extra_properties_count || 0) > 0 ? ` + ${org.premium_extra_properties_count} extras` : ''}`;

  console.log(`📊 Limite: ${limit} propriedades`);

  if (maxProps === null) {
    console.log('✅ Plano é ilimitado! Pode adicionar quantas propriedades quiser.');
  } else {
    const totalAllowed = (maxProps || 0) + (org.premium_extra_properties_count || 0);
    const remaining = Math.max(0, totalAllowed - (count || 0));
    if (remaining > 0) {
      console.log(`✅ Pode adicionar mais ${remaining} propriedade(s).`);
    } else {
      console.log(`❌ Limite atingido! Precisa atualizar para um plano maior.`);
    }
  }

  process.exit(0);
}

main().catch(err => {
  console.error('❌ Erro:', err.message);
  process.exit(1);
});
