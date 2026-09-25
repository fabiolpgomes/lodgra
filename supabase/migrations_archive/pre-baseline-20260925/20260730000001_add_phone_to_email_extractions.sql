-- Migration: Add phone column to email_extractions table
-- Purpose: Store extracted guest phone numbers from emails
-- Story: Critical Fix #9 - Email Extraction Sync
-- Date: 2026-07-30

ALTER TABLE public.email_extractions
ADD COLUMN IF NOT EXISTS phone TEXT;

COMMENT ON COLUMN public.email_extractions.phone IS
  'Guest phone number extracted from confirmation email (Booking.com, Airbnb, VRBO)';

CREATE INDEX IF NOT EXISTS idx_email_extractions_phone
ON public.email_extractions(phone)
WHERE phone IS NOT NULL;
