-- ============================================================
-- Audit Logs — registra operações sensíveis realizadas por utilizadores
-- Aplicar no Supabase Dashboard > SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  action        TEXT        NOT NULL CHECK (action IN ('create', 'update', 'delete')),
  resource_type TEXT        NOT NULL,
  resource_id   TEXT,
  details       JSONB,
  ip_address    TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Índices para consultas comuns
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id    ON audit_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource   ON audit_logs (resource_type, resource_id);

-- RLS: somente admins podem ler; inserção via service role (API)
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins podem ler audit logs"
  ON audit_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Nenhum utilizador pode alterar ou apagar logs de auditoria
-- (inserção é feita via service role key nas API routes)
