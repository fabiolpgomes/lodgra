-- Add 'development' plan for testing/lab environments
-- Purpose: Allow up to 99 properties for development and testing organizations

ALTER TABLE organizations
DROP CONSTRAINT IF EXISTS organizations_subscription_plan_check;

ALTER TABLE organizations
ADD CONSTRAINT organizations_subscription_plan_check
CHECK (subscription_plan IN ('essencial', 'expansao', 'premium', 'enterprise', 'starter', 'growth', 'professional', 'business', 'pro', 'development'));

-- Update Algarve Home Stay to development plan (99 properties)
UPDATE organizations
SET subscription_plan = 'development'
WHERE name = 'Algarve Home Stay';
