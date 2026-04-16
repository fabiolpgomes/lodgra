#!/bin/bash

# Script para adicionar links de Relatórios e Sincronização nos headers
# Execute: bash fix-headers.sh

echo "🔧 Atualizando headers das páginas..."

# Arquivos a serem corrigidos
FILES=(
  "src/app/properties/page.tsx"
  "src/app/reservations/page.tsx"
  "src/app/calendar/page.tsx"
)

for FILE in "${FILES[@]}"; do
  if [ -f "$FILE" ]; then
    echo "📝 Corrigindo $FILE..."
    
    # Verificar se já tem os links
    if grep -q "Sincronização" "$FILE"; then
      echo "   ✅ Já atualizado"
    else
      # Adicionar links antes de </nav>
      sed -i.bak '/<\/nav>/i\
              <Link href="/reports" className="text-gray-600 hover:text-gray-900">\
                Relatórios\
              </Link>\
              <Link href="/sync" className="text-gray-600 hover:text-gray-900">\
                Sincronização\
              </Link>' "$FILE"
      
      echo "   ✅ Atualizado com sucesso"
    fi
  else
    echo "   ⚠️  Arquivo não encontrado: $FILE"
  fi
done

echo ""
echo "🎉 Concluído! Reinicie o servidor (npm run dev)"
