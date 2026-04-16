/**
 * DIAGNÓSTICO - Execute este arquivo para verificar a configuração
 * 
 * No terminal, execute:
 * node diagnose.js
 */

console.log('🔍 DIAGNÓSTICO DO HOME STAY\n')

// Verificar variáveis de ambiente
console.log('📋 Variáveis de Ambiente:')
console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Definida' : '❌ NÃO DEFINIDA')
console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Definida' : '❌ NÃO DEFINIDA')
console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Definida' : '❌ NÃO DEFINIDA')

console.log('\n📝 Instruções:')
console.log('1. Se alguma variável está "NÃO DEFINIDA", verifique o arquivo .env.local')
console.log('2. O arquivo .env.local deve estar na raiz do projeto')
console.log('3. Após corrigir, reinicie o servidor: npm run dev')
console.log('\n✨ Formato esperado do .env.local:')
console.log(`
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anon-aqui
SUPABASE_SERVICE_ROLE_KEY=sua-chave-service-role-aqui
`)
