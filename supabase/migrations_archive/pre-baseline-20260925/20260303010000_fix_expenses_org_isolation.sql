-- ============================================================
-- SECURITY FIX: Org isolation em expenses + user_has_property_access()
--
-- Problema: a tabela `expenses` usava apenas user_has_property_access()
-- nas suas RLS policies. Essa função retornava TRUE para qualquer admin
-- sem verificar organization_id — um admin de org A podia ler/escrever
-- expenses de org B se conhecesse o property_id.
--
-- Correcção dupla (defence in depth):
--   1. user_has_property_access() passa a verificar org_id do utilizador
--      vs org_id da propriedade — elimina o gap na raiz.
--   2. Policies de expenses reescritas com join explícito em properties
--      + get_user_organization_id(), alinhadas com o padrão adoptado em
--      reservations/property_listings na migração _03_organizations.
-- ============================================================

-- ─── 1. Actualizar user_has_property_access() ────────────────────────────────
--
-- Antes: verificava role/access_all_properties sem filtro de org.
-- Depois: garante que a propriedade pertence à mesma org do utilizador.
--
-- Impacto noutras policies: inócuo — properties, property_listings e
-- reservations já têm get_user_organization_id() explícito; a redundância
-- é intencional (defence in depth).

CREATE OR REPLACE FUNCTION public.user_has_property_access(prop_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_profiles up
    WHERE up.id = auth.uid()
      -- Nova guarda: org do utilizador deve coincidir com org da propriedade
      AND up.organization_id = (
        SELECT organization_id FROM public.properties WHERE id = prop_id
      )
      AND (
        up.role = 'admin'
        OR up.access_all_properties = TRUE
        OR EXISTS (
          SELECT 1 FROM public.user_properties
          WHERE user_id = auth.uid()
            AND property_id = prop_id
        )
      )
  );
$$;

-- ─── 2. Reescrever policies de expenses ──────────────────────────────────────
--
-- expenses não tem coluna organization_id — o isolamento é derivado via
-- property_id → properties.organization_id (fonte única de verdade).
-- Padrão adoptado: org check explícito + user_has_property_access().

DROP POLICY IF EXISTS "expenses_select" ON public.expenses;
DROP POLICY IF EXISTS "expenses_insert" ON public.expenses;
DROP POLICY IF EXISTS "expenses_update" ON public.expenses;
DROP POLICY IF EXISTS "expenses_delete" ON public.expenses;
-- Nomes alternativos que possam existir de migrações anteriores
DROP POLICY IF EXISTS "Enable read for authenticated users" ON public.expenses;
DROP POLICY IF EXISTS "Enable write for admin and manager"  ON public.expenses;

-- SELECT: qualquer utilizador da org com acesso à propriedade
CREATE POLICY "expenses_select"
  ON public.expenses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = property_id
        AND p.organization_id = public.get_user_organization_id()
    )
    AND public.user_has_property_access(property_id)
  );

-- INSERT: admin ou manager da org com acesso à propriedade
CREATE POLICY "expenses_insert"
  ON public.expenses FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid()
        AND role IN ('admin', 'manager')
    )
    AND EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = property_id
        AND p.organization_id = public.get_user_organization_id()
    )
    AND public.user_has_property_access(property_id)
  );

-- UPDATE: admin ou manager da org com acesso à propriedade
CREATE POLICY "expenses_update"
  ON public.expenses FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid()
        AND role IN ('admin', 'manager')
    )
    AND EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = property_id
        AND p.organization_id = public.get_user_organization_id()
    )
    AND public.user_has_property_access(property_id)
  );

-- DELETE: apenas admin da org com acesso à propriedade
CREATE POLICY "expenses_delete"
  ON public.expenses FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid()
        AND role IN ('admin', 'manager')
    )
    AND EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = property_id
        AND p.organization_id = public.get_user_organization_id()
    )
    AND public.user_has_property_access(property_id)
  );
