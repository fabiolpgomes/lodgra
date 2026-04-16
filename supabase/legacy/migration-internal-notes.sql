-- Adicionar coluna internal_notes à tabela reservations
-- Para suportar notas internas nas reservas

ALTER TABLE reservations
ADD COLUMN IF NOT EXISTS internal_notes TEXT;
