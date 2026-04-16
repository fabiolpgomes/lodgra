-- Add access_all_properties to user_profiles (idempotent)
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS access_all_properties BOOLEAN DEFAULT false;

-- Mark existing users with full access
UPDATE user_profiles SET access_all_properties = true WHERE email = 'fabiolpgomes@gmail.com';
UPDATE user_profiles SET access_all_properties = true WHERE email = 'rosangelacordeiro_adv@hotmail.com';

-- user_properties table + policies created in _03 and _04, skip if exists
CREATE TABLE IF NOT EXISTS user_properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, property_id)
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage user_properties' AND tablename = 'user_properties') THEN
    CREATE POLICY "Admins can manage user_properties" ON user_properties FOR ALL
      USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own properties' AND tablename = 'user_properties') THEN
    CREATE POLICY "Users can view own properties" ON user_properties FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_user_properties_user_id ON user_properties(user_id);
CREATE INDEX IF NOT EXISTS idx_user_properties_property_id ON user_properties(property_id);
