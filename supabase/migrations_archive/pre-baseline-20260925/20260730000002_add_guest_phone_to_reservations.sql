-- Migration: Add guest_phone column to reservations table
-- Purpose: Store guest phone number extracted from email confirmation
-- Story: Critical Fix #9 - Email Extraction Sync
-- Date: 2026-07-30

ALTER TABLE public.reservations
ADD COLUMN IF NOT EXISTS guest_phone TEXT;

COMMENT ON COLUMN public.reservations.guest_phone IS
  'Guest phone number extracted from booking confirmation email and synced via email_extractions';

CREATE INDEX IF NOT EXISTS idx_reservations_guest_phone
ON public.reservations(guest_phone)
WHERE guest_phone IS NOT NULL;
