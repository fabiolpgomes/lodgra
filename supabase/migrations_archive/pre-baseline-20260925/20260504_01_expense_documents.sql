-- expense_documents: associate files/receipts with expenses
CREATE TABLE IF NOT EXISTS expense_documents (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id  uuid        NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  file_name   text        NOT NULL,
  file_path   text        NOT NULL,
  file_size   integer,
  mime_type   text,
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_expense_documents_expense_id ON expense_documents(expense_id);

ALTER TABLE expense_documents ENABLE ROW LEVEL SECURITY;

-- Access mirrors the expenses table: org members can read/write their org's documents
CREATE POLICY "expense_documents_org_select" ON expense_documents
  FOR SELECT USING (
    expense_id IN (
      SELECT e.id FROM expenses e
      JOIN properties p ON e.property_id = p.id
      WHERE p.organization_id = (
        SELECT organization_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "expense_documents_org_insert" ON expense_documents
  FOR INSERT WITH CHECK (
    expense_id IN (
      SELECT e.id FROM expenses e
      JOIN properties p ON e.property_id = p.id
      WHERE p.organization_id = (
        SELECT organization_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "expense_documents_org_delete" ON expense_documents
  FOR DELETE USING (
    expense_id IN (
      SELECT e.id FROM expenses e
      JOIN properties p ON e.property_id = p.id
      WHERE p.organization_id = (
        SELECT organization_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

-- Storage bucket (private, access via signed URLs only)
INSERT INTO storage.buckets (id, name, public)
  VALUES ('expense-documents', 'expense-documents', false)
  ON CONFLICT (id) DO NOTHING;

-- Storage policies: authenticated users can manage objects in this bucket
-- (fine-grained access enforced at the API layer)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'expense_documents_storage_select'
  ) THEN
    CREATE POLICY "expense_documents_storage_select" ON storage.objects
      FOR SELECT USING (bucket_id = 'expense-documents' AND auth.role() = 'authenticated');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'expense_documents_storage_insert'
  ) THEN
    CREATE POLICY "expense_documents_storage_insert" ON storage.objects
      FOR INSERT WITH CHECK (bucket_id = 'expense-documents' AND auth.role() = 'authenticated');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'expense_documents_storage_delete'
  ) THEN
    CREATE POLICY "expense_documents_storage_delete" ON storage.objects
      FOR DELETE USING (bucket_id = 'expense-documents' AND auth.role() = 'authenticated');
  END IF;
END $$;
