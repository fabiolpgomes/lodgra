-- AHS: desliga a conta conectada criada com e-mail errado (acct_1ULidn2cNFP5D6vz).
-- O tenant volta a "Não configurado" e pode criar uma nova conta pelo Lodgra.
-- Enquanto não houver conta ativa, as reservas diretas da AHS usam o caminho antigo.
update public.organizations
   set stripe_connect_account_id = null,
       stripe_connect_platform = null,
       stripe_connect_status = 'none',
       stripe_connect_updated_at = now(),
       updated_at = now()
 where slug = 'algarve-home-stay'
   and stripe_connect_account_id = 'acct_1ULidn2cNFP5D6vz';
