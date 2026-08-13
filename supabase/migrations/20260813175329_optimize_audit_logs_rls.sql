DROP POLICY IF EXISTS "Admins podem ler audit logs" ON public.audit_logs;

CREATE POLICY audit_logs_admin_select
ON public.audit_logs FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = (SELECT auth.uid()) AND up.role = 'admin'
  )
);
