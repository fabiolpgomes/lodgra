BEGIN;

DO $$
DECLARE
  v_org uuid;
  v_basis text;
BEGIN
  SELECT id INTO v_org
  FROM public.organizations
  ORDER BY id
  LIMIT 1;

  IF v_org IS NULL THEN
    RAISE EXCEPTION 'fixture requires one organization';
  END IF;

  DELETE FROM public.organization_financial_settings
  WHERE organization_id = v_org;

  INSERT INTO public.organization_financial_settings (
    organization_id, default_preset, default_cash_flow_model,
    default_cleaning_recipient, default_municipal_tax_recipient
  ) VALUES (
    v_org, 'net_received', 'manager_trust', 'manager', 'municipality'
  )
  RETURNING default_recognition_basis INTO v_basis;

  IF v_basis IS DISTINCT FROM 'check_out' THEN
    RAISE EXCEPTION 'new tenant settings must default to check_out';
  END IF;

  UPDATE public.organization_financial_settings
  SET default_recognition_basis = 'stay_prorata'
  WHERE organization_id = v_org;

  IF NOT EXISTS (
    SELECT 1 FROM public.organization_financial_settings
    WHERE organization_id = v_org
      AND default_recognition_basis = 'stay_prorata'
  ) THEN
    RAISE EXCEPTION 'tenant must be allowed to choose stay_prorata';
  END IF;

  BEGIN
    UPDATE public.organization_financial_settings
    SET default_recognition_basis = 'implicit_fallback'
    WHERE organization_id = v_org;
    RAISE EXCEPTION 'unknown recognition basis should have failed';
  EXCEPTION WHEN check_violation THEN
    NULL;
  END;
END
$$;

ROLLBACK;
