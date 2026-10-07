-- Story 38.1 — Gmail staging keyed by mailbox instead of connection row.
-- Reconnecting Gmail recreated email_connections.id and re-imported every message.
-- Data-only and idempotent: rekeys old "<connection uuid>:<gmail id>" rows to "<mailbox>:<gmail id>",
-- drops duplicates that were never extracted, requeues messages classified by the previous rules
-- and removes the body of stored security-code emails.
BEGIN;

-- 1. Drop duplicate imports (same mailbox + Gmail id) that have no extraction attached.
WITH keyed AS (
  SELECT re.id, re.organization_id, re.processing_status, re.created_at,
         lower(btrim(re.recipient)) || ':' || split_part(re.provider_message_id, ':', 2) AS new_key,
         EXISTS (SELECT 1 FROM public.email_extractions e WHERE e.raw_email_id = re.id) AS has_extraction
  FROM public.raw_emails re
  WHERE re.provider = 'gmail' AND re.provider_message_id ~ '^[0-9a-f-]{36}:'
), ranked AS (
  SELECT k.*, row_number() OVER (
    PARTITION BY k.organization_id, k.new_key
    ORDER BY k.has_extraction DESC, (k.processing_status <> 'pending') DESC, k.created_at, k.id
  ) AS rn
  FROM keyed k
)
DELETE FROM public.raw_emails re
USING ranked r
WHERE re.id = r.id AND r.rn > 1 AND NOT r.has_extraction;

-- 2. Rekey the surviving row of each message (any remaining extracted duplicate keeps its legacy key).
WITH ranked AS (
  SELECT re.id,
         lower(btrim(re.recipient)) || ':' || split_part(re.provider_message_id, ':', 2) AS new_key,
         row_number() OVER (
           PARTITION BY re.organization_id, lower(btrim(re.recipient)) || ':' || split_part(re.provider_message_id, ':', 2)
           ORDER BY EXISTS (SELECT 1 FROM public.email_extractions e WHERE e.raw_email_id = re.id) DESC, re.created_at, re.id
         ) AS rn
  FROM public.raw_emails re
  WHERE re.provider = 'gmail' AND re.provider_message_id ~ '^[0-9a-f-]{36}:'
)
UPDATE public.raw_emails re
SET provider_message_id = r.new_key, updated_at = now()
FROM ranked r
WHERE re.id = r.id AND r.rn = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.raw_emails o
    WHERE o.organization_id = re.organization_id AND o.provider = 'gmail' AND o.provider_message_id = r.new_key
  );

-- 3. Never keep the body of security-code emails.
UPDATE public.raw_emails
SET raw_content = '[conteúdo descartado: mensagem sem dados de reserva]',
    processing_status = 'rejected', last_error = 'NOT_A_RESERVATION_MESSAGE', updated_at = now()
WHERE provider = 'gmail'
  AND translate(lower(coalesce(subject, '')), 'áàãâéêíóôõúç', 'aaaaeeiooouc') ~ '(codigo de verificacao|verification code|security code|codigo de seguranca)'
  AND raw_content <> '[conteúdo descartado: mensagem sem dados de reserva]';

-- 4. Re-evaluate messages parked by the previous classifier (e.g. Airbnb "solicitação … foi confirmada").
UPDATE public.raw_emails re
SET processing_status = 'pending', attempt_count = 0, last_error = NULL, processed_at = NULL, updated_at = now()
WHERE re.processing_status = 'needs_review'
  AND re.last_error = 'MESSAGE_TYPE_REQUIRES_REVIEW'
  AND NOT EXISTS (SELECT 1 FROM public.email_extractions e WHERE e.raw_email_id = re.id);

COMMIT;
