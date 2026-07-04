#!/usr/bin/env npx tsx
/**
 * Script para definir plano enterprise para organização
 * Uso: npx tsx scripts/set-enterprise-plan.ts <org-id>
 */

import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

async function main() {
  const orgId = process.argv[2] || '0000000000000001';
  const plan = process.argv[3] || 'enterprise';

  console.log(`🔄 Atualizando plano para '${plan}' na organização: ${orgId}`);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Variáveis de ambiente não encontradas');
    console.error('Certifique-se de que .env.local existe e tem NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY');
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

  console.log('📋 Plano atual:');
  console.log(`   - subscription_plan: ${org.subscription_plan}`);
  console.log(`   - plan: ${org.plan}`);
  console.log(`   - premium_extra_properties_count: ${org.premium_extra_properties_count}`);

  // Contar propriedades existentes
  const { count, error: countError } = await adminClient
    .from('properties')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', orgId);

  if (countError) {
    console.error('❌ Erro ao contar propriedades:', countError);
    process.exit(1);
  }

  console.log(`🏠 Propriedades existentes: ${count}`);

  // Atualizar plano
  const { error: updateError } = await adminClient
    .from('organizations')
    .update({
      subscription_plan: plan,
      plan: plan,
      premium_extra_properties_count: plan === 'enterprise' ? 0 : undefined,
    })
    .eq('id', orgId);

  if (updateError) {
    console.error('❌ Erro ao atualizar:', updateError);
    process.exit(1);
  }

  console.log(`✅ Plano atualizado para "${plan}"!`);
  if (plan === 'enterprise') {
    console.log('✨ Agora você pode adicionar propriedades ilimitadas');
  }

  // Verificar resultado
  const { data: updated, error: checkError } = await adminClient
    .from('organizations')
    .select('subscription_plan, plan')
    .eq('id', orgId)
    .single();

  if (!checkError && updated) {
    console.log(`\n📋 Plano confirmado:`);
    console.log(`   subscription_plan: ${updated.subscription_plan}`);
    console.log(`   plan: ${updated.plan}`);
  }

  process.exit(0);
}

main().catch(err => {
  console.error('❌ Erro:', err.message);
  process.exit(1);
});
