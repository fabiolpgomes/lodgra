Pesqisa de Concorrentes
Concorrente │               Ponto Fraco Provável               │              
  ├─────────────┼──────────────────────────────────────────────────┤                
  │ Hostaway    │ Preço alto, complexo para <5 imóveis             │
  ├─────────────┼──────────────────────────────────────────────────┤                
  │ Guesty      │ Voltado para >10 imóveis, UI pesada              │                
  ├─────────────┼──────────────────────────────────────────────────┤🔄 Sobre o "Lodgra Sync"
Como você está mantendo o Home Stay como o "motor" (Repo A) e o Lodgra como a "carroceria" (Repo B), recomendo o seguinte workflow para não se perder:

Shared Core: Se possível, mova a lógica de negócio (cálculos de preço, regras de reserva) para uma pasta shared ou pacote privado.
Feature Flags: No Lodgra, ative as novas visualizações de relatórios que o Home Stay ainda não possui (para testar o valor agregado).
BI First: Priorize a sincronização do módulo financeiro. Se o Lodgra entregar o relatório que o Stays não entrega, você rouba os clientes deles em 30 dias.
  │ Lodgify     │ Foco europeu, BRL/impostos BR ignorados          │                
  ├─────────────┼──────────────────────────────────────────────────┤                
  │ Stays       │ UI datada, relatórios financeiros fracos         │
  ├─────────────┼──────────────────────────────────────────────────┤                
  │ Housi       │ Modelo próprio, não serve gestores independentes 




Concorrente │               Ponto Fraco Provável               │              
  ├─────────────┼──────────────────────────────────────────────────┤                
  │ Hostaway    │ Preço alto, complexo para <5 imóveis             │
  ├─────────────┼──────────────────────────────────────────────────┤                
  │ Guesty      │ Voltado para >10 imóveis, UI pesada              │                
  ├─────────────┼──────────────────────────────────────────────────┤
  │ Lodgify     │ Foco europeu, BRL/impostos BR ignorados          │                
  ├─────────────┼──────────────────────────────────────────────────┤                
  │ Stays       │ UI datada, relatórios financeiros fracos         │
  ├─────────────┼──────────────────────────────────────────────────┤                
  │ Housi       │ Modelo próprio, não serve gestores independentes 





  Home Stay
Estratégia Recomendada: "Home Stay First, Lodgra Sync"
                                                                                    
  Diagnóstico                                                                       
                                                                                    
  Home Stay PROD (repo A)     →  bug fixes + melhorias pontuais ✓                   
  Lodgra STAGING (repo B)     →  rebranding + nova landing + desatualizado ⚠        
                                                                                    
  Diferenças que IMPORTAM sincronizar:                                              
    ✓ Bug fixes de lógica de negócio                                                
    ✓ Melhorias de componentes internos (dashboard, calendário, etc.)               
   
  Diferenças que NÃO sincronizar (já corretas no Lodgra):                           
    ✗ Landing page (nova, já feita)                                               
    ✗ Nome da marca (Home Stay → Lodgra)                                            
    ✗ Configurações de domínio    


    🚀 Sugestão de Posicionamento: "O SaaS de Gestão que você realmente gosta de usar"
O seu diferencial não deve ser apenas "ter as funções", mas como elas são entregues.

Contraponto ao Stays: "Diga adeus às planilhas e sistemas dos anos 2000. Relatórios financeiros de verdade, em tempo real."
Contraponto ao Lodgify: "100% Brasil: Checkout com PIX, emissão de nota automática e suporte que fala a sua língua."
💰 Estrutura de Planos (Sugestão de Pricing BR)
No Brasil, o anfitrião é muito sensível ao "fixo vs variável". Para matar a concorrência, eu fugiria do modelo de comissão (%) e focaria em mensalidade fixa transparente.

Plano	Limite	Preço Sugerido (R$)	Por que este valor?
Starter	Até 3 propriedades	R$ 97 /mês	Barreira de entrada baixíssima. Ataca o anfitrião do Airbnb que quer profissionalizar sem o custo do Guesty Lite (~R$ 150+).
Professional	Até 10 propriedades	R$ 297 /mês	O "Sweet Spot". Gestores com 4-10 imóveis no Brasil hoje pagam caro ou usam sistemas ruins. Aqui o custo por imóvel cai para R$ 29,70.
Business	10+ (Escalável)	R$ 497 + R$ 25/und extra	Não recomendo "Ilimitado". Gestores com 50+ imóveis consomem muito suporte e infra. O modelo "Base + Adicional" é o padrão de ouro para SaaS B2B.
Obs: Ofereça 2 meses de desconto no plano anual para garantir o LTV.

🛠️ Diferenciais que você deve "Vender" na Staging (Lodgra)
Para preencher a lacuna que você identificou, o Lodgra precisa ter estes 3 pilares muito fortes no marketing:

Dashboard Financeiro (O soco no Stays): Em vez de tabelas confusas, use gráficos de Profit & Loss por propriedade, cálculo automático de repasse para proprietário e lucro líquido real (descontando limpeza e taxas das OTAs).
Operação em 1 Clique: Calendário unificado que não trava e um sistema de "Check-lists de Limpeza" mobile-first para a equipe de campo.
Localização Profunda: Integração nativa com Asaas ou Pagar.me para cobrança automática via PIX/Cartão e envio de link de pagamento com a identidade da marca do gestor.
🔄 Sobre o "Lodgra Sync"
Como você está mantendo o Home Stay como o "motor" (Repo A) e o Lodgra como a "carroceria" (Repo B), recomendo o seguinte workflow para não se perder:

Shared Core: Se possível, mova a lógica de negócio (cálculos de preço, regras de reserva) para uma pasta shared ou pacote privado.
Feature Flags: No Lodgra, ative as novas visualizações de relatórios que o Home Stay ainda não possui (para testar o valor agregado).
BI First: Priorize a sincronização do módulo financeiro. Se o Lodgra entregar o relatório que o Stays não entrega, você rouba os clientes deles em 30 dias.                                               
                                                                                    