#!/usr/bin/env bash
# Move as 220 migrations antigas para fora da pasta que o Supabase CLI lê (via git mv, reversível).
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
BASE=supabase/migrations/20260925000000_baseline_producao.sql
[ -s "$BASE" ] || { echo "Baseline ausente: $BASE"; exit 1; }
DEST=supabase/migrations_archive/pre-baseline-20260925
mkdir -p "$DEST"
for f in supabase/migrations/*.sql; do
  case "$f" in *20260925000000_baseline_producao.sql|*20260925000001_baseline_auth_storage_cron.sql) continue;; esac
  git mv "$f" "$DEST/"
done
echo "Arquivadas: $(ls $DEST | wc -l) | Restantes em migrations/: $(ls supabase/migrations)"
