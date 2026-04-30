LODGRA — Sistema de Planos (estado actual)
                                                                                   
  1. Planos — 4 planos activos
                                                                                   
  ┌─────┬───────────────────────┬────────────────────────────┐                     
  │  #  │         Plano         │        Público-alvo        │                     
  ├─────┼───────────────────────┼────────────────────────────┤                     
  │ 1   │ Starter               │ Gestores a começar         │                   
  ├─────┼───────────────────────┼────────────────────────────┤                   
  │ 2   │ Growth ⭐ (destacado) │ Gestores em crescimento    │
  ├─────┼───────────────────────┼────────────────────────────┤                     
  │ 3   │ Pro                   │ Operações profissionais    │
  ├─────┼───────────────────────┼────────────────────────────┤                     
  │ 4   │ Enterprise            │ Grandes operações (custom) │                   
  └─────┴───────────────────────┴────────────────────────────┘                     
                                                                                 
  ▎ Existem aliases legados no código (professional, business) por compatibilidade 
  ▎ com dados antigos, mas não são expostos na UI.
                                                                                   
  ---                                                                            
  2. Preços por mercado                                                          
                       
  O sistema suporta EUR e BRL (via Stripe Price IDs separados). USD não está 
  implementado.                                                                    
   
  Os valores de EUR estão hardcoded no PLAN_DISPLAY; os de BRL são configurados via
   variáveis de ambiente Stripe:                                                 
                                                                                   
  ┌────────────┬──────────────────┬────────────────────────────────────────────┐   
  │   Plano    │       EUR        │                    BRL                     │ 
  ├────────────┼──────────────────┼────────────────────────────────────────────┤   
  │ Starter    │ €9 /unidade/mês  │ Configurado via                            │ 
  │            │                  │ STRIPE_PRICE_ID_STARTER_BRL                │ 
  ├────────────┼──────────────────┼────────────────────────────────────────────┤   
  │ Growth     │ €14 /unidade/mês │ Configurado via STRIPE_PRICE_ID_GROWTH_BRL │
  ├────────────┼──────────────────┼────────────────────────────────────────────┤   
  │ Pro        │ €19 /unidade/mês │ Configurado via STRIPE_PRICE_ID_PRO_BRL    │   
  ├────────────┼──────────────────┼────────────────────────────────────────────┤ 
  │ Enterprise │ Custom           │ —                                          │   
  │            │ (contacto)       │                                            │ 
  └────────────┴──────────────────┴────────────────────────────────────────────┘   
                                                                                 
  ▎ Nota: "por unidade" = por propriedade activa. A quantidade no Stripe é         
  ▎ sincronizada automaticamente quando propriedades são adicionadas/removidas 
  ▎ (syncSubscriptionQuantity).                                                    
                                                                                 
  ---                                                                            
  3. Funcionalidades por plano
                                                                                   
  ┌───────────────────────────────────────┬─────────┬────────┬─────┬────────────┐
  │                Feature                │ Starter │ Growth │ Pro │ Enterprise │  
  ├───────────────────────────────────────┼─────────┼────────┼─────┼────────────┤
  │ Sync iCal                             │ ✅      │ ✅     │ ✅  │ ✅         │
  ├───────────────────────────────────────┼─────────┼────────┼─────┼────────────┤
  │ Calendário unificado                  │ ✅      │ ✅     │ ✅  │ ✅         │
  ├───────────────────────────────────────┼─────────┼────────┼─────┼────────────┤  
  │ Gestão básica de reservas             │ ✅      │ ✅     │ ✅  │ ✅         │
  ├───────────────────────────────────────┼─────────┼────────┼─────┼────────────┤  
  │ Suporte standard                      │ ✅      │ ✅     │ ✅  │ ✅         │
  ├───────────────────────────────────────┼─────────┼────────┼─────┼────────────┤  
  │ Integração API de canais              │ ❌      │ ✅     │ ✅  │ ✅         │
  ├───────────────────────────────────────┼─────────┼────────┼─────┼────────────┤  
  │ Dados completos de reservas           │ ❌      │ ✅     │ ✅  │ ✅         │
  ├───────────────────────────────────────┼─────────┼────────┼─────┼────────────┤  
  │ Automações                            │ ❌      │ ✅     │ ✅  │ ✅         │
  ├───────────────────────────────────────┼─────────┼────────┼─────┼────────────┤  
  │ Relatórios financeiros (ownerReports) │ ❌      │ ✅     │ ✅  │ ✅         │
  ├───────────────────────────────────────┼─────────┼────────┼─────┼────────────┤  
  │ Sync em tempo real                    │ ❌      │ ✅     │ ✅  │ ✅         │
  ├───────────────────────────────────────┼─────────┼────────┼─────┼────────────┤  
  │ Conformidade fiscal                   │ ❌      │ ✅     │ ✅  │ ✅         │
  │ (fiscalCompliance)                    │         │        │     │            │  
  ├───────────────────────────────────────┼─────────┼────────┼─────┼────────────┤
  │ Pricing dinâmico                      │ ❌      │ ❌     │ ✅  │ ✅         │  
  ├───────────────────────────────────────┼─────────┼────────┼─────┼────────────┤  
  │ Automações avançadas                  │ ❌      │ ❌     │ ✅  │ ✅         │
  ├───────────────────────────────────────┼─────────┼────────┼─────┼────────────┤  
  │ Insights de performance               │ ❌      │ ❌     │ ✅  │ ✅         │
  ├───────────────────────────────────────┼─────────┼────────┼─────┼────────────┤  
  │ Suporte prioritário                   │ ❌      │ ❌     │ ✅  │ ✅         │
  ├───────────────────────────────────────┼─────────┼────────┼─────┼────────────┤  
  │ Onboarding dedicado                   │ ❌      │ ❌     │ ❌  │ ✅         │
  ├───────────────────────────────────────┼─────────┼────────┼─────┼────────────┤  
  │ SLA garantido                         │ ❌      │ ❌     │ ❌  │ ✅         │
  ├───────────────────────────────────────┼─────────┼────────┼─────┼────────────┤  
  │ API completa incl. Airbnb             │ ❌      │ ❌     │ ❌  │ ✅         │
  └───────────────────────────────────────┴─────────┴────────┴─────┴────────────┘  
   
  ---                                                                              
  4. Modelo de cobrança — Híbrido (per-unit + metered)                           
                                                                                 
  O modelo é mensalidade fixa por unidade (propriedade) + fee variável para Growth 
  e Pro:                                                                           
   
  ┌────────────┬────────────────────┬──────────────────────────────────────────┐   
  │   Plano    │  Mensalidade base  │              Fee adicional               │ 
  ├────────────┼────────────────────┼──────────────────────────────────────────┤   
  │ Starter    │ €9 × nº            │ Nenhum                                   │ 
  │            │ propriedades       │                                          │ 
  ├────────────┼────────────────────┼──────────────────────────────────────────┤   
  │ Growth     │ €14 × nº           │ + €1 por reserva (Stripe Billing Meter)  │   
  │            │ propriedades       │                                          │   
  ├────────────┼────────────────────┼──────────────────────────────────────────┤   
  │ Pro        │ €19 × nº           │ + 1% da receita (Stripe Billing Meter,   │ 
  │            │ propriedades       │ €0.01/unidade)                           │   
  ├────────────┼────────────────────┼──────────────────────────────────────────┤ 
  │ Enterprise │ Negociado          │ Negociado                                │ 
  └────────────┴────────────────────┴──────────────────────────────────────────┘

  Como funciona tecnicamente:                                                      
  - reportBookingFee() — chamado quando uma reserva entra no Growth, reporta 1
  evento ao Stripe meter                                                           
  - reportRevenueFee() — chamado em reservas Pro, reporta                        
  Math.round(revenue_in_euros) unidades ao meter (a €0.01/unidade = 1%)            
  - syncSubscriptionQuantity() — actualiza a quantidade da subscrição Stripe quando
   propriedades são adicionadas/removidas                                        
                                                                                   
  ---                                                                            
  5. Nome comercial                                                                
                                                                                   
  Lodgra — não é mais Homestay.pt.                                               
                                                                                   
  ▎ Brand: Lodgra - Intelligent Property Management                              
  ▎ Tagline: Revenue. Growth. Stay.                                              
  ▎ Domínios: lodgra.pt (app principal) · lodgra.io (suporte)                      
                                                                                   
  Homestay.pt foi o nome anterior; o rebrand para Lodgra já está totalmente        
  implementado no código, metadata e configuração de layout.        


