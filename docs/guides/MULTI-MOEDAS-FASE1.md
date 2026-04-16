# 💱 SISTEMA MULTI-MOEDAS - IMPLEMENTAÇÃO

## ✅ FASE 1: BANCO DE DADOS E FORMULÁRIOS

### **O QUE FOI IMPLEMENTADO:**

1. ✅ **SQL Migration** (`migration-multi-moedas.sql`)
   - Campo `currency` em `properties`
   - Campo `currency` em `reservations`
   - Índices para performance
   - Atualização automática de reservas existentes

2. ✅ **Utilitário de Moedas** (`src/lib/utils/currency.ts`)
   - Formatação automática por moeda
   - Suporte: EUR, BRL, USD, GBP, CHF, JPY, CAD, AUD
   - Funções: `formatCurrency()`, `getCurrencySymbol()`, etc

3. ✅ **Formulário de Propriedades**
   - Seletor de moeda ao criar propriedade
   - Moedas disponíveis:
     - € Euro (EUR)
     - R$ Real Brasileiro (BRL)
     - $ Dólar Americano (USD)
     - £ Libra Esterlina (GBP)
     - CHF Franco Suíço (CHF)
     - ¥ Iene Japonês (JPY)
     - C$ Dólar Canadense (CAD)
     - A$ Dólar Australiano (AUD)

---

## 📦 INSTALAÇÃO - FASE 1:

```bash
cd ~/Projetos/home-stay

# 1. Parar servidor (Ctrl+C)

# 2. Backup .env.local
cp .env.local ~/backup-env.local

# 3. Extrair
tar -xzf ~/Downloads/home-stay-v12-multi-moedas-parte1.tar.gz --strip-components=1

# 4. Restaurar .env.local
cp ~/backup-env.local .env.local

# 5. EXECUTAR SQL NO SUPABASE
# Copie o conteúdo de: migration-multi-moedas.sql
# Cole no Supabase SQL Editor
# Execute!

# 6. Limpar e reiniciar
rm -rf .next
npm run dev
```

---

## 🧪 TESTAR FASE 1:

### **Teste 1: Criar Propriedade com Moeda**
1. Vá para `/properties`
2. Clique em "Nova Propriedade"
3. **Veja campo "Moeda"** após "País"
4. Selecione "R$ Real Brasileiro (BRL)"
5. Preencha outros campos
6. Salve

### **Teste 2: Propriedades Existentes**
1. Execute no Supabase SQL:
   ```sql
   SELECT id, name, currency FROM properties;
   ```
2. Deve mostrar 'EUR' para existentes

---

## 🎯 PRÓXIMOS PASSOS (FASE 2):

Depois de testar a Fase 1, vou implementar:

1. **Edição de Propriedades** com moeda
2. **Formulário de Reservas** com moeda
3. **Dashboard Multi-Moeda**
   - Total separado: "€5.000 + R$12.000"
   - Cards por moeda
4. **Relatórios Multi-Moeda**
   - Filtro por moeda
   - Totais separados
   - Exportação Excel com moedas
5. **Listagens** com símbolo correto
   - Lista de propriedades
   - Lista de reservas
   - Calendário

---

## 📋 MOEDAS SUPORTADAS:

| Código | Símbolo | Nome | Locale |
|--------|---------|------|--------|
| EUR | € | Euro | pt-PT |
| BRL | R$ | Real Brasileiro | pt-BR |
| USD | $ | Dólar Americano | en-US |
| GBP | £ | Libra Esterlina | en-GB |
| CHF | CHF | Franco Suíço | de-CH |
| JPY | ¥ | Iene Japonês | ja-JP |
| CAD | C$ | Dólar Canadense | en-CA |
| AUD | A$ | Dólar Australiano | en-AU |

---

## ⚠️ IMPORTANTE:

1. **Execute o SQL** antes de usar
2. **Propriedades antigas** vão ter EUR por padrão
3. **Você pode editar** depois para mudar a moeda
4. **Reservas herdam** a moeda da propriedade

---

**Execute a Fase 1 e teste criar uma propriedade em BRL!** 🇧🇷💰
