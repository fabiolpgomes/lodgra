-- 1. Adicionar campo access_all_properties ao user_profiles
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS access_all_properties BOOLEAN DEFAULT false;

-- 2. Marcar utilizadores existentes com acesso total
UPDATE user_profiles SET access_all_properties = true WHERE email = 'fabiolpgomes@gmail.com';
UPDATE user_profiles SET access_all_properties = true WHERE email = 'rosangelacordeiro_adv@hotmail.com';

-- 3. Criar tabela user_properties
CREATE TABLE IF NOT EXISTS user_properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, property_id)
);

ALTER TABLE user_properties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage user_properties"
  ON user_properties FOR ALL
  USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Users can view own properties"
  ON user_properties FOR SELECT
  USING (auth.uid() = user_id);

CREATE INDEX idx_user_properties_user_id ON user_properties(user_id);
CREATE INDEX idx_user_properties_property_id ON user_properties(property_id);
