-- ============================================================
-- SECURITY FIX: guests_insert e guests_update requerem role
--
-- Problema: qualquer utilizador autenticado (incluindo viewer)
-- podia inserir e actualizar hóspedes desde que passasse o check
-- de organization_id. Todos os recursos análogos (owners, expenses,
-- reservations) exigem admin ou manager.
--
-- Correcção: adicionar role IN ('admin', 'manager') às policies
-- de INSERT e UPDATE da tabela guests.
--
-- Nota: guests_select mantém-se sem restrição de role (viewers
-- precisam de ver hóspedes das suas reservas).
--       guests não tem DELETE policy — eliminação via cascata
-- quando a reserva é eliminada, ou pela API que usa admin client.
-- ============================================================

DROP POLICY IF EXISTS "guests_insert" ON public.guests;
DROP POLICY IF EXISTS "guests_update" ON public.guests;

CREATE POLICY "guests_insert"
  ON public.guests FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id = public.get_user_organization_id()
    AND EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid()
        AND role IN ('admin', 'manager')
    )
  );

CREATE POLICY "guests_update"
  ON public.guests FOR UPDATE
  TO authenticated
  USING (
    organization_id = public.get_user_organization_id()
    AND EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid()
        AND role IN ('admin', 'manager')
    )
  )
  WITH CHECK (
    organization_id = public.get_user_organization_id()
  );
