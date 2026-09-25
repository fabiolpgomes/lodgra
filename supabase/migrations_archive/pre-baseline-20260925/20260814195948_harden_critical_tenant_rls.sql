-- Restore tenant-scoped policies lost through production schema drift. Tables
-- containing credentials, email bodies, or audit data are intentionally
-- restricted to organization administrators and managers.

CREATE INDEX IF NOT EXISTS idx_cleaning_checklist_templates_organization_id
  ON public.cleaning_checklist_templates (organization_id);
CREATE INDEX IF NOT EXISTS idx_analytics_config_audit_log_organization_id
  ON public.analytics_config_audit_log (organization_id);
CREATE INDEX IF NOT EXISTS idx_google_feed_logs_organization_id
  ON public.google_feed_logs (organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_analytics_config_organization_id
  ON public.organization_analytics_config (organization_id);
CREATE INDEX IF NOT EXISTS idx_raw_emails_organization_id
  ON public.raw_emails (organization_id);

ALTER TABLE public.analytics_config_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cleaning_checklist_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.google_feed_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_analytics_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.raw_emails ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS analytics_config_audit_log_tenant_select ON public.analytics_config_audit_log;
CREATE POLICY analytics_config_audit_log_tenant_select
ON public.analytics_config_audit_log
FOR SELECT TO authenticated
USING (
  organization_id = (SELECT public.get_user_organization_id())
  AND EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = (SELECT auth.uid())
      AND up.organization_id = analytics_config_audit_log.organization_id
      AND up.role IN ('admin', 'manager', 'gestor')
  )
);

DROP POLICY IF EXISTS cleaning_templates_select_by_org ON public.cleaning_checklist_templates;
DROP POLICY IF EXISTS cleaning_templates_insert_by_manager ON public.cleaning_checklist_templates;
DROP POLICY IF EXISTS cleaning_templates_update_by_manager ON public.cleaning_checklist_templates;
DROP POLICY IF EXISTS cleaning_templates_delete_by_manager ON public.cleaning_checklist_templates;
DROP POLICY IF EXISTS cleaning_checklist_templates_select ON public.cleaning_checklist_templates;
DROP POLICY IF EXISTS cleaning_checklist_templates_insert ON public.cleaning_checklist_templates;
DROP POLICY IF EXISTS cleaning_checklist_templates_update ON public.cleaning_checklist_templates;
DROP POLICY IF EXISTS cleaning_checklist_templates_tenant_select ON public.cleaning_checklist_templates;
DROP POLICY IF EXISTS cleaning_checklist_templates_tenant_insert ON public.cleaning_checklist_templates;
DROP POLICY IF EXISTS cleaning_checklist_templates_tenant_update ON public.cleaning_checklist_templates;
DROP POLICY IF EXISTS cleaning_checklist_templates_tenant_delete ON public.cleaning_checklist_templates;

CREATE POLICY cleaning_checklist_templates_tenant_select
ON public.cleaning_checklist_templates
FOR SELECT TO authenticated
USING (organization_id = (SELECT public.get_user_organization_id()));

CREATE POLICY cleaning_checklist_templates_tenant_insert
ON public.cleaning_checklist_templates
FOR INSERT TO authenticated
WITH CHECK (
  organization_id = (SELECT public.get_user_organization_id())
  AND EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = (SELECT auth.uid())
      AND up.organization_id = cleaning_checklist_templates.organization_id
      AND up.role IN ('admin', 'manager', 'gestor')
  )
);

CREATE POLICY cleaning_checklist_templates_tenant_update
ON public.cleaning_checklist_templates
FOR UPDATE TO authenticated
USING (
  organization_id = (SELECT public.get_user_organization_id())
  AND EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = (SELECT auth.uid())
      AND up.organization_id = cleaning_checklist_templates.organization_id
      AND up.role IN ('admin', 'manager', 'gestor')
  )
)
WITH CHECK (organization_id = (SELECT public.get_user_organization_id()));

CREATE POLICY cleaning_checklist_templates_tenant_delete
ON public.cleaning_checklist_templates
FOR DELETE TO authenticated
USING (
  organization_id = (SELECT public.get_user_organization_id())
  AND EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = (SELECT auth.uid())
      AND up.organization_id = cleaning_checklist_templates.organization_id
      AND up.role IN ('admin', 'manager', 'gestor')
  )
);

ALTER TABLE public.cleaning_checklist_items ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_cleaning_checklist_items_template_id
  ON public.cleaning_checklist_items (template_id);

DROP POLICY IF EXISTS cleaning_checklist_items_tenant_select ON public.cleaning_checklist_items;
DROP POLICY IF EXISTS cleaning_checklist_items_tenant_insert ON public.cleaning_checklist_items;
DROP POLICY IF EXISTS cleaning_checklist_items_tenant_update ON public.cleaning_checklist_items;
DROP POLICY IF EXISTS cleaning_checklist_items_tenant_delete ON public.cleaning_checklist_items;
DROP POLICY IF EXISTS cleaning_items_select_through_template ON public.cleaning_checklist_items;
DROP POLICY IF EXISTS cleaning_items_insert_through_template ON public.cleaning_checklist_items;
DROP POLICY IF EXISTS cleaning_items_update_through_template ON public.cleaning_checklist_items;
DROP POLICY IF EXISTS cleaning_items_delete_through_template ON public.cleaning_checklist_items;

CREATE POLICY cleaning_checklist_items_tenant_select
ON public.cleaning_checklist_items
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.cleaning_checklist_templates t
    WHERE t.id = cleaning_checklist_items.template_id
      AND t.organization_id = (SELECT public.get_user_organization_id())
  )
);

CREATE POLICY cleaning_checklist_items_tenant_insert
ON public.cleaning_checklist_items
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.cleaning_checklist_templates t
    JOIN public.user_profiles up
      ON up.id = (SELECT auth.uid())
     AND up.organization_id = t.organization_id
     AND up.role IN ('admin', 'manager', 'gestor')
    WHERE t.id = cleaning_checklist_items.template_id
      AND t.organization_id = (SELECT public.get_user_organization_id())
  )
);

CREATE POLICY cleaning_checklist_items_tenant_update
ON public.cleaning_checklist_items
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.cleaning_checklist_templates t
    JOIN public.user_profiles up
      ON up.id = (SELECT auth.uid())
     AND up.organization_id = t.organization_id
     AND up.role IN ('admin', 'manager', 'gestor')
    WHERE t.id = cleaning_checklist_items.template_id
      AND t.organization_id = (SELECT public.get_user_organization_id())
  )
);

CREATE POLICY cleaning_checklist_items_tenant_delete
ON public.cleaning_checklist_items
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.cleaning_checklist_templates t
    JOIN public.user_profiles up
      ON up.id = (SELECT auth.uid())
     AND up.organization_id = t.organization_id
     AND up.role IN ('admin', 'manager', 'gestor')
    WHERE t.id = cleaning_checklist_items.template_id
      AND t.organization_id = (SELECT public.get_user_organization_id())
  )
);

ALTER TABLE public.cleaning_checklist_responses ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_cleaning_checklist_responses_task_id
  ON public.cleaning_checklist_responses (task_id);

DROP POLICY IF EXISTS cleaning_checklist_responses_tenant_select ON public.cleaning_checklist_responses;
DROP POLICY IF EXISTS cleaning_checklist_responses_tenant_insert ON public.cleaning_checklist_responses;
DROP POLICY IF EXISTS cleaning_checklist_responses_tenant_update ON public.cleaning_checklist_responses;
DROP POLICY IF EXISTS cleaning_responses_select_through_task ON public.cleaning_checklist_responses;
DROP POLICY IF EXISTS cleaning_responses_insert_through_task ON public.cleaning_checklist_responses;
DROP POLICY IF EXISTS cleaning_responses_update_through_task ON public.cleaning_checklist_responses;

CREATE POLICY cleaning_checklist_responses_tenant_select
ON public.cleaning_checklist_responses
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.cleaning_tasks t
    WHERE t.id = cleaning_checklist_responses.task_id
      AND t.organization_id = (SELECT public.get_user_organization_id())
  )
);

CREATE POLICY cleaning_checklist_responses_tenant_insert
ON public.cleaning_checklist_responses
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.cleaning_tasks t
    WHERE t.id = cleaning_checklist_responses.task_id
      AND t.organization_id = (SELECT public.get_user_organization_id())
  )
);

CREATE POLICY cleaning_checklist_responses_tenant_update
ON public.cleaning_checklist_responses
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.cleaning_tasks t
    WHERE t.id = cleaning_checklist_responses.task_id
      AND t.organization_id = (SELECT public.get_user_organization_id())
  )
);

ALTER TABLE public.cleaning_photos ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_cleaning_photos_task_id
  ON public.cleaning_photos (task_id);

DROP POLICY IF EXISTS cleaning_photos_tenant_select ON public.cleaning_photos;
DROP POLICY IF EXISTS cleaning_photos_tenant_insert ON public.cleaning_photos;
DROP POLICY IF EXISTS cleaning_photos_tenant_delete ON public.cleaning_photos;
DROP POLICY IF EXISTS cleaning_photos_select_through_task ON public.cleaning_photos;
DROP POLICY IF EXISTS cleaning_photos_insert_through_task ON public.cleaning_photos;
DROP POLICY IF EXISTS cleaning_photos_delete_by_uploader ON public.cleaning_photos;

CREATE POLICY cleaning_photos_tenant_select
ON public.cleaning_photos
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.cleaning_tasks t
    WHERE t.id = cleaning_photos.task_id
      AND t.organization_id = (SELECT public.get_user_organization_id())
  )
);

CREATE POLICY cleaning_photos_tenant_insert
ON public.cleaning_photos
FOR INSERT TO authenticated
WITH CHECK (
  uploader_id = (SELECT auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.cleaning_tasks t
    WHERE t.id = cleaning_photos.task_id
      AND t.organization_id = (SELECT public.get_user_organization_id())
  )
);

CREATE POLICY cleaning_photos_tenant_delete
ON public.cleaning_photos
FOR DELETE TO authenticated
USING (
  uploader_id = (SELECT auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.cleaning_tasks t
    WHERE t.id = cleaning_photos.task_id
      AND t.organization_id = (SELECT public.get_user_organization_id())
  )
);

DROP POLICY IF EXISTS google_feed_logs_select_policy ON public.google_feed_logs;
DROP POLICY IF EXISTS google_feed_logs_insert_policy ON public.google_feed_logs;
DROP POLICY IF EXISTS google_feed_logs_tenant_select ON public.google_feed_logs;
CREATE POLICY google_feed_logs_tenant_select
ON public.google_feed_logs
FOR SELECT TO authenticated
USING (
  organization_id = (SELECT public.get_user_organization_id())
  AND EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = (SELECT auth.uid())
      AND up.organization_id = google_feed_logs.organization_id
      AND up.role IN ('admin', 'manager', 'gestor')
  )
);

DROP POLICY IF EXISTS organization_analytics_config_tenant_select ON public.organization_analytics_config;
DROP POLICY IF EXISTS organization_analytics_config_tenant_insert ON public.organization_analytics_config;
DROP POLICY IF EXISTS organization_analytics_config_tenant_update ON public.organization_analytics_config;
CREATE POLICY organization_analytics_config_tenant_select
ON public.organization_analytics_config
FOR SELECT TO authenticated
USING (
  organization_id = (SELECT public.get_user_organization_id())
  AND EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = (SELECT auth.uid())
      AND up.organization_id = organization_analytics_config.organization_id
      AND up.role = 'admin'
  )
);

CREATE POLICY organization_analytics_config_tenant_insert
ON public.organization_analytics_config
FOR INSERT TO authenticated
WITH CHECK (
  organization_id = (SELECT public.get_user_organization_id())
  AND EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = (SELECT auth.uid())
      AND up.organization_id = organization_analytics_config.organization_id
      AND up.role = 'admin'
  )
);

CREATE POLICY organization_analytics_config_tenant_update
ON public.organization_analytics_config
FOR UPDATE TO authenticated
USING (
  organization_id = (SELECT public.get_user_organization_id())
  AND EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = (SELECT auth.uid())
      AND up.organization_id = organization_analytics_config.organization_id
      AND up.role = 'admin'
  )
)
WITH CHECK (organization_id = (SELECT public.get_user_organization_id()));

DROP POLICY IF EXISTS raw_emails_tenant_select ON public.raw_emails;
CREATE POLICY raw_emails_tenant_select
ON public.raw_emails
FOR SELECT TO authenticated
USING (
  organization_id = (SELECT public.get_user_organization_id())
  AND EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = (SELECT auth.uid())
      AND up.organization_id = raw_emails.organization_id
      AND up.role IN ('admin', 'manager', 'gestor')
  )
);
