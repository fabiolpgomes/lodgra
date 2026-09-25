-- Restore the discount configuration table removed by the pricing rollback.
-- The calendar settings card persists weekly, monthly and loyalty discounts here.

CREATE TABLE IF NOT EXISTS public.property_discounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  discount_type TEXT NOT NULL CHECK (
    discount_type IN ('weekly', 'monthly', 'excellent_guest', 'last_minute', 'advance')
  ),
  percentage INTEGER NOT NULL CHECK (percentage >= 0 AND percentage <= 100),
  min_nights INTEGER DEFAULT 1,
  conditions JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(property_id, discount_type)
);

CREATE INDEX IF NOT EXISTS idx_property_discounts_property_id
  ON public.property_discounts(property_id);

CREATE INDEX IF NOT EXISTS idx_property_discounts_type
  ON public.property_discounts(property_id, discount_type);

ALTER TABLE public.property_discounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "property_discounts_select" ON public.property_discounts;
DROP POLICY IF EXISTS "property_discounts_all" ON public.property_discounts;
DROP POLICY IF EXISTS "Users can view own property discounts" ON public.property_discounts;
DROP POLICY IF EXISTS "Users can manage own property discounts" ON public.property_discounts;

CREATE POLICY "property_discounts_select"
  ON public.property_discounts FOR SELECT
  USING (
    property_id IN (
      SELECT p.id
      FROM public.properties p
      JOIN public.owners o ON p.owner_id = o.id
      WHERE o.user_id = auth.uid()
    )
  );

CREATE POLICY "property_discounts_all"
  ON public.property_discounts FOR ALL
  USING (
    property_id IN (
      SELECT p.id
      FROM public.properties p
      JOIN public.owners o ON p.owner_id = o.id
      WHERE o.user_id = auth.uid()
    )
  )
  WITH CHECK (
    property_id IN (
      SELECT p.id
      FROM public.properties p
      JOIN public.owners o ON p.owner_id = o.id
      WHERE o.user_id = auth.uid()
    )
  );
