#!/usr/bin/env zsh
# Aplica em PRODUÇÃO as migrations pendentes de supabase/migrations/.
# Fluxo: dry-run → mostra a lista → pede confirmação → aplica.
# Rode antes: ./scripts/backup-producao.sh (e teste no staging com `supabase db push`).
set -euo pipefail
PROJECT_REF="brjumbfpvijrkhrherpt"
POOLER_HOST="aws-1-eu-west-1.pooler.supabase.com"

read -s "DB_PASSWORD?Senha do banco de PRODUÇÃO: "; echo
ENC_PASSWORD=$(printf %s "$DB_PASSWORD" | node -e 'process.stdout.write(encodeURIComponent(require("fs").readFileSync(0,"utf8")))')
DB_URL="postgresql://postgres.${PROJECT_REF}:${ENC_PASSWORD}@${POOLER_HOST}:5432/postgres?sslmode=require"
unset DB_PASSWORD ENC_PASSWORD

echo "== DRY RUN (produção: ${PROJECT_REF}) =="
supabase db push --db-url "$DB_URL" --dry-run
echo
read "CONFIRM?Aplicar essas migrations em PRODUÇÃO? Digite 'sim' para continuar: "
if [[ "$CONFIRM" != "sim" ]]; then
  echo "Cancelado. Nada foi aplicado."; unset DB_URL; exit 1
fi
supabase db push --db-url "$DB_URL" --yes
unset DB_URL
echo "Concluído."
