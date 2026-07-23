-- Migration: Add guest fields to reservations table
-- Purpose: Store guest first_name, last_name, and discount_amount
-- Date: 2026-07-23
-- Story: 39.1 - Guest name and fee population across reservation endpoints

-- Add columns to reservations table
ALTER TABLE reservations
ADD COLUMN IF NOT EXISTS first_name TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS last_name TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10,2) DEFAULT 0;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_reservations_first_name
ON reservations(first_name);

CREATE INDEX IF NOT EXISTS idx_reservations_last_name
ON reservations(last_name);

CREATE INDEX IF NOT EXISTS idx_reservations_discount_amount
ON reservations(discount_amount)
WHERE discount_amount > 0;

-- Update RLS policies if needed (existing policies should cover these new columns)
-- Comment: These columns are populated by system APIs only, not user-facing forms
