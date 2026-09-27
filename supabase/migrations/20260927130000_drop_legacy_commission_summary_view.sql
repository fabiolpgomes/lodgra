-- O módulo legado de comissões (/dashboard/reports, /api/commissions/*) foi removido:
-- ele lia reservations.commission_amount, que nunca é preenchido (comissão de gestão
-- é calculada pela Epic 47 — regras de repasse e snapshots financeiros).
drop view if exists public.commission_summary;
