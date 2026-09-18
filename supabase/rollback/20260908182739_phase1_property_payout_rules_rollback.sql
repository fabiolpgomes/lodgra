BEGIN;

DROP TABLE IF EXISTS public.regras_repasse;
DROP FUNCTION IF EXISTS public.touch_regras_repasse_updated_at();
DROP TYPE IF EXISTS public.destinatario_taxa_repasse;
DROP TYPE IF EXISTS public.base_comissao_repasse;
DROP TYPE IF EXISTS public.tipo_comissao_repasse;

-- btree_gist is intentionally retained because extensions may be shared by
-- unrelated schema objects created after this migration.

COMMIT;
