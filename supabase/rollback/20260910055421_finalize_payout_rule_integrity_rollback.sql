BEGIN;

DROP TRIGGER IF EXISTS organization_financial_settings_touch_updated_at
ON public.organization_financial_settings;
DROP TRIGGER IF EXISTS channel_payouts_touch_updated_at
ON public.channel_payouts;
DROP FUNCTION IF EXISTS public.touch_updated_at();

-- NULL and UTC validation hardening is monotonic. Restoring ambiguous or
-- bypassable comparisons would reopen data-integrity defects.

COMMIT;
