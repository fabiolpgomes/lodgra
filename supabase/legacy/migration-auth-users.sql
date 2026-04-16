-- ============================================
-- SISTEMA DE AUTENTICAÇÃO E PERMISSÕES
-- ============================================

-- 1. Criar tabela de perfis de usuário
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'manager', 'viewer')),
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Habilitar RLS (Row Level Security)
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- 3. Políticas de acesso
-- Usuários podem ver seu próprio perfil
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = id);

-- Usuários podem atualizar seu próprio perfil
CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = id);

-- Admins podem ver todos os perfis
CREATE POLICY "Admins can view all profiles"
  ON user_profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins podem criar usuários
CREATE POLICY "Admins can insert profiles"
  ON user_profiles FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins podem deletar usuários
CREATE POLICY "Admins can delete profiles"
  ON user_profiles FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 4. Função para criar perfil automaticamente ao registrar
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Sempre atribuir role 'viewer' por segurança.
  -- Promoção de role deve ser feita apenas por admin via dashboard.
  INSERT INTO public.user_profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    'viewer'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Trigger para auto-criar perfil
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. Criar primeiro usuário admin (VOCÊ)
-- IMPORTANTE: Execute este comando DEPOIS de criar sua conta
-- Substitua 'seu-email@exemplo.com' pelo seu email real
/*
UPDATE user_profiles 
SET role = 'admin', full_name = 'Fabio Gomes'
WHERE email = 'seu-email@exemplo.com';
*/

-- 7. Índices para performance
CREATE INDEX idx_user_profiles_role ON user_profiles(role);
CREATE INDEX idx_user_profiles_email ON user_profiles(email);

-- 8. Comentários
COMMENT ON TABLE user_profiles IS 'Perfis de usuários com roles e permissões';
COMMENT ON COLUMN user_profiles.role IS 'admin: acesso total | manager: gerenciar | viewer: apenas visualizar';

-- ============================================
-- ROLES E PERMISSÕES:
-- ============================================
-- admin    - Acesso total (criar usuários, deletar, todas ações)
-- manager  - Criar/editar reservas, despesas, propriedades
-- viewer   - Apenas visualizar dados, sem editar
-- ============================================

-- Verificar perfis criados
SELECT id, email, full_name, role, created_at 
FROM user_profiles 
ORDER BY created_at DESC;
