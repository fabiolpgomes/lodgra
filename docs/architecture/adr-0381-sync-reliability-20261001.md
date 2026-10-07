# ADR 0381 — Recuperação do fluxo OTA e escritor único

Status: decisão arquitetural aceita para implementação na Story 38.1; validação operacional pendente.
Data: 2026-10-01. Responsável: Aria (@architect).

## Evidência e escopo

Derivado da auditoria `docs/qa/38.1-20261001-auditoria-sincronizacao.md` e da autorização do gestor para corrigir integralmente o fluxo. As duas estadias Booking existem como indisponibilidade opaca, sem dados suficientes no iCal para criar reservas comerciais. Não existe autorização/parceria OTA demonstrada para substituir esse fluxo por API nativa.

O código atual desliga Gmail quando habilita reconciliação, não agenda a fila nova, finaliza e-mails `no_match` sem reavaliá-los após chegada do iCal, e não modela cancelamento/alteração na extração. O piloto também desliga cancelamento do importador legado. A baseline SQL exige extração `auto_matched` antes da RPC, mas o chamador não persiste essa decisão. A fila não recupera uma segunda tentativa interrompida quando `attempt_count=2`. Cada ponto precisa de prova de regressão.

## Decisão

1. **Dois transportes, um escritor.** Gmail OAuth e Resend Inbound alimentam `raw_emails`. A restrição anterior de Resend como única entrada (ADR fase 0, decisão 2) é substituída: Gmail é transporte e mecanismo de recuperação, jamais um segundo criador de reservas para a mesma organização/plataforma habilitada. Identidade de organização vem da conexão autenticada ou destinatário verificado; identidade do provedor permanece registrada. Deduplicação física por provedor/mensagem e lógica por plataforma/código/evento não são intercambiáveis.
2. **Consolidação transacional.** Somente a reconciliação escreve a reserva no caminho habilitado. Ela preserva tenant, imóvel, plataforma, UID e código; adota legado apenas sem ambiguidade, sem atravessar plataforma ou vínculos existentes. Duas mensagens da mesma reserva não são duas reservas. Replay antigo não pode reativar cancelamento ou sobrescrever alteração posterior. Snapshot financeiro declarado exige revisão quando os valores conflitam.
3. **Polling completo e agendamento verificável.** Gmail pagina, lê também mensagens já lidas e persiste antes de avançar o controle. Transporte não depende da chave do extrator. Job autenticado processa staging com lease recuperável e estado final explícito; backlog e falhas não são reportados como sucesso integral. Resend verifica assinatura e persiste antes de responder aceitação.
4. **Ordem de chegada independente.** Extração válida sem evento continua aguardando reconciliação. Cada execução reavalia `pending`/`no_match` sem repetir LLM. Eventos novos ou alterados permitem reavaliação. `needs_review` não autoriza escrita automática por timeout. Consulta de candidatos exige plataforma/tenant e evidência forte do imóvel; datas sozinhas não autorizam reserva.
5. **Lifecycle explícito.** Confirmação, alteração, cancelamento e mensagem sem reserva são categorias distintas. Cancelamento identificado de maneira inequívoca e vinculado por código estável pode cancelar a reserva correta; sem identidade confiável fica em revisão. Alteração pode modificar a mesma reserva apenas com identidade estável, datas novas confirmadas e sem conflito. O desaparecimento isolado de UID, feed vazio, HTTP falho ou parse incompleto não autoriza cancelar reserva comercial. O iCal continua protegendo indisponibilidade; divergência entre datas da reserva e do evento vinculado é observável e exige reconciliação, não criação de segunda reserva.
6. **Cobertura e limpeza.** Flatio integra normalização de plataforma, staging, extração e matching de forma coerente. Corrigir vínculos de feeds existentes com evidência do hostname. Retirar enriquecedor legado do agendamento no caminho canônico; não manter funções que escrevem colunas inexistentes. Preservar caminhos ainda consumidos por organizações fora do rollout até verificar migração.

## Critérios para afirmar recuperação

Testar iCal antes/depois do e-mail; retry e duplicidade por transporte e entre transportes; mais de 50 mensagens Gmail; duas execuções concorrentes; segunda tentativa interrompida; cancelamento/alteração fora de ordem; associação ambígua; falha de leitura; Flatio; snapshot financeiro. Validar schema real, agendamentos reais, uma entrada real por transporte habilitado e reserva vinculada com datas/origem corretas. Testes locais aprovados não provam entrega externa.

Recuperar as duas reservas com evidência real e procedência explícita. Não fabricar e-mails ou dados ausentes. Saúde inclui idade do backlog, última entrada por transporte, eventos sem reserva e divergências de datas, além do HTTP do polling. Nenhuma alegação de funcionamento de 100% ou prontidão comercial deve anteceder essas evidências.

## Handoff de implementação iCal (01/10)

O código de iCal passa a rejeitar feed parcialmente inválido (datas/UID ausentes, UID repetido, intervalo inválido), preservar identidade pelo hostname do feed, ignorar confirmação de `STATUS:CANCELLED`, manter reservas e bloqueios em feed vazio e invalidar apenas staging `unmatched` cujo evento desapareceu. O verificador de lifecycle sinaliza pelo caminho existente de falha do sync reservas vinculadas com evento ausente, cancelado ou datas divergentes; não altera valores, snapshots nem o estado comercial. As duas rotas usam a mesma regra.

Limite intencional: alteração/cancelamento comerciais ainda dependem do escritor de reconciliação de e-mail ou confirmação explícita do anfitrião. iCal não passa a ser um segundo escritor. Feeds recorrentes com UID repetido não são expandidos automaticamente: falham com diagnóstico e preservam estado. Mais de 1.000 candidatos por anúncio requer revisão/paginação antes de afirmar auditoria completa. Isso não substitui prova operacional nem autoriza declarar resolvido o lifecycle completo sem o worker de e-mail.
