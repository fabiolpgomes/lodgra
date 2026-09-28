-- AHS (laboratório) passa de Premium para Enterprise.
-- Motivo: Premium passou a ter limite de 10 propriedades; a AHS tem 14.
-- Enterprise tem limite de 20. A AHS não tem assinatura Stripe, então
-- nenhum webhook reverte esta alteração.
update public.organizations
   set subscription_plan = 'enterprise',
       updated_at = now()
 where slug = 'algarve-home-stay'
   and subscription_plan = 'premium';
