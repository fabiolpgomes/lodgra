#!/bin/bash

# Script para configurar CRON_SECRET rapidamente

echo "Configurando CRON_SECRET..."
echo ""

# Gerar chave aleatória (requer openssl — sem fallback inseguro)
if ! command -v openssl &>/dev/null; then
  echo "ERRO: openssl não encontrado. Instale openssl e tente novamente."
  exit 1
fi
RANDOM_KEY=$(openssl rand -base64 32)

echo "Chave gerada: $RANDOM_KEY"
echo ""

# Atualizar .env.local
if [ -f ".env.local" ]; then
  if grep -q "CRON_SECRET=" .env.local; then
    sed -i.bak "s/CRON_SECRET=.*/CRON_SECRET=$RANDOM_KEY/" .env.local
    rm -f .env.local.bak
    echo "CRON_SECRET atualizado em .env.local"
  else
    echo "CRON_SECRET=$RANDOM_KEY" >> .env.local
    echo "CRON_SECRET adicionado em .env.local"
  fi
else
  echo "AVISO: .env.local não encontrado - crie o arquivo e adicione:"
  echo "CRON_SECRET=$RANDOM_KEY"
fi

echo ""
echo "Configuracao concluida!"
echo ""
echo "Sua chave: $RANDOM_KEY"
echo ""
echo "IMPORTANTE: Configure CRON_SECRET nas variaveis de ambiente do Vercel em producao!"
