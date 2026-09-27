-- Rollback parcial: restaura o default. Os valores anulados (0.15 fictício e datas) não são recriados
-- — restaurar de um backup (scripts/backup-producao.sh) se for realmente necessário.
alter table public.reservations alter column commission_rate set default 0.15;
comment on column public.reservations.commission_amount is null;
comment on column public.reservations.commission_rate is null;
comment on column public.reservations.commission_calculated_at is null;
