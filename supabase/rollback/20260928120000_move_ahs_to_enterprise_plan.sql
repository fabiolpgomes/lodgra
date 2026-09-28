-- Rollback de 20260928120000_move_ahs_to_enterprise_plan.sql
update public.organizations
   set subscription_plan = 'premium',
       updated_at = now()
 where slug = 'algarve-home-stay'
   and subscription_plan = 'enterprise';
