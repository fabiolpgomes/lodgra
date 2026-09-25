-- Add 'cleaner' role to user_profiles constraint
ALTER TABLE user_profiles DROP CONSTRAINT user_profiles_role_check;

ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_role_check
  CHECK (role IN ('admin', 'gestor', 'proprietario', 'convidado', 'cleaner'));
