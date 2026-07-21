#!/bin/bash
# Re-export emails com corpo completo
# Alternativa: usar Google Cloud credentials sem interação

echo "📧 Re-exportando e-mails com corpo completo..."
echo ""
echo "Opções:"
echo "1. Usar arquivo credentials.json existente (interativo)"
echo "2. Manual: Fazer export pelo Gmail interface"
echo ""
echo "Qual? (1/2)"
read -r choice

if [ "$choice" = "1" ]; then
  echo ""
  echo "Executando export-gmail-emails.js com credenciais..."
  node scripts/export-gmail-emails.js
else
  echo ""
  echo "📋 Manual steps:"
  echo "1. Acesso: https://takeout.google.com"
  echo "2. Selecione: Gmail"
  echo "3. Download: arquivo .mbox com todos os e-mails"
  echo "4. Converta para JSON usando ferramentas MBOX parser"
  echo ""
fi
