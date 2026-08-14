-- Make tenant onboarding atomic and deterministic. The first account in every
-- organization is always its administrator and receives full property access.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  new_org_id UUID;
  base_slug TEXT;
  unique_slug TEXT;
BEGIN
  base_slug := lower(left(split_part(COALESCE(NEW.email, 'user'), '@', 1), 20));
  base_slug := regexp_replace(base_slug, '[^a-z0-9-]+', '-', 'g');
  base_slug := trim(both '-' from base_slug);
  unique_slug := COALESCE(NULLIF(base_slug, ''), 'empresa') || '-' || left(NEW.id::TEXT, 8);

  INSERT INTO public.organizations (
    name,
    slug,
    subscription_status,
    subscription_plan,
    plan
  )
  VALUES (
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'full_name', ''), NEW.email, 'Nova organização'),
    unique_slug,
    'trialing',
    'essencial',
    'essencial'
  )
  RETURNING id INTO new_org_id;

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
    'admin',
    true,
    new_org_id,
    NOW(),
    NOW()
  );

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

COMMENT ON FUNCTION public.handle_new_user() IS
  'Atomically creates one isolated organization and its first admin profile during auth signup.';

CREATE OR REPLACE FUNCTION public.ensure_my_organization(
  p_name TEXT,
  p_slug TEXT
)
RETURNS TABLE (organization_id UUID, organization_slug TEXT, created BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  current_user_id UUID := auth.uid();
  current_org_id UUID;
  candidate_slug TEXT;
  base_slug TEXT;
  suffix INTEGER := 0;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  -- Serialize retries from the same authenticated account.
  PERFORM pg_advisory_xact_lock(hashtextextended(current_user_id::TEXT, 0));

  SELECT up.organization_id
  INTO current_org_id
  FROM public.user_profiles up
  WHERE up.id = current_user_id;

  IF current_org_id IS NOT NULL THEN
    RETURN QUERY
      SELECT o.id, o.slug, false
      FROM public.organizations o
      WHERE o.id = current_org_id;
    RETURN;
  END IF;

  base_slug := lower(left(COALESCE(NULLIF(trim(p_slug), ''), 'empresa'), 40));
  base_slug := regexp_replace(base_slug, '[^a-z0-9-]+', '-', 'g');
  base_slug := COALESCE(NULLIF(trim(both '-' from base_slug), ''), 'empresa');

  LOOP
    candidate_slug := base_slug || CASE WHEN suffix = 0 THEN '' ELSE '-' || suffix::TEXT END;
    BEGIN
      INSERT INTO public.organizations (
        name,
        slug,
        subscription_status,
        subscription_plan,
        plan
      )
      VALUES (
        COALESCE(NULLIF(trim(p_name), ''), 'Nova organização'),
        candidate_slug,
        'trialing',
        'essencial',
        'essencial'
      )
      RETURNING id INTO current_org_id;
      EXIT;
    EXCEPTION WHEN unique_violation THEN
      suffix := suffix + 1;
      IF suffix > 99 THEN
        RAISE EXCEPTION 'Unable to allocate a unique organization slug';
      END IF;
    END;
  END LOOP;

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
  SELECT
    au.id,
    au.email,
    COALESCE(au.raw_user_meta_data->>'full_name', ''),
    'admin',
    true,
    current_org_id,
    NOW(),
    NOW()
  FROM auth.users au
  WHERE au.id = current_user_id
  ON CONFLICT (id) DO UPDATE
  SET organization_id = EXCLUDED.organization_id,
      role = 'admin',
      access_all_properties = true,
      updated_at = NOW()
  WHERE public.user_profiles.organization_id IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Authenticated user record not found';
  END IF;

  RETURN QUERY SELECT current_org_id, candidate_slug, true;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.ensure_my_organization(TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ensure_my_organization(TEXT, TEXT) TO authenticated;

COMMENT ON FUNCTION public.ensure_my_organization(TEXT, TEXT) IS
  'Idempotently repairs legacy authenticated accounts without a tenant; never accepts a user or organization id.';

CREATE OR REPLACE FUNCTION public.update_my_organization(
  p_name TEXT,
  p_slug TEXT
)
RETURNS TABLE (organization_id UUID, organization_slug TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  current_user_id UUID := auth.uid();
  current_org_id UUID;
  candidate_slug TEXT;
  base_slug TEXT;
  suffix INTEGER := 0;
BEGIN
  IF current_user_id IS NULL OR NULLIF(trim(p_name), '') IS NULL THEN
    RAISE EXCEPTION 'Authentication and organization name are required' USING ERRCODE = '42501';
  END IF;

  SELECT up.organization_id
  INTO current_org_id
  FROM public.user_profiles up
  WHERE up.id = current_user_id
    AND up.role = 'admin';

  IF current_org_id IS NULL THEN
    RAISE EXCEPTION 'Organization administrator access required' USING ERRCODE = '42501';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(current_org_id::TEXT, 0));

  IF NULLIF(trim(p_slug), '') IS NULL THEN
    SELECT o.slug INTO base_slug
    FROM public.organizations o
    WHERE o.id = current_org_id;
  ELSE
    base_slug := lower(left(trim(p_slug), 40));
    base_slug := regexp_replace(base_slug, '[^a-z0-9-]+', '-', 'g');
    base_slug := COALESCE(NULLIF(trim(both '-' from base_slug), ''), 'empresa');
  END IF;

  LOOP
    candidate_slug := base_slug || CASE WHEN suffix = 0 THEN '' ELSE '-' || suffix::TEXT END;
    BEGIN
      UPDATE public.organizations
      SET name = trim(p_name),
          slug = candidate_slug,
          updated_at = NOW()
      WHERE id = current_org_id;
      EXIT;
    EXCEPTION WHEN unique_violation THEN
      suffix := suffix + 1;
      IF suffix > 99 THEN
        RAISE EXCEPTION 'Unable to allocate a unique organization slug';
      END IF;
    END;
  END LOOP;

  RETURN QUERY SELECT current_org_id, candidate_slug;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.update_my_organization(TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_my_organization(TEXT, TEXT) TO authenticated;

COMMENT ON FUNCTION public.update_my_organization(TEXT, TEXT) IS
  'Updates only the authenticated administrator organization and resolves slug collisions atomically.';
