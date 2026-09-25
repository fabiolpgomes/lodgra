-- ============================================================
-- Performance: RPC get_my_profile() — auth + perfil em 1 call
--
-- Contexto: requireRole() fazia 2 chamadas em série em cada request:
--   1. supabase.auth.getUser()     → HTTP ao serviço de Auth (~50ms)
--   2. user_profiles.select(...)   → query à DB (~5ms)
--
-- Nova estratégia (com Redis cache de #2):
--   Cache HIT:  getSession() [local, ~0ms] + Redis [~1ms]  = ~1ms
--   Cache MISS: getSession() [local, ~0ms] + RPC [~15ms]   = ~15ms
--   vs. antes:  getUser()   [HTTP, ~50ms]  + DB  [~5ms]    = ~55ms
--
-- SECURITY DEFINER: contorna RLS para evitar recursão com
-- get_user_organization_id() e eliminar overhead de policy eval.
-- Safe: WHERE id = auth.uid() garante retorno só do próprio perfil.
-- auth.uid() = NULL se JWT inválido/expirado → 0 linhas → 401 no app.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_my_profile()
RETURNS TABLE(
  user_id               uuid,
  role                  text,
  access_all_properties boolean,
  organization_id       uuid
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    auth.uid()             AS user_id,
    up.role,
    up.access_all_properties,
    up.organization_id
  FROM public.user_profiles up
  WHERE up.id = auth.uid();
$$;
