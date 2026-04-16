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
