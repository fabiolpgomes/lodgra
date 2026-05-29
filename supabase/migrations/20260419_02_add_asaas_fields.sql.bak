-- Add Asaas payment tracking fields to reservations
ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS asaas_payment_id TEXT,
  ADD COLUMN IF NOT EXISTS asaas_payment_link TEXT,
  ADD COLUMN IF NOT EXISTS asaas_status TEXT;

CREATE INDEX IF NOT EXISTS idx_reservations_asaas_id ON public.reservations(asaas_payment_id);
