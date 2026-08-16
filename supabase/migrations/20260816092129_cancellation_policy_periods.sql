-- Store date-specific cancellation policy overrides selected from the calendar.
-- The property_cancellation_policies table remains the source of reusable
-- policy definitions; this table only maps a definition to a date range.

-- The earlier cancellation-policy migration was not present in every deployed
-- environment. Keep this migration self-contained for fresh and drifted DBs.
CREATE TABLE IF NOT EXISTS public.property_cancellation_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  policy_type TEXT NOT NULL CHECK (policy_type IN ('flexible', 'moderate', 'limited', 'firm', 'rigid')),
  is_long_stay BOOLEAN NOT NULL,
  full_refund_days INT NOT NULL CHECK (full_refund_days >= 0),
  partial_refund_days INT CHECK (partial_refund_days IS NULL OR partial_refund_days >= 0),
  partial_refund_percent INT CHECK (partial_refund_percent IS NULL OR (partial_refund_percent >= 0 AND partial_refund_percent <= 100)),
  non_refundable_discount_percent INT NOT NULL DEFAULT 0 CHECK (non_refundable_discount_percent >= 0 AND non_refundable_discount_percent <= 100),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT property_cancellation_policies_unique_type_duration UNIQUE (property_id, policy_type, is_long_stay)
);

ALTER TABLE public.property_cancellation_policies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS property_cancellation_policies_select ON public.property_cancellation_policies;
DROP POLICY IF EXISTS property_cancellation_policies_insert ON public.property_cancellation_policies;
DROP POLICY IF EXISTS property_cancellation_policies_update ON public.property_cancellation_policies;
DROP POLICY IF EXISTS property_cancellation_policies_delete ON public.property_cancellation_policies;
DROP POLICY IF EXISTS property_cancellation_policies_all ON public.property_cancellation_policies;
DROP POLICY IF EXISTS "Users can view own property cancellation policies" ON public.property_cancellation_policies;
DROP POLICY IF EXISTS "Users can manage own property cancellation policies" ON public.property_cancellation_policies;

CREATE POLICY property_cancellation_policies_select
  ON public.property_cancellation_policies FOR SELECT TO authenticated
  USING (property_id IN (
    SELECT p.id FROM public.properties p
    JOIN public.owners o ON o.id = p.owner_id
    WHERE o.user_id = auth.uid()
  ));

CREATE POLICY property_cancellation_policies_insert
  ON public.property_cancellation_policies FOR INSERT TO authenticated
  WITH CHECK (property_id IN (
    SELECT p.id FROM public.properties p
    JOIN public.owners o ON o.id = p.owner_id
    WHERE o.user_id = auth.uid()
  ));

CREATE POLICY property_cancellation_policies_update
  ON public.property_cancellation_policies FOR UPDATE TO authenticated
  USING (property_id IN (
    SELECT p.id FROM public.properties p
    JOIN public.owners o ON o.id = p.owner_id
    WHERE o.user_id = auth.uid()
  ))
  WITH CHECK (property_id IN (
    SELECT p.id FROM public.properties p
    JOIN public.owners o ON o.id = p.owner_id
    WHERE o.user_id = auth.uid()
  ));

CREATE POLICY property_cancellation_policies_delete
  ON public.property_cancellation_policies FOR DELETE TO authenticated
  USING (property_id IN (
    SELECT p.id FROM public.properties p
    JOIN public.owners o ON o.id = p.owner_id
    WHERE o.user_id = auth.uid()
  ));

CREATE TABLE IF NOT EXISTS public.property_cancellation_policy_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  policy_id UUID NOT NULL REFERENCES public.property_cancellation_policies(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT property_cancellation_policy_periods_dates_check CHECK (start_date <= end_date),
  CONSTRAINT property_cancellation_policy_periods_unique_range UNIQUE (property_id, start_date, end_date)
);

CREATE INDEX IF NOT EXISTS idx_cancellation_policy_periods_lookup
  ON public.property_cancellation_policy_periods (property_id, start_date, end_date);

ALTER TABLE public.property_cancellation_policy_periods ENABLE ROW LEVEL SECURITY;

CREATE POLICY property_cancellation_policy_periods_select
  ON public.property_cancellation_policy_periods FOR SELECT
  TO authenticated
  USING (
    property_id IN (
      SELECT p.id
      FROM public.properties p
      JOIN public.owners o ON o.id = p.owner_id
      WHERE o.user_id = auth.uid()
    )
  );

CREATE POLICY property_cancellation_policy_periods_insert
  ON public.property_cancellation_policy_periods FOR INSERT
  TO authenticated
  WITH CHECK (
    property_id IN (
      SELECT p.id
      FROM public.properties p
      JOIN public.owners o ON o.id = p.owner_id
      WHERE o.user_id = auth.uid()
    )
  );

CREATE POLICY property_cancellation_policy_periods_update
  ON public.property_cancellation_policy_periods FOR UPDATE
  TO authenticated
  USING (
    property_id IN (
      SELECT p.id
      FROM public.properties p
      JOIN public.owners o ON o.id = p.owner_id
      WHERE o.user_id = auth.uid()
    )
  )
  WITH CHECK (
    property_id IN (
      SELECT p.id
      FROM public.properties p
      JOIN public.owners o ON o.id = p.owner_id
      WHERE o.user_id = auth.uid()
    )
  );

CREATE POLICY property_cancellation_policy_periods_delete
  ON public.property_cancellation_policy_periods FOR DELETE
  TO authenticated
  USING (
    property_id IN (
      SELECT p.id
      FROM public.properties p
      JOIN public.owners o ON o.id = p.owner_id
      WHERE o.user_id = auth.uid()
    )
  );

COMMENT ON TABLE public.property_cancellation_policy_periods IS
  'Calendar date-range overrides for a property cancellation policy.';
