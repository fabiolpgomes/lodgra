-- ============================================================
-- Índice em user_profiles(email)
--
-- Necessário para o webhook Stripe procurar utilizadores
-- existentes por email em O(log n) em vez de O(n).
--
-- Sem este índice, qualquer lookup por email (webhook, users API)
-- faz um full table scan — inaceitável com múltiplos tenants.
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_user_profiles_email
  ON public.user_profiles (email);
