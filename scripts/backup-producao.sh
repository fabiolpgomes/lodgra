#!/usr/bin/env zsh
# Backup sob demanda do banco de PRODUÇÃO (plano Free não tem backup diário).
# Uso: ./scripts/backup-producao.sh   → pede só a SENHA do banco de produção (não exibida).
# Conecta pelo Session pooler IPv4 (porta 5432); a conexão direta db.<ref>.supabase.co é só IPv6.
# Roles não são exportados: no Supabase são gerenciados pela plataforma (pg_dumpall falha no pooler).
# Saída fora do repo (contém dados pessoais de hóspedes): ~/backups/lodgra/<data-hora>/
set -euo pipefail
PROJECT_REF="brjumbfpvijrkhrherpt"
POOLER_HOST="aws-1-eu-west-1.pooler.supabase.com"

read -s "DB_PASSWORD?Senha do banco de PRODUÇÃO: "; echo
# Codifica caracteres especiais da senha (@ # / : ? % & ...) para a URI.
ENC_PASSWORD=$(printf %s "$DB_PASSWORD" | node -e 'process.stdout.write(encodeURIComponent(require("fs").readFileSync(0,"utf8")))')
DB_URL="postgresql://postgres.${PROJECT_REF}:${ENC_PASSWORD}@${POOLER_HOST}:5432/postgres?sslmode=require"
unset DB_PASSWORD ENC_PASSWORD

DEST="$HOME/backups/lodgra/$(date +%Y%m%d-%H%M%S)"
mkdir -p "$DEST"
supabase db dump --db-url "$DB_URL" -f "$DEST/schema.sql"
supabase db dump --db-url "$DB_URL" -f "$DEST/data.sql" --use-copy --data-only
unset DB_URL
chmod 600 "$DEST"/*.sql
ls -lh "$DEST"
echo "Backup salvo em $DEST"
