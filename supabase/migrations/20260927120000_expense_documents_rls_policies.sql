-- expense_documents tinha RLS ativo e NENHUMA policy (as da migration 20260504_01 nunca foram
-- aplicadas): o insert feito pela API /api/expenses/[id]/documents (cliente do usuário) era
-- recusado e a listagem voltava vazia. Policies por organização, via a despesa dona do documento.

create policy expense_documents_tenant_select on public.expense_documents
  for select to authenticated
  using (exists (
    select 1 from public.expenses e
    where e.id = expense_documents.expense_id
      and e.organization_id = public.get_user_organization_id()
  ));

create policy expense_documents_tenant_insert on public.expense_documents
  for insert to authenticated
  with check (exists (
    select 1 from public.expenses e
    where e.id = expense_documents.expense_id
      and e.organization_id = public.get_user_organization_id()
  ));

create policy expense_documents_tenant_delete on public.expense_documents
  for delete to authenticated
  using (exists (
    select 1 from public.expenses e
    where e.id = expense_documents.expense_id
      and e.organization_id = public.get_user_organization_id()
  ));

-- Tabela nunca deve ser acessada sem login.
revoke all on public.expense_documents from anon;
