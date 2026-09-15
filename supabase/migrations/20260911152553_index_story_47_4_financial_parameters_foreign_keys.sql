BEGIN;

CREATE INDEX property_financial_parameters_property_fk
  ON public.property_financial_parameters (property_id, organization_id);

CREATE INDEX property_financial_parameters_created_by_fk
  ON public.property_financial_parameters (created_by)
  WHERE created_by IS NOT NULL;

COMMIT;
