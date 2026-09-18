-- Story 47.1 catalog, integrity and grant checks.
-- Run against the staging schema after applying migration 20260908182739.

BEGIN;

DO $$
DECLARE
  source_property record;
  other_organization_id uuid;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'regras_repasse'
      AND c.relrowsecurity
  ) THEN
    RAISE EXCEPTION 'regras_repasse must exist with RLS enabled';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.role_table_grants
    WHERE table_schema = 'public'
      AND table_name = 'regras_repasse'
      AND grantee = 'anon'
  ) THEN
    RAISE EXCEPTION 'anon must have no grants on regras_repasse';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.role_table_grants
    WHERE table_schema = 'public'
      AND table_name = 'regras_repasse'
      AND grantee = 'authenticated'
      AND privilege_type IN ('DELETE', 'TRUNCATE')
  ) THEN
    RAISE EXCEPTION 'authenticated must not delete or truncate payout history';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.properties p
    WHERE p.management_percentage IS NOT NULL
      AND (p.management_percentage < 0 OR p.management_percentage > 100)
  ) THEN
    RAISE EXCEPTION 'legacy management_percentage must be between 0 and 100 before backfill';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.properties p
    WHERE p.organization_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM public.regras_repasse rr
        WHERE rr.organization_id = p.organization_id
          AND rr.propriedade_id = p.id
          AND rr.vigencia_fim IS NULL
      )
  ) THEN
    RAISE EXCEPTION 'every property must have a current backfilled payout rule';
  END IF;

  SELECT p.id, p.organization_id, p.created_at::date AS created_on
  INTO source_property
  FROM public.properties p
  WHERE p.organization_id IS NOT NULL
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'integrity checks require a property with an organization';
  END IF;

  BEGIN
    INSERT INTO public.regras_repasse (
      organization_id,
      propriedade_id,
      vigencia_inicio,
      tipo_comissao,
      comissao_valor
    ) VALUES (
      source_property.organization_id,
      source_property.id,
      COALESCE(source_property.created_on, CURRENT_DATE),
      'percentual',
      10
    );
    RAISE EXCEPTION 'overlapping rules must be rejected';
  EXCEPTION
    WHEN exclusion_violation OR unique_violation THEN NULL;
  END;

  SELECT o.id
  INTO other_organization_id
  FROM public.organizations o
  WHERE o.id <> source_property.organization_id
  LIMIT 1;

  IF other_organization_id IS NOT NULL THEN
    BEGIN
      INSERT INTO public.regras_repasse (
        organization_id,
        propriedade_id,
        vigencia_inicio,
        vigencia_fim,
        tipo_comissao,
        comissao_valor
      ) VALUES (
        other_organization_id,
        source_property.id,
        DATE '1900-01-01',
        DATE '1900-01-02',
        'percentual',
        10
      );
      RAISE EXCEPTION 'cross-tenant property links must be rejected';
    EXCEPTION
      WHEN foreign_key_violation THEN NULL;
    END;
  END IF;
END;
$$;

ROLLBACK;
