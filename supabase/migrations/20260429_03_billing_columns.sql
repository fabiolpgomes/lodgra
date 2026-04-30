-- Billing columns for per-unit + metered Stripe subscriptions
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS stripe_subscription_item_id TEXT,   -- base licensed item (quantity = # properties)
  ADD COLUMN IF NOT EXISTS stripe_metered_item_id      TEXT,   -- metered item (usage records per booking / revenue)
  ADD COLUMN IF NOT EXISTS billing_unit_count          INTEGER NOT NULL DEFAULT 1; -- last synced property count
