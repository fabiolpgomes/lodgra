# 📊 Monitoramento de Email Sync

## Onde acessar

**URL:** `/admin/email-sync-status`

⚠️ **Requer autenticação como admin**

## O que você verá

### 1. **Métricas Principais** (5 cards no topo)

| Card | O que significa |
|------|-----------------|
| **Total** | Quantos emails foram processados |
| **Sincronizadas** | Quantos foram casados com reservas (sucesso) |
| **Revisão Necessária** | Quantos ficaram com correspondência ambígua |
| **Taxa de Sincronização** | Percentual de sucesso (ideal: > 90%) |
| **Status do Sistema** | Verde (✅ OK), Amarelo (⚠️ Atenção), Vermelho (🚨 Crítico) |

### 2. **Seletor de Período**

Escolha entre 7, 14 ou 30 dias para ver tendências:
- **7 dias:** Monitoramento diário
- **14 dias:** Análise de uma semana tipo
- **30 dias:** Tendência mensal

### 3. **Tendência (Gráfico)**

Dois gráficos mostram:
- **Esquerda:** Quantidade de emails processados por dia
- **Direita:** Taxa de revisão necessária por dia (em %)

**Cores:**
- 🟢 Verde: Taxa < 5% (saudável)
- 🟡 Amarelo: Taxa 5-10% (atenção)
- 🔴 Vermelho: Taxa > 10% (crítico)

### 4. **Tabela de Casos em Revisão**

Mostra até 20 casos recentes que precisam de revisão manual.

**Colunas:**
- **Hóspede:** Nome do hóspede (se extraído)
- **Propriedade:** Nome da propriedade (se extraído)
- **Datas:** Data de entrada e saída
- **Motivo:** Por que precisou de revisão
- **Recebido:** Quando o email chegou

**Motivos possíveis:**
- "Propriedade não identificada no email" → OpenAI não conseguiu extrair o nome
- "Múltiplas reservas na mesma data" → Existem 2+ reservas com as mesmas datas

### 5. **Ações Recomendadas** (seção crítica)

#### Se taxa < 10% ✅
✅ Tudo está funcionando bem
- Continue monitorando 1x/semana
- Nenhuma ação necessária

#### Se taxa 10-15% ⚠️
⚠️ Taxa elevada — investigue
1. **Revise os casos pendentes** na tabela abaixo
2. **Identifique o padrão** — é falta de property_name? Ou ambiguidade de datas?
3. **Teste o extraction prompt** com 2-3 emails reais dos casos
4. **Considere refinar** o prompt se há padrão claro

#### Se taxa > 15% 🚨
🚨 Taxa crítica — ação urgente
1. Faça os 3 passos acima IMEDIATAMENTE
2. Se o problema for crítico, **pause o sync automático** enquanto ajusta
3. Contacte o time de desenvolvimento se não conseguir identificar o padrão

## Como corrigir

### Cenário 1: "Propriedade não identificada"

**O problema:** O OpenAI não consegue extrair o nome da propriedade dos emails.

**Solução:**
1. Copie 3-5 emails dos casos pendentes
2. Abra `src/lib/email-reconciliation/extract-service.ts`
3. Adicione exemplos REAIS dos seus emails ao prompt (seção EXAMPLES)
4. Redeploy
5. Teste novamente

**Exemplo:**
```
Email: "AHS Premium Apart 2 bedrooms 2 Pools PS4 5 min Beach - Algarve
Booking confirmation 6502214867
..."

Output: {"property_name": "AHS Premium Apart 2 bedrooms 2 Pools PS4 5 min Beach - Algarve", ...}
```

### Cenário 2: "Múltiplas reservas na mesma data"

**O problema:** Você tem 2+ propriedades com reservas nas mesmas datas, e o sistema não consegue decidir qual atualizar.

**Solução:**
Geralmente significa que o `property_name` foi extraído, mas:
- Não bate exatamente com o nome gravado no Lodgra (ex: "AHS Apt" vs "AHS Premium Apart")
- Ou o fuzzy matching threshold está muito rigoroso

**Ajuste:**
1. Abra `src/lib/email-reconciliation/sync-to-reservations.ts`
2. Ajuste os valores:
   - `PROPERTY_MATCH_THRESHOLD = 0.6` (tente 0.5 para mais tolerância)
   - `MIN_WINNER_MARGIN = 0.15` (tente 0.1 para menos rigor)
3. Redeploy e teste

## FAQ

**P: Qual é a taxa aceitável?**  
R: Ideal é < 5%. Entre 5-10% é aceitável. Acima de 10% investigar.

**P: E se nunca conseguir < 10%?**  
R: Pode ser que seus emails não incluam o property_name de forma clara. Nesse caso, 15% é aceitável com revisão manual.

**P: Quantas vezes devo checar?**  
R: Se tudo está verde: 1x/semana  
Se amarelo: diariamente até resolver  
Se vermelho: imediatamente

**P: Posso usar isso desde o mobile?**  
R: Sim! O dashboard é responsivo. Acesse `/admin/email-sync-status` no seu celular.

**P: Que fazer se um caso precisa de revisão?**  
R: Por enquanto, você terá que:
1. Encontrar a reserva manualmente
2. Copiar os dados do email
3. Atualizar a reserva manualmente (nome do hóspede, telefone, total)

Estamos planejando adicionar um painel de "Um clique para sincronizar" no futuro.

## Monitoramento Automático

Opcionalmente, você pode configurar alertas:
- **Email diário:** Seu admin/DevOps pode configurar um cron que envia um email se taxa > 10%
- **Slack:** Integração com Slack para alertas em tempo real
- **PagerDuty:** Para incidentes críticos (taxa > 15%)

Converse com o time dev se quiser ativar essas integrações.

---

**Última atualização:** 2026-07-30  
**Versão:** 1.0
