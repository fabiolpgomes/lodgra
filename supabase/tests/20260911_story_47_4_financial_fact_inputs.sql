BEGIN;

DO $$
DECLARE
  v_org uuid;
  v_other_org uuid;
  v_property uuid;
  v_reservation uuid;
  v_parameter uuid;
  v_snapshot_version integer;
BEGIN
  -- This nested exception block is an explicit subtransaction. It guarantees
  -- fixture cleanup even in SQL executors that ignore top-level ROLLBACK.
  BEGIN
  SELECT id INTO v_org FROM public.organizations LIMIT 1;
  IF v_org IS NULL THEN RAISE EXCEPTION 'fixture requires one organization'; END IF;
  v_property := gen_random_uuid();
  v_reservation := gen_random_uuid();
  INSERT INTO public.properties(id, organization_id, name)
  VALUES(v_property, v_org, 'Story 47.4 parameter test fixture');
  INSERT INTO public.reservations(id, organization_id, property_id, check_in, check_out,
    booking_source, currency, total_amount, status)
  VALUES(v_reservation, v_org, v_property, DATE '2039-02-01', DATE '2039-02-05',
    'ical', 'EUR', 100, 'confirmed');

  IF EXISTS (
    SELECT 1 FROM public.regras_repasse
    WHERE contract_version = 1 AND allow_declared_owner_base
  ) THEN
    RAISE EXCEPTION 'legacy rules must not opt into declared facts';
  END IF;

  INSERT INTO public.property_financial_parameters (
    organization_id, property_id, version, currency,
    guest_cleaning_fee_default_amount, guest_cleaning_fee_mode,
    manager_cleaning_cost_default_amount, manager_cleaning_cost_mode,
    municipal_tax_amount_per_guest_night, valid_from, note
  ) VALUES (
    v_org, v_property, 1, 'EUR', 90, 'per_stay', 70, 'per_stay',
    2, DATE '2026-06-01', 'transactional Story 47.4 test'
  ) RETURNING id INTO v_parameter;

  BEGIN
    UPDATE public.property_financial_parameters
    SET manager_cleaning_cost_default_amount = 75
    WHERE id = v_parameter;
    RAISE EXCEPTION 'parameter values must be immutable';
  EXCEPTION WHEN SQLSTATE '22023' THEN
    NULL;
  END;

  BEGIN
    INSERT INTO public.property_financial_parameters (
      organization_id, property_id, version, currency,
      manager_cleaning_cost_default_amount, manager_cleaning_cost_mode,
      valid_from
    ) VALUES (v_org, v_property, 2, 'EUR', 75, 'per_stay', DATE '2026-07-01');
    RAISE EXCEPTION 'overlapping parameter validity must fail';
  EXCEPTION WHEN exclusion_violation OR unique_violation THEN
    NULL;
  END;

  PERFORM pg_catalog.set_config(
    'lodgra.allow_property_financial_parameter_replacement', 'on', true
  );
  UPDATE public.property_financial_parameters
  SET valid_to = DATE '2026-06-30'
  WHERE id = v_parameter;
  PERFORM pg_catalog.set_config(
    'lodgra.allow_property_financial_parameter_replacement', 'off', true
  );

  INSERT INTO public.property_financial_parameters (
    organization_id, property_id, version, currency,
    manager_cleaning_cost_default_amount, manager_cleaning_cost_mode,
    valid_from
  ) VALUES (v_org, v_property, 2, 'EUR', 75, 'per_stay', DATE '2026-07-01');

  UPDATE public.reservation_financial_snapshots
  SET superseded_at = GREATEST(captured_at, now())
  WHERE organization_id = v_org
    AND reservation_id = v_reservation
    AND superseded_at IS NULL;

  SELECT COALESCE(max(version), 0) + 1
    INTO v_snapshot_version
  FROM public.reservation_financial_snapshots
  WHERE organization_id = v_org
    AND reservation_id = v_reservation;

  INSERT INTO public.reservation_financial_snapshots (
    organization_id, property_id, reservation_id, version, status, currency,
    fact_mode, declared_owner_base_amount, channel_net_payout_amount,
    manager_cleaning_cost_amount, source_kind, source_mapping_version,
    ota_commission_settlement, payment_processing_settlement
  ) VALUES (
    v_org, v_property, v_reservation, v_snapshot_version, 'complete', 'EUR',
    'declared_owner_base', 747.68, 817.68, 70, 'manual', 'ahs-xlsx-v1',
    'unknown', 'unknown'
  );

  BEGIN
    INSERT INTO public.reservation_financial_snapshots (
      organization_id, property_id, reservation_id, version, status, currency,
      fact_mode, declared_owner_base_amount, source_kind
    ) VALUES (
      v_org, v_property, v_reservation, v_snapshot_version + 1,
      'pending', 'EUR', 'component_breakdown', 1, 'manual'
    );
    RAISE EXCEPTION 'detailed mode must reject a declared base';
  EXCEPTION WHEN check_violation THEN
    NULL;
  END;

  BEGIN
    INSERT INTO public.reservation_financial_snapshots (
      organization_id, property_id, reservation_id, version, status, currency,
      fact_mode, source_kind
    ) VALUES (
      v_org, v_property, v_reservation, v_snapshot_version + 1,
      'pending', 'EUR', 'declared_owner_base', 'manual'
    );
    RAISE EXCEPTION 'declared mode must require its declared base';
  EXCEPTION WHEN check_violation THEN
    NULL;
  END;

  BEGIN
    INSERT INTO public.reservation_financial_snapshots (
      organization_id, property_id, reservation_id, version, status, currency,
      fact_mode, declared_owner_base_amount, source_kind
    ) VALUES (
      v_org, v_property, v_reservation, v_snapshot_version + 1,
      'pending', 'EUR', 'declared_owner_base', -1, 'manual'
    );
    RAISE EXCEPTION 'declared base must be non-negative';
  EXCEPTION WHEN check_violation THEN
    NULL;
  END;

  IF has_table_privilege('anon', 'public.property_financial_parameters', 'SELECT') THEN
    RAISE EXCEPTION 'anon must not read property financial parameters';
  END IF;

  IF has_table_privilege('authenticated', 'public.property_financial_parameters', 'INSERT')
     OR has_table_privilege('authenticated', 'public.property_financial_parameters', 'UPDATE')
     OR has_table_privilege('authenticated', 'public.property_financial_parameters', 'DELETE') THEN
    RAISE EXCEPTION 'authenticated direct parameter writes must remain closed';
  END IF;

  IF NOT has_table_privilege(
    'authenticated', 'public.property_financial_parameters', 'SELECT'
  ) THEN
    RAISE EXCEPTION 'authenticated requires tenant-scoped parameter reads';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'property_financial_parameters'
      AND c.relrowsecurity
  ) OR NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'property_financial_parameters'
      AND policyname = 'property_financial_parameters_tenant_select'
  ) THEN
    RAISE EXCEPTION 'property financial parameters require RLS and tenant policy';
  END IF;

  SELECT o.id INTO v_other_org
  FROM public.organizations o
  WHERE o.id <> v_org
  LIMIT 1;

  IF v_other_org IS NOT NULL THEN
    BEGIN
      INSERT INTO public.property_financial_parameters (
        organization_id, property_id, version, currency,
        manager_cleaning_cost_default_amount, manager_cleaning_cost_mode,
        valid_from
      ) VALUES (
        v_other_org, v_property, 99, 'EUR', 1, 'per_stay', DATE '2030-01-01'
      );
      RAISE EXCEPTION 'cross-tenant property parameters must fail';
    EXCEPTION WHEN foreign_key_violation THEN
      NULL;
    END;
  END IF;

  RAISE EXCEPTION USING
    ERRCODE = 'P0001',
    MESSAGE = 'STORY_47_4_FIXTURE_ROLLBACK';
  EXCEPTION WHEN SQLSTATE 'P0001' THEN
    IF SQLERRM IS DISTINCT FROM 'STORY_47_4_FIXTURE_ROLLBACK' THEN
      RAISE;
    END IF;
  END;
END
$$;

ROLLBACK;
