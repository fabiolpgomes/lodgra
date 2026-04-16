-- ============================================================
-- Invariante: organization_id nunca pode ser NULL
-- Preencher NULLs e SET NOT NULL em tabelas que existem
-- (guests é criada em migração posterior, tratada condicionalmente)
-- ============================================================

UPDATE public.user_profiles
  SET organization_id = '00000000-0000-0000-0000-000000000001'
  WHERE organization_id IS NULL;

UPDATE public.properties
  SET organization_id = '00000000-0000-0000-0000-000000000001'
  WHERE organization_id IS NULL;

UPDATE public.owners
  SET organization_id = '00000000-0000-0000-0000-000000000001'
  WHERE organization_id IS NULL;

ALTER TABLE public.user_profiles
  ALTER COLUMN organization_id SET NOT NULL;

ALTER TABLE public.properties
  ALTER COLUMN organization_id SET NOT NULL;

ALTER TABLE public.owners
  ALTER COLUMN organization_id SET NOT NULL;

-- guests table may not exist yet (created in 20260315000000)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'guests') THEN
    UPDATE public.guests SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
    ALTER TABLE public.guests ALTER COLUMN organization_id SET NOT NULL;
  END IF;
END $$;
