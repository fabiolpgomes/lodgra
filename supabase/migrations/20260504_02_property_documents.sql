-- property_documents: contracts, proofs, instruction videos per property
CREATE TABLE IF NOT EXISTS property_documents (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id   uuid        NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  file_name     text        NOT NULL,
  file_path     text        NOT NULL,
  file_size     integer,
  mime_type     text,
  document_type text        DEFAULT 'other', -- 'contract', 'proof', 'video', 'other'
  created_at    timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_property_documents_property_id ON property_documents(property_id);

ALTER TABLE property_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "property_documents_org_select" ON property_documents
  FOR SELECT USING (
    property_id IN (
      SELECT id FROM properties
      WHERE organization_id = (
        SELECT organization_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "property_documents_org_insert" ON property_documents
  FOR INSERT WITH CHECK (
    property_id IN (
      SELECT id FROM properties
      WHERE organization_id = (
        SELECT organization_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "property_documents_org_delete" ON property_documents
  FOR DELETE USING (
    property_id IN (
      SELECT id FROM properties
      WHERE organization_id = (
        SELECT organization_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

-- Storage bucket for property documents & videos (private)
INSERT INTO storage.buckets (id, name, public)
  VALUES ('property-documents', 'property-documents', false)
  ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'property_documents_storage_select'
  ) THEN
    CREATE POLICY "property_documents_storage_select" ON storage.objects
      FOR SELECT USING (bucket_id = 'property-documents' AND auth.role() = 'authenticated');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'property_documents_storage_insert'
  ) THEN
    CREATE POLICY "property_documents_storage_insert" ON storage.objects
      FOR INSERT WITH CHECK (bucket_id = 'property-documents' AND auth.role() = 'authenticated');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'property_documents_storage_delete'
  ) THEN
    CREATE POLICY "property_documents_storage_delete" ON storage.objects
      FOR DELETE USING (bucket_id = 'property-documents' AND auth.role() = 'authenticated');
  END IF;
END $$;
