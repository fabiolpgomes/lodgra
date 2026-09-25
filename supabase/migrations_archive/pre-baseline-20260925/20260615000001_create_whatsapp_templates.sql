-- Create whatsapp_message_templates table (Story 30.2)
-- Manages customizable WhatsApp message templates per organization

CREATE TABLE whatsapp_message_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  template_key TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'pt-BR',
  body TEXT NOT NULL,
  is_custom BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, template_key, language)
);

-- Indexes
CREATE INDEX idx_whatsapp_templates_org ON whatsapp_message_templates(organization_id);
CREATE INDEX idx_whatsapp_templates_key ON whatsapp_message_templates(template_key, language);

-- RLS
ALTER TABLE whatsapp_message_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "whatsapp_templates_read_own_org"
  ON whatsapp_message_templates FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "whatsapp_templates_write_managers"
  ON whatsapp_message_templates FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "whatsapp_templates_update_managers"
  ON whatsapp_message_templates FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Audit trigger
CREATE OR REPLACE FUNCTION update_whatsapp_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER whatsapp_templates_updated_at_trigger
  BEFORE UPDATE ON whatsapp_message_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_whatsapp_templates_updated_at();
