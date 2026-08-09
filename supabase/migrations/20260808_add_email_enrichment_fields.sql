-- ============================================================
-- Email Enrichment: Add fields to email_parse_log
-- Story 44.2 — Phase 2 Email-to-Property Auto-Detection
-- ============================================================

ALTER TABLE public.email_parse_log
ADD COLUMN IF NOT EXISTS property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS matched_reservation_id UUID REFERENCES public.reservations(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS is_cancellation BOOLEAN DEFAULT FALSE;

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_email_parse_log_property ON public.email_parse_log (property_id);
CREATE INDEX IF NOT EXISTS idx_email_parse_log_matched_res ON public.email_parse_log (matched_reservation_id);
CREATE INDEX IF NOT EXISTS idx_email_parse_log_cancellation ON public.email_parse_log (is_cancellation);

COMMENT ON COLUMN public.email_parse_log.property_id IS 'Auto-detected property from email domain (if available)';
COMMENT ON COLUMN public.email_parse_log.matched_reservation_id IS 'iCal reservation matched and enriched with email data';
COMMENT ON COLUMN public.email_parse_log.is_cancellation IS 'Email detected as cancellation';
