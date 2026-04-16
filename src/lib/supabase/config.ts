// Configuração do Supabase para garantir que variáveis de ambiente funcionem

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Validação em desenvolvimento
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ SUPABASE ENV VARS MISSING!')
  console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl)
  console.error('NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'EXISTS' : 'MISSING')
}

export const supabaseConfig = {
  url: supabaseUrl,
  anonKey: supabaseAnonKey,
}
