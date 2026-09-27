drop policy if exists expense_documents_tenant_select on public.expense_documents;
drop policy if exists expense_documents_tenant_insert on public.expense_documents;
drop policy if exists expense_documents_tenant_delete on public.expense_documents;
grant all on public.expense_documents to anon;
