-- Rollback: Remover política pública de comodidades
-- Migration: 20260611000000_property_amenities_public_policy.sql

DROP POLICY IF EXISTS "property_amenities_select_public" ON property_amenities;

-- Verificação
SELECT tablename, policyname, qual
FROM pg_policies
WHERE tablename = 'property_amenities'
ORDER BY policyname;
