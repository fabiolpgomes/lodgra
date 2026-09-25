-- Company operating expenses for partner/company dashboard.
-- These expenses belong to the organization, not to a property.

CREATE TABLE IF NOT EXISTS public.company_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount >= 0),
  currency VARCHAR(3) NOT NULL DEFAULT 'EUR',
  category VARCHAR(80) NOT NULL DEFAULT 'other',
  expense_date DATE NOT NULL,
  recurrence_type VARCHAR(20) NOT NULL DEFAULT 'none',
  recurrence_end_date DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'paid',
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT company_expenses_recurrence_type_check
    CHECK (recurrence_type IN ('none', 'monthly', 'yearly')),
  CONSTRAINT company_expenses_status_check
    CHECK (status IN ('paid', 'pending', 'planned', 'cancelled')),
  CONSTRAINT company_expenses_recurrence_end_check
    CHECK (recurrence_end_date IS NULL OR recurrence_end_date >= expense_date)
);

CREATE INDEX IF NOT EXISTS idx_company_expenses_org_date
  ON public.company_expenses (organization_id, expense_date DESC);

CREATE INDEX IF NOT EXISTS idx_company_expenses_org_category
  ON public.company_expenses (organization_id, category);

CREATE INDEX IF NOT EXISTS idx_company_expenses_org_status
  ON public.company_expenses (organization_id, status);

COMMENT ON TABLE public.company_expenses IS
  'Operational company expenses used by the internal company dashboard. Not tied to properties or owner settlements.';

COMMENT ON COLUMN public.company_expenses.recurrence_type IS
  'none: one occurrence; monthly: every month from expense_date until recurrence_end_date; yearly: every year on the expense_date month/day.';

ALTER TABLE public.company_expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS company_expenses_select ON public.company_expenses;
CREATE POLICY company_expenses_select
  ON public.company_expenses
  FOR SELECT
  TO authenticated
  USING (organization_id = public.get_user_organization_id());

DROP POLICY IF EXISTS company_expenses_insert ON public.company_expenses;
CREATE POLICY company_expenses_insert
  ON public.company_expenses
  FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id = public.get_user_organization_id()
    AND created_by = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.user_profiles
      WHERE id = auth.uid()
        AND organization_id = public.get_user_organization_id()
        AND role IN ('admin', 'gestor')
    )
  );

DROP POLICY IF EXISTS company_expenses_update ON public.company_expenses;
CREATE POLICY company_expenses_update
  ON public.company_expenses
  FOR UPDATE
  TO authenticated
  USING (
    organization_id = public.get_user_organization_id()
    AND EXISTS (
      SELECT 1
      FROM public.user_profiles
      WHERE id = auth.uid()
        AND organization_id = public.get_user_organization_id()
        AND role IN ('admin', 'gestor')
    )
  )
  WITH CHECK (
    organization_id = public.get_user_organization_id()
    AND EXISTS (
      SELECT 1
      FROM public.user_profiles
      WHERE id = auth.uid()
        AND organization_id = public.get_user_organization_id()
        AND role IN ('admin', 'gestor')
    )
  );

DROP POLICY IF EXISTS company_expenses_delete ON public.company_expenses;
CREATE POLICY company_expenses_delete
  ON public.company_expenses
  FOR DELETE
  TO authenticated
  USING (
    organization_id = public.get_user_organization_id()
    AND EXISTS (
      SELECT 1
      FROM public.user_profiles
      WHERE id = auth.uid()
        AND organization_id = public.get_user_organization_id()
        AND role IN ('admin', 'gestor')
    )
  );

DROP POLICY IF EXISTS "Service role full access company_expenses" ON public.company_expenses;
CREATE POLICY "Service role full access company_expenses"
  ON public.company_expenses
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.update_company_expenses_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS company_expenses_updated_at_trigger ON public.company_expenses;
CREATE TRIGGER company_expenses_updated_at_trigger
  BEFORE UPDATE ON public.company_expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_company_expenses_updated_at();
