#!/usr/bin/env zsh
# Backup sob demanda do banco de PRODUÇÃO (plano Free não tem backup diário).
# Uso: ./scripts/backup-producao.sh   → pede a URI do Session pooler (porta 5432) sem exibir.
# Saída fora do repo (contém dados pessoais de hóspedes): ~/backups/lodgra/<data-hora>/
set -euo pipefail
read -s "DB_URL?URI produção (Session pooler, :5432): "; echo
DEST="$HOME/backups/lodgra/$(date +%Y%m%d-%H%M%S)"
mkdir -p "$DEST"
supabase db dump --db-url "$DB_URL" -f "$DEST/roles.sql" --role-only
supabase db dump --db-url "$DB_URL" -f "$DEST/schema.sql"
supabase db dump --db-url "$DB_URL" -f "$DEST/data.sql" --use-copy --data-only
unset DB_URL
chmod 600 "$DEST"/*.sql
ls -lh "$DEST"
echo "Backup salvo em $DEST"
