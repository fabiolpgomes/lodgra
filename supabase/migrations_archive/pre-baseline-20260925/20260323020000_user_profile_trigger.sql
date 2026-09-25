-- ============================================================
-- Trigger: Auto-create user_profiles on auth.users INSERT
-- Fallback safety net for user registration
-- ============================================================

-- Função que cria organização + perfil para novo usuário
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  new_org_id UUID;
  base_slug TEXT;
  unique_slug TEXT;
BEGIN
  -- Gerar slug único para a organização
  base_slug := COALESCE(
    NULLIF((NEW.raw_user_meta_data->>'email'), ''),
    COALESCE(NEW.email, 'user')
  );
  base_slug := LOWER(SUBSTRING(SPLIT_PART(base_slug, '@', 1), 1, 20));
  unique_slug := base_slug || '-' || SUBSTRING(NEW.id::TEXT, 1, 8);

  -- 1. Criar organização
  INSERT INTO public.organizations (name, slug, subscription_status, plan)
  VALUES (
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email, 'New Organization'),
    unique_slug,
    'trial',
    'starter'
  )
  RETURNING id INTO new_org_id;

  -- 2. Criar perfil do usuário
  INSERT INTO public.user_profiles (
    id,
    email,
    full_name,
    role,
    access_all_properties,
    organization_id,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'viewer',
    false,
    new_org_id,
    NOW(),
    NOW()
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log erro mas não falhar — o trigger não deve quebrar a criação de user
  RAISE WARNING 'handle_new_user error: %', SQLERRM;
  RETURN NEW;
END;
$$;

-- Remover trigger antigo se existir
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Criar trigger
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

COMMENT ON FUNCTION public.handle_new_user() IS 'Auto-creates organization and user_profiles record when new user signs up via Supabase Auth';
-- Note: COMMENT ON TRIGGER on auth.users requires owner privilege, skipping
