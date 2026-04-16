-- ============================================
-- SEGURANÇA COMPLETA - RLS BASEADO EM ROLES
-- ============================================

-- ============================================
-- PARTE 1: RE-ATIVAR RLS
-- ============================================

ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PARTE 2: FUNÇÃO AUXILIAR - GET USER ROLE
-- ============================================

CREATE OR REPLACE FUNCTION auth.get_user_role()
RETURNS TEXT AS $$
BEGIN
  RETURN (
    SELECT role 
    FROM public.user_profiles 
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- PARTE 3: POLÍTICAS - USER_PROFILES
-- ============================================

DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON user_profiles;

-- Todos podem ver seu próprio perfil
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = id);

-- Todos podem atualizar seu próprio perfil
CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = id);

-- Admins podem ver todos os perfis
CREATE POLICY "Admins can view all profiles"
  ON user_profiles FOR SELECT
  USING (auth.get_user_role() = 'admin');

-- Admins podem criar novos usuários
CREATE POLICY "Admins can insert profiles"
  ON user_profiles FOR INSERT
  WITH CHECK (auth.get_user_role() = 'admin');

-- Admins podem deletar usuários
CREATE POLICY "Admins can delete profiles"
  ON user_profiles FOR DELETE
  USING (auth.get_user_role() = 'admin');

-- ============================================
-- PARTE 4: POLÍTICAS - PROPERTIES
-- ============================================

DROP POLICY IF EXISTS "Enable read for authenticated users" ON properties;
DROP POLICY IF EXISTS "Enable insert for admin and manager" ON properties;
DROP POLICY IF EXISTS "Enable update for admin and manager" ON properties;
DROP POLICY IF EXISTS "Enable delete for admin only" ON properties;

-- Todos autenticados podem LER
CREATE POLICY "Enable read for authenticated users"
  ON properties FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Admin e Manager podem CRIAR
CREATE POLICY "Enable insert for admin and manager"
  ON properties FOR INSERT
  WITH CHECK (
    auth.get_user_role() IN ('admin', 'manager')
  );

-- Admin e Manager podem ATUALIZAR
CREATE POLICY "Enable update for admin and manager"
  ON properties FOR UPDATE
  USING (
    auth.get_user_role() IN ('admin', 'manager')
  );

-- Apenas Admin pode DELETAR
CREATE POLICY "Enable delete for admin only"
  ON properties FOR DELETE
  USING (auth.get_user_role() = 'admin');

-- ============================================
-- PARTE 5: POLÍTICAS - PROPERTY_LISTINGS
-- ============================================

DROP POLICY IF EXISTS "Enable read for authenticated users" ON property_listings;
DROP POLICY IF EXISTS "Enable insert for admin and manager" ON property_listings;
DROP POLICY IF EXISTS "Enable update for admin and manager" ON property_listings;
DROP POLICY IF EXISTS "Enable delete for admin only" ON property_listings;

CREATE POLICY "Enable read for authenticated users"
  ON property_listings FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Enable insert for admin and manager"
  ON property_listings FOR INSERT
  WITH CHECK (
    auth.get_user_role() IN ('admin', 'manager')
  );

CREATE POLICY "Enable update for admin and manager"
  ON property_listings FOR UPDATE
  USING (
    auth.get_user_role() IN ('admin', 'manager')
  );

CREATE POLICY "Enable delete for admin only"
  ON property_listings FOR DELETE
  USING (auth.get_user_role() = 'admin');

-- ============================================
-- PARTE 6: POLÍTICAS - RESERVATIONS
-- ============================================

DROP POLICY IF EXISTS "Enable read for authenticated users" ON reservations;
DROP POLICY IF EXISTS "Enable insert for admin and manager" ON reservations;
DROP POLICY IF EXISTS "Enable update for admin and manager" ON reservations;
DROP POLICY IF EXISTS "Enable delete for admin only" ON reservations;

CREATE POLICY "Enable read for authenticated users"
  ON reservations FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Enable insert for admin and manager"
  ON reservations FOR INSERT
  WITH CHECK (
    auth.get_user_role() IN ('admin', 'manager')
  );

CREATE POLICY "Enable update for admin and manager"
  ON reservations FOR UPDATE
  USING (
    auth.get_user_role() IN ('admin', 'manager')
  );

CREATE POLICY "Enable delete for admin only"
  ON reservations FOR DELETE
  USING (auth.get_user_role() = 'admin');

-- ============================================
-- PARTE 7: POLÍTICAS - GUESTS
-- ============================================

DROP POLICY IF EXISTS "Enable read for authenticated users" ON guests;
DROP POLICY IF EXISTS "Enable insert for admin and manager" ON guests;
DROP POLICY IF EXISTS "Enable update for admin and manager" ON guests;
DROP POLICY IF EXISTS "Enable delete for admin only" ON guests;

CREATE POLICY "Enable read for authenticated users"
  ON guests FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Enable insert for admin and manager"
  ON guests FOR INSERT
  WITH CHECK (
    auth.get_user_role() IN ('admin', 'manager')
  );

CREATE POLICY "Enable update for admin and manager"
  ON guests FOR UPDATE
  USING (
    auth.get_user_role() IN ('admin', 'manager')
  );

CREATE POLICY "Enable delete for admin only"
  ON guests FOR DELETE
  USING (auth.get_user_role() = 'admin');

-- ============================================
-- PARTE 8: POLÍTICAS - EXPENSES
-- ============================================

DROP POLICY IF EXISTS "Enable read for authenticated users" ON expenses;
DROP POLICY IF EXISTS "Enable insert for admin and manager" ON expenses;
DROP POLICY IF EXISTS "Enable update for admin and manager" ON expenses;
DROP POLICY IF EXISTS "Enable delete for admin only" ON expenses;

CREATE POLICY "Enable read for authenticated users"
  ON expenses FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Enable insert for admin and manager"
  ON expenses FOR INSERT
  WITH CHECK (
    auth.get_user_role() IN ('admin', 'manager')
  );

CREATE POLICY "Enable update for admin and manager"
  ON expenses FOR UPDATE
  USING (
    auth.get_user_role() IN ('admin', 'manager')
  );

CREATE POLICY "Enable delete for admin only"
  ON expenses FOR DELETE
  USING (auth.get_user_role() = 'admin');

-- ============================================
-- VERIFICAÇÃO
-- ============================================

-- Ver todas as políticas criadas
SELECT schemaname, tablename, policyname, roles, cmd 
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Ver status de RLS
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('properties', 'reservations', 'expenses', 'property_listings', 'guests', 'user_profiles')
ORDER BY tablename;

-- ============================================
-- RESUMO DAS PERMISSÕES
-- ============================================

/*
VIEWER (viewer):
- ✅ VER: Tudo
- ❌ CRIAR: Nada
- ❌ EDITAR: Nada  
- ❌ DELETAR: Nada

MANAGER (manager):
- ✅ VER: Tudo
- ✅ CRIAR: Propriedades, Reservas, Despesas
- ✅ EDITAR: Propriedades, Reservas, Despesas
- ❌ DELETAR: Nada
- ❌ GERENCIAR: Usuários

ADMIN (admin):
- ✅ VER: Tudo
- ✅ CRIAR: Tudo
- ✅ EDITAR: Tudo
- ✅ DELETAR: Tudo
- ✅ GERENCIAR: Usuários
*/
