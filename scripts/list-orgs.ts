#!/usr/bin/env npx tsx
/**
 * Script para listar todas as organizações
 * Uso: npx tsx scripts/list-orgs.ts
 */

import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Variáveis de ambiente não encontradas');
    console.error('Certifique-se de que .env.local existe');
    process.exit(1);
  }

  const adminClient = createClient(supabaseUrl, supabaseKey);

  console.log('📋 Buscando todas as organizações...\n');

  const { data: orgs, error } = await adminClient
    .from('organizations')
    .select('id, name, subscription_plan, plan, premium_extra_properties_count')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Erro ao buscar organizações:', error);
    process.exit(1);
  }

  if (!orgs || orgs.length === 0) {
    console.log('Nenhuma organização encontrada.');
    process.exit(0);
  }

  // Exibir em tabela formatada
  console.log('┌─────────────────────────────────────────────┬──────────────┬──────────────────┬────────┐');
  console.log('│ ID da Organização                           │ Nome         │ Plano            │ Extras │');
  console.log('├─────────────────────────────────────────────┼──────────────┼──────────────────┼────────┤');

  for (const org of orgs) {
    const id = org.id.padEnd(41);
    const name = (org.name || 'N/A').substring(0, 12).padEnd(12);
    const plan = (org.subscription_plan || org.plan || 'N/A').substring(0, 16).padEnd(16);
    const extras = String(org.premium_extra_properties_count || 0).padEnd(6);

    console.log(`│ ${id} │ ${name} │ ${plan} │ ${extras} │`);
  }

  console.log('└─────────────────────────────────────────────┴──────────────┴──────────────────┴────────┘');

  console.log('\n');
  console.log('ℹ️  Para confirmar a organização correta:');
  console.log('   1. Verifique o ID que vê acima');
  console.log('   2. Execute: npm run check-plan -- <ID>');
  console.log('   3. Para atualizar: npm run update-plan -- <ID> enterprise');

  process.exit(0);
}

main().catch(err => {
  console.error('❌ Erro:', err.message);
  process.exit(1);
});
