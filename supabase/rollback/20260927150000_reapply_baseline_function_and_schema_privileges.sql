-- Rollback de 20260927150000: não há estado anterior a restaurar.
-- A migration só reaplica os privilégios que a baseline de produção já define;
-- em produção o efeito é nulo. Desfazê-la no staging reintroduziria o drift
-- (authenticated sem USAGE em lodgra_private), então não há rollback funcional.
select 1;
