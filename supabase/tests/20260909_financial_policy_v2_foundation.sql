BEGIN;

DO $$
DECLARE
  v_org uuid;
  v_other_org uuid;
  v_property uuid;
  v_reservation uuid;
  v_rule uuid;
  v_payout uuid;
  v_allocation uuid;
BEGIN
  SELECT r.organization_id, r.property_id, r.id
    INTO v_org, v_property, v_reservation
  FROM public.reservations r
  WHERE r.organization_id IS NOT NULL AND r.property_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.regras_repasse rr
      WHERE rr.organization_id = r.organization_id
        AND rr.propriedade_id = r.property_id
        AND rr.vigencia_fim IS NULL
    )
  LIMIT 1;

  IF v_reservation IS NULL THEN
    RAISE EXCEPTION 'fixture requires one tenant-scoped reservation';
  END IF;

  SELECT rr.id INTO v_rule
  FROM public.regras_repasse rr
  WHERE rr.organization_id = v_org
    AND rr.propriedade_id = v_property
    AND rr.vigencia_fim IS NULL
  ORDER BY rr.vigencia_inicio DESC, rr.id
  LIMIT 1;

  IF v_rule IS NULL THEN
    RAISE EXCEPTION 'fixture requires a payout rule for the reservation property';
  END IF;

  INSERT INTO public.organization_financial_settings (
    organization_id, default_preset, default_recognition_basis,
    default_cash_flow_model, default_cleaning_recipient,
    default_municipal_tax_recipient
  ) VALUES (
    v_org, 'net_received', 'check_in', 'manager_trust', 'manager', 'municipality'
  )
  ON CONFLICT (organization_id) DO UPDATE
  SET default_preset = EXCLUDED.default_preset,
      default_recognition_basis = EXCLUDED.default_recognition_basis,
      default_cash_flow_model = EXCLUDED.default_cash_flow_model,
      default_cleaning_recipient = EXCLUDED.default_cleaning_recipient,
      default_municipal_tax_recipient = EXCLUDED.default_municipal_tax_recipient;

  BEGIN
    UPDATE public.regras_repasse
    SET contract_version = 2,
        recognition_basis = NULL,
        cash_flow_model = 'manager_trust',
        preset_key = 'net_received',
        management_commission_tax_rate = 23
    WHERE id = v_rule;
    RAISE EXCEPTION 'v2 required fields should reject null';
  EXCEPTION WHEN check_violation THEN
    NULL;
  END;

  UPDATE public.regras_repasse
  SET contract_version = 2,
      recognition_basis = 'check_in',
      cash_flow_model = 'manager_trust',
      preset_key = 'net_received',
      management_commission_tax_rate = 23
  WHERE id = v_rule;

  INSERT INTO public.payout_rule_components (
    organization_id, payout_rule_id, component_code, recipient,
    commission_base_effect, owner_statement_effect
  ) VALUES
    (v_org, v_rule, 'accommodation', 'owner', 'credit', 'credit'),
    (v_org, v_rule, 'cleaning_fee', 'manager', 'ignore', 'ignore'),
    (v_org, v_rule, 'municipal_tax', 'municipality', 'ignore', 'ignore'),
    (v_org, v_rule, 'other_guest_fees', 'owner', 'credit', 'credit'),
    (v_org, v_rule, 'discount', 'owner', 'debit', 'debit'),
    (v_org, v_rule, 'ota_commission', 'channel', 'debit', 'debit'),
    (v_org, v_rule, 'payment_processing_fee', 'payment_processor', 'debit', 'debit');

  BEGIN
    UPDATE public.regras_repasse
    SET vigencia_fim = CURRENT_DATE
    WHERE id = v_rule;
    RAISE EXCEPTION 'unversioned v2 rule closure should have failed';
  EXCEPTION WHEN SQLSTATE '22023' THEN
    NULL;
  END;

  BEGIN
    UPDATE public.regras_repasse
    SET recognition_basis = 'check_out'
    WHERE id = v_rule;
    RAISE EXCEPTION 'v2 calculation fields should be immutable';
  EXCEPTION WHEN SQLSTATE '22023' THEN
    NULL;
  END;

  BEGIN
    DELETE FROM public.regras_repasse WHERE id = v_rule;
    RAISE EXCEPTION 'v2 rule deletion should have failed';
  EXCEPTION WHEN SQLSTATE '22023' THEN
    NULL;
  END;

  INSERT INTO public.reservation_financial_snapshots (
    organization_id, property_id, reservation_id, version, status, currency,
    accommodation_amount, cleaning_fee_amount, municipal_tax_amount,
    other_guest_fees_amount, discount_amount, guest_total_amount,
    ota_commission_amount, payment_processing_fee_amount,
    channel_net_payout_amount, ota_commission_settlement,
    payment_processing_settlement, source_kind, provider
  ) VALUES (
    v_org, v_property, v_reservation, 1, 'complete', 'EUR',
    864.50, 90, 20, 0, 0, 974.50, 143.18, 13.64, 817.68,
    'withheld', 'withheld',
    'manual', 'test'
  );

  INSERT INTO public.channel_payouts (
    organization_id, provider, external_payout_id, payout_at, currency,
    gross_amount, ota_commission_amount, payment_processing_fee_amount,
    adjustment_amount, net_amount, source_kind, reconciliation_status,
    ota_commission_settlement, payment_processing_settlement
  ) VALUES (
    v_org, 'test', 'story-47-3', now(), 'EUR', 974.50, 143.18, 13.64,
    0, 817.68, 'manual', 'reconciled', 'withheld', 'withheld'
  ) RETURNING id INTO v_payout;

  INSERT INTO public.channel_payout_allocations (
    organization_id, payout_id, property_id, reservation_id,
    allocation_type, currency, amount
  ) VALUES (v_org, v_payout, v_property, v_reservation, 'reservation', 'EUR', 817.68)
  RETURNING id INTO v_allocation;

  INSERT INTO public.channel_payout_allocation_components (
    organization_id, allocation_id, component_code, amount
  ) VALUES
    (v_org, v_allocation, 'accommodation', 864.50),
    (v_org, v_allocation, 'cleaning_fee', 90),
    (v_org, v_allocation, 'municipal_tax', 20),
    (v_org, v_allocation, 'other_guest_fees', 0),
    (v_org, v_allocation, 'discount', 0),
    (v_org, v_allocation, 'ota_commission', 143.18),
    (v_org, v_allocation, 'payment_processing_fee', 13.64);

  BEGIN
    INSERT INTO public.channel_payout_allocation_components (
      organization_id, allocation_id, component_code, amount
    ) VALUES (v_org, v_allocation, 'accommodation', 1);
    RAISE EXCEPTION 'duplicate allocation component should have failed';
  EXCEPTION WHEN unique_violation THEN
    NULL;
  END;

  INSERT INTO public.channel_payout_allocations (
    organization_id, payout_id, property_id, reservation_id,
    allocation_type, currency, amount
  ) VALUES
    (v_org, v_payout, v_property, v_reservation, 'adjustment', 'EUR', -5),
    (v_org, v_payout, v_property, v_reservation, 'adjustment', 'EUR', 2);

  BEGIN
    INSERT INTO public.channel_payout_allocations (
      organization_id, payout_id, property_id, reservation_id,
      allocation_type, currency, amount
    ) VALUES (v_org, v_payout, v_property, v_reservation, 'adjustment', 'USD', 1);
    RAISE EXCEPTION 'allocation currency mismatch should have failed';
  EXCEPTION WHEN foreign_key_violation THEN
    NULL;
  END;

  IF (SELECT count(*) FROM public.payout_rule_components WHERE payout_rule_id = v_rule) <> 7 THEN
    RAISE EXCEPTION 'expected seven canonical policy components';
  END IF;

  IF (SELECT count(*) FROM public.channel_payout_allocation_components WHERE allocation_id = v_allocation) <> 7 THEN
    RAISE EXCEPTION 'expected seven exact allocation components';
  END IF;

  IF has_table_privilege('anon', 'public.reservation_financial_snapshots', 'SELECT') THEN
    RAISE EXCEPTION 'anon must not read financial snapshots';
  END IF;

  IF has_table_privilege('authenticated', 'public.reservation_financial_snapshots', 'INSERT') THEN
    RAISE EXCEPTION 'authenticated direct writes must remain closed';
  END IF;

  IF has_table_privilege('anon', 'public.channel_payout_allocation_components', 'SELECT')
     OR has_table_privilege('authenticated', 'public.channel_payout_allocation_components', 'INSERT') THEN
    RAISE EXCEPTION 'allocation components grants must remain read-only and tenant scoped';
  END IF;

  BEGIN
    INSERT INTO public.reservation_financial_snapshots (
      organization_id, property_id, reservation_id, version, status,
      currency, source_kind
    ) VALUES (v_org, v_property, v_reservation, 2, 'pending', 'EUR', 'ical');
    RAISE EXCEPTION 'second current snapshot should have failed';
  EXCEPTION WHEN unique_violation THEN
    NULL;
  END;

  SELECT o.id INTO v_other_org
  FROM public.organizations o
  WHERE o.id <> v_org
  LIMIT 1;

  IF v_other_org IS NOT NULL THEN
    BEGIN
      INSERT INTO public.reservation_financial_snapshots (
        organization_id, property_id, reservation_id, version, status,
        currency, source_kind
      ) VALUES (v_other_org, v_property, v_reservation, 2, 'pending', 'EUR', 'ical');
      RAISE EXCEPTION 'cross-tenant snapshot should have failed';
    EXCEPTION WHEN foreign_key_violation THEN
      NULL;
    END;
  END IF;
END
$$;

ROLLBACK;
