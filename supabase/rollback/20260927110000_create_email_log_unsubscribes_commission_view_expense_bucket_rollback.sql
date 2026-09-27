-- Rollback de 20260927110000. Atenção: apaga os registros de e-mail/unsubscribe criados desde então.
delete from storage.buckets where id = 'expense-documents'; -- falha se houver objetos no bucket (esvazie antes)
drop view if exists public.commission_summary;
drop table if exists public.email_sent;
drop table if exists public.email_unsubscribes;
