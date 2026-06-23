-- Seed Default Cleaning Templates (A, B, C)
-- Based on Lodgra Cleaning Management Module PRD

-- Template A: T0/Studio (60-90 minutos)
INSERT INTO cleaning_checklist_templates (name, description, is_active, category, expected_time_min, expected_time_max)
VALUES (
  'Template A - T0/Studio',
  'Modelo de limpeza para T0, Studio e Loft. Tempo estimado: 60-90 minutos',
  true,
  'A',
  60,
  90
) ON CONFLICT DO NOTHING
RETURNING id;

-- Template A - Items (Bedroom/Living Area)
INSERT INTO cleaning_checklist_items (template_id, item, order)
SELECT id, 'Trocar roupa de cama', 1 FROM cleaning_checklist_templates WHERE name = 'Template A - T0/Studio'
UNION ALL
SELECT id, 'Colocar fronhas limpas', 2 FROM cleaning_checklist_templates WHERE name = 'Template A - T0/Studio'
UNION ALL
SELECT id, 'Aspirar colchão', 3 FROM cleaning_checklist_templates WHERE name = 'Template A - T0/Studio'
UNION ALL
SELECT id, 'Limpar cabeceiras', 4 FROM cleaning_checklist_templates WHERE name = 'Template A - T0/Studio'
UNION ALL
SELECT id, 'Limpar mesas de apoio', 5 FROM cleaning_checklist_templates WHERE name = 'Template A - T0/Studio'
UNION ALL
SELECT id, 'Limpar interruptores', 6 FROM cleaning_checklist_templates WHERE name = 'Template A - T0/Studio'
UNION ALL
SELECT id, 'Limpar tomadas visíveis', 7 FROM cleaning_checklist_templates WHERE name = 'Template A - T0/Studio'
UNION ALL
SELECT id, 'Limpar espelhos', 8 FROM cleaning_checklist_templates WHERE name = 'Template A - T0/Studio'
UNION ALL
SELECT id, 'Limpar janelas interiores', 9 FROM cleaning_checklist_templates WHERE name = 'Template A - T0/Studio'
UNION ALL
SELECT id, 'Aspirar sofá', 10 FROM cleaning_checklist_templates WHERE name = 'Template A - T0/Studio'
UNION ALL
SELECT id, 'Aspirar chão', 11 FROM cleaning_checklist_templates WHERE name = 'Template A - T0/Studio'
UNION ALL
SELECT id, 'Lavar chão', 12 FROM cleaning_checklist_templates WHERE name = 'Template A - T0/Studio'
-- Kitchen
UNION ALL
SELECT id, 'Limpar bancada', 13 FROM cleaning_checklist_templates WHERE name = 'Template A - T0/Studio'
UNION ALL
SELECT id, 'Limpar lava-loiça', 14 FROM cleaning_checklist_templates WHERE name = 'Template A - T0/Studio'
UNION ALL
SELECT id, 'Limpar torneiras', 15 FROM cleaning_checklist_templates WHERE name = 'Template A - T0/Studio'
UNION ALL
SELECT id, 'Limpar placa', 16 FROM cleaning_checklist_templates WHERE name = 'Template A - T0/Studio'
UNION ALL
SELECT id, 'Limpar microondas', 17 FROM cleaning_checklist_templates WHERE name = 'Template A - T0/Studio'
UNION ALL
SELECT id, 'Limpar frigorífico exterior', 18 FROM cleaning_checklist_templates WHERE name = 'Template A - T0/Studio'
UNION ALL
SELECT id, 'Verificar utensílios', 19 FROM cleaning_checklist_templates WHERE name = 'Template A - T0/Studio'
UNION ALL
SELECT id, 'Verificar copos', 20 FROM cleaning_checklist_templates WHERE name = 'Template A - T0/Studio'
UNION ALL
SELECT id, 'Verificar talheres', 21 FROM cleaning_checklist_templates WHERE name = 'Template A - T0/Studio'
UNION ALL
SELECT id, 'Esvaziar lixo', 22 FROM cleaning_checklist_templates WHERE name = 'Template A - T0/Studio'
UNION ALL
SELECT id, 'Substituir saco lixo', 23 FROM cleaning_checklist_templates WHERE name = 'Template A - T0/Studio'
-- Bathroom
UNION ALL
SELECT id, 'Limpar sanita', 24 FROM cleaning_checklist_templates WHERE name = 'Template A - T0/Studio'
UNION ALL
SELECT id, 'Limpar lavatório', 25 FROM cleaning_checklist_templates WHERE name = 'Template A - T0/Studio'
UNION ALL
SELECT id, 'Limpar espelho banheiro', 26 FROM cleaning_checklist_templates WHERE name = 'Template A - T0/Studio'
UNION ALL
SELECT id, 'Limpar duche', 27 FROM cleaning_checklist_templates WHERE name = 'Template A - T0/Studio'
UNION ALL
SELECT id, 'Limpar ralos', 28 FROM cleaning_checklist_templates WHERE name = 'Template A - T0/Studio'
UNION ALL
SELECT id, 'Remover cabelos', 29 FROM cleaning_checklist_templates WHERE name = 'Template A - T0/Studio'
UNION ALL
SELECT id, 'Trocar toalhas', 30 FROM cleaning_checklist_templates WHERE name = 'Template A - T0/Studio'
UNION ALL
SELECT id, 'Repor papel higiénico', 31 FROM cleaning_checklist_templates WHERE name = 'Template A - T0/Studio'
UNION ALL
SELECT id, 'Lavar chão banheiro', 32 FROM cleaning_checklist_templates WHERE name = 'Template A - T0/Studio'
-- Final Verification
UNION ALL
SELECT id, 'Verificar luzes', 33 FROM cleaning_checklist_templates WHERE name = 'Template A - T0/Studio'
UNION ALL
SELECT id, 'Verificar Wifi', 34 FROM cleaning_checklist_templates WHERE name = 'Template A - T0/Studio'
UNION ALL
SELECT id, 'Verificar TV', 35 FROM cleaning_checklist_templates WHERE name = 'Template A - T0/Studio'
UNION ALL
SELECT id, 'Verificar ar condicionado', 36 FROM cleaning_checklist_templates WHERE name = 'Template A - T0/Studio'
UNION ALL
SELECT id, 'Cheiro agradável', 37 FROM cleaning_checklist_templates WHERE name = 'Template A - T0/Studio'
ON CONFLICT DO NOTHING;

---

-- Template B: T1/T2 (90-150 minutos)
INSERT INTO cleaning_checklist_templates (name, description, is_active, category, expected_time_min, expected_time_max)
VALUES (
  'Template B - T1/T2',
  'Modelo de limpeza para T1 e T2. Tempo estimado: 90-150 minutos',
  true,
  'B',
  90,
  150
) ON CONFLICT DO NOTHING
RETURNING id;

-- Template B - Items
INSERT INTO cleaning_checklist_items (template_id, item, order)
SELECT id, 'Trocar roupa de cama - Quarto 1', 1 FROM cleaning_checklist_templates WHERE name = 'Template B - T1/T2'
UNION ALL
SELECT id, 'Aspirar colchão - Quarto 1', 2 FROM cleaning_checklist_templates WHERE name = 'Template B - T1/T2'
UNION ALL
SELECT id, 'Limpar móveis - Quarto 1', 3 FROM cleaning_checklist_templates WHERE name = 'Template B - T1/T2'
UNION ALL
SELECT id, 'Limpar armários exterior - Quarto 1', 4 FROM cleaning_checklist_templates WHERE name = 'Template B - T1/T2'
UNION ALL
SELECT id, 'Limpar espelhos - Quarto 1', 5 FROM cleaning_checklist_templates WHERE name = 'Template B - T1/T2'
UNION ALL
SELECT id, 'Aspirar chão - Quarto 1', 6 FROM cleaning_checklist_templates WHERE name = 'Template B - T1/T2'
UNION ALL
SELECT id, 'Lavar chão - Quarto 1', 7 FROM cleaning_checklist_templates WHERE name = 'Template B - T1/T2'
UNION ALL
SELECT id, 'Trocar roupa de cama - Quarto 2', 8 FROM cleaning_checklist_templates WHERE name = 'Template B - T1/T2'
UNION ALL
SELECT id, 'Aspirar colchão - Quarto 2', 9 FROM cleaning_checklist_templates WHERE name = 'Template B - T1/T2'
UNION ALL
SELECT id, 'Limpar móveis - Quarto 2', 10 FROM cleaning_checklist_templates WHERE name = 'Template B - T1/T2'
UNION ALL
SELECT id, 'Limpar armários exterior - Quarto 2', 11 FROM cleaning_checklist_templates WHERE name = 'Template B - T1/T2'
UNION ALL
SELECT id, 'Limpar espelhos - Quarto 2', 12 FROM cleaning_checklist_templates WHERE name = 'Template B - T1/T2'
UNION ALL
SELECT id, 'Aspirar chão - Quarto 2', 13 FROM cleaning_checklist_templates WHERE name = 'Template B - T1/T2'
UNION ALL
SELECT id, 'Lavar chão - Quarto 2', 14 FROM cleaning_checklist_templates WHERE name = 'Template B - T1/T2'
-- Living Room
UNION ALL
SELECT id, 'Limpar televisão', 15 FROM cleaning_checklist_templates WHERE name = 'Template B - T1/T2'
UNION ALL
SELECT id, 'Limpar comandos', 16 FROM cleaning_checklist_templates WHERE name = 'Template B - T1/T2'
UNION ALL
SELECT id, 'Aspirar sofá', 17 FROM cleaning_checklist_templates WHERE name = 'Template B - T1/T2'
UNION ALL
SELECT id, 'Limpar móveis sala', 18 FROM cleaning_checklist_templates WHERE name = 'Template B - T1/T2'
UNION ALL
SELECT id, 'Aspirar tapetes', 19 FROM cleaning_checklist_templates WHERE name = 'Template B - T1/T2'
UNION ALL
SELECT id, 'Aspirar chão sala', 20 FROM cleaning_checklist_templates WHERE name = 'Template B - T1/T2'
UNION ALL
SELECT id, 'Lavar chão sala', 21 FROM cleaning_checklist_templates WHERE name = 'Template B - T1/T2'
-- Kitchen
UNION ALL
SELECT id, 'Limpar bancada', 22 FROM cleaning_checklist_templates WHERE name = 'Template B - T1/T2'
UNION ALL
SELECT id, 'Limpar armários', 23 FROM cleaning_checklist_templates WHERE name = 'Template B - T1/T2'
UNION ALL
SELECT id, 'Limpar frigorífico interior', 24 FROM cleaning_checklist_templates WHERE name = 'Template B - T1/T2'
UNION ALL
SELECT id, 'Limpar frigorífico exterior', 25 FROM cleaning_checklist_templates WHERE name = 'Template B - T1/T2'
UNION ALL
SELECT id, 'Limpar microondas', 26 FROM cleaning_checklist_templates WHERE name = 'Template B - T1/T2'
UNION ALL
SELECT id, 'Limpar forno exterior', 27 FROM cleaning_checklist_templates WHERE name = 'Template B - T1/T2'
UNION ALL
SELECT id, 'Limpar exaustor exterior', 28 FROM cleaning_checklist_templates WHERE name = 'Template B - T1/T2'
UNION ALL
SELECT id, 'Verificar inventário cozinha', 29 FROM cleaning_checklist_templates WHERE name = 'Template B - T1/T2'
-- Bathrooms
UNION ALL
SELECT id, 'Limpar sanita - Banheiro 1', 30 FROM cleaning_checklist_templates WHERE name = 'Template B - T1/T2'
UNION ALL
SELECT id, 'Limpar lavatório - Banheiro 1', 31 FROM cleaning_checklist_templates WHERE name = 'Template B - T1/T2'
UNION ALL
SELECT id, 'Limpar espelho - Banheiro 1', 32 FROM cleaning_checklist_templates WHERE name = 'Template B - T1/T2'
UNION ALL
SELECT id, 'Limpar duche - Banheiro 1', 33 FROM cleaning_checklist_templates WHERE name = 'Template B - T1/T2'
UNION ALL
SELECT id, 'Limpar torneiras - Banheiro 1', 34 FROM cleaning_checklist_templates WHERE name = 'Template B - T1/T2'
UNION ALL
SELECT id, 'Limpar ralos - Banheiro 1', 35 FROM cleaning_checklist_templates WHERE name = 'Template B - T1/T2'
UNION ALL
SELECT id, 'Trocar toalhas - Banheiro 1', 36 FROM cleaning_checklist_templates WHERE name = 'Template B - T1/T2'
UNION ALL
SELECT id, 'Repor amenities - Banheiro 1', 37 FROM cleaning_checklist_templates WHERE name = 'Template B - T1/T2'
UNION ALL
SELECT id, 'Limpar sanita - Banheiro 2', 38 FROM cleaning_checklist_templates WHERE name = 'Template B - T1/T2'
UNION ALL
SELECT id, 'Limpar lavatório - Banheiro 2', 39 FROM cleaning_checklist_templates WHERE name = 'Template B - T1/T2'
UNION ALL
SELECT id, 'Limpar espelho - Banheiro 2', 40 FROM cleaning_checklist_templates WHERE name = 'Template B - T1/T2'
UNION ALL
SELECT id, 'Limpar duche - Banheiro 2', 41 FROM cleaning_checklist_templates WHERE name = 'Template B - T1/T2'
UNION ALL
SELECT id, 'Limpar torneiras - Banheiro 2', 42 FROM cleaning_checklist_templates WHERE name = 'Template B - T1/T2'
UNION ALL
SELECT id, 'Limpar ralos - Banheiro 2', 43 FROM cleaning_checklist_templates WHERE name = 'Template B - T1/T2'
UNION ALL
SELECT id, 'Trocar toalhas - Banheiro 2', 44 FROM cleaning_checklist_templates WHERE name = 'Template B - T1/T2'
UNION ALL
SELECT id, 'Repor amenities - Banheiro 2', 45 FROM cleaning_checklist_templates WHERE name = 'Template B - T1/T2'
-- Balcony
UNION ALL
SELECT id, 'Varrer varanda', 46 FROM cleaning_checklist_templates WHERE name = 'Template B - T1/T2'
UNION ALL
SELECT id, 'Limpar mesas varanda', 47 FROM cleaning_checklist_templates WHERE name = 'Template B - T1/T2'
UNION ALL
SELECT id, 'Limpar cadeiras varanda', 48 FROM cleaning_checklist_templates WHERE name = 'Template B - T1/T2'
-- Final Verification
UNION ALL
SELECT id, 'Verificar luzes', 49 FROM cleaning_checklist_templates WHERE name = 'Template B - T1/T2'
UNION ALL
SELECT id, 'Verificar água quente', 50 FROM cleaning_checklist_templates WHERE name = 'Template B - T1/T2'
UNION ALL
SELECT id, 'Verificar Wifi', 51 FROM cleaning_checklist_templates WHERE name = 'Template B - T1/T2'
UNION ALL
SELECT id, 'Verificar TV', 52 FROM cleaning_checklist_templates WHERE name = 'Template B - T1/T2'
UNION ALL
SELECT id, 'Verificar ar condicionado', 53 FROM cleaning_checklist_templates WHERE name = 'Template B - T1/T2'
ON CONFLICT DO NOTHING;

---

-- Template C: T3/T4/Vivenda (120-180 minutos)
INSERT INTO cleaning_checklist_templates (name, description, is_active, category, expected_time_min, expected_time_max)
VALUES (
  'Template C - T3/T4/Vivenda',
  'Modelo de limpeza para T3, T4 e Vivendas. Tempo estimado: 120-180 minutos',
  true,
  'C',
  120,
  180
) ON CONFLICT DO NOTHING
RETURNING id;

-- Template C - Items (Exterior, Bedrooms, Living, Kitchen Premium, Bathrooms, Laundry)
-- Note: This template is large (65+ items) - will be implemented in separate migration
