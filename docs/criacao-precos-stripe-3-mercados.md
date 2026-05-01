Criação de Preços no Stripe — 3 Mercados                                      
                                         
  Estrutura: 3 Produtos, 15 Preços                                              
   
  Criar 3 produtos (um por plano). Cada produto terá múltiplos preços (um por   
  moeda + metered quando aplicável).                        
                                                                                
  ---                                                       
  Produto 1 — Starter / Essencial
                                 
  Product catalog → + Add product → Nome: Home Stay Starter
                                                                                
  Adicionar 3 preços a este produto:
                                                                                
  ┌─────┬───────┬─────────┬────────┬───────────┬─────────────────────────────┐  
  │  #  │ Moeda │ Amount  │  Tipo  │  Usage    │           Env var           │
  │     │       │         │        │   type    │                             │  
  ├─────┼───────┼─────────┼────────┼───────────┼─────────────────────────────┤
  │ 1   │ EUR   │ €9.00   │ Per    │ Licensed  │ STRIPE_PRICE_ID_STARTER_EUR │
  │     │       │         │ unit   │           │                             │  
  ├─────┼───────┼─────────┼────────┼───────────┼─────────────────────────────┤
  │ 2   │ BRL   │ R$49.00 │ Per    │ Licensed  │ STRIPE_PRICE_ID_STARTER_BRL │  
  │     │       │         │ unit   │           │                             │
  ├─────┼───────┼─────────┼────────┼───────────┼─────────────────────────────┤
  │ 3   │ USD   │ $12.00  │ Per    │ Licensed  │ STRIPE_PRICE_ID_STARTER_USD │
  │     │       │         │ unit   │           │                             │  
  └─────┴───────┴─────────┴────────┴───────────┴─────────────────────────────┘
                                                                                
  ---                                                       
  Produto 2 — Growth / Crescimento
                                  
  Product catalog → + Add product → Nome: Home Stay Growth
                                                                                
  Adicionar 6 preços (3 base + 3 metered):
                                                                                
  Base (licensed):                                          

  ┌─────┬───────┬─────────┬────────┬───────────┬────────────────────────────┐   
  │  #  │ Moeda │ Amount  │  Tipo  │  Usage    │          Env var           │
  │     │       │         │        │   type    │                            │   
  ├─────┼───────┼─────────┼────────┼───────────┼────────────────────────────┤
  │ 1   │ EUR   │ €14.00  │ Per    │ Licensed  │ STRIPE_PRICE_ID_GROWTH_EUR │
  │     │       │         │ unit   │           │                            │
  ├─────┼───────┼─────────┼────────┼───────────┼────────────────────────────┤
  │ 2   │ BRL   │ R$79.00 │ Per    │ Licensed  │ STRIPE_PRICE_ID_GROWTH_BRL │
  │     │       │         │ unit   │           │                            │   
  ├─────┼───────┼─────────┼────────┼───────────┼────────────────────────────┤
  │ 3   │ USD   │ $18.00  │ Per    │ Licensed  │ STRIPE_PRICE_ID_GROWTH_USD │   
  │     │       │         │ unit   │           │                            │   
  └─────┴───────┴─────────┴────────┴───────────┴────────────────────────────┘
                                                                                
  Metered (fee por reserva):                                

  ┌─────┬──────┬──────────┬───────┬──────────┬─────────────────────────────┐    
  │  #  │ Moed │  Amount  │ Tipo  │  Meter   │           Env var           │
  │     │  a   │          │       │          │                             │    
  ├─────┼──────┼──────────┼───────┼──────────┼─────────────────────────────┤
  │ 4   │ EUR  │ €1.00/un │ Meter │ booking_ │ STRIPE_PRICE_ID_GROWTH_METE │
  │     │      │ it       │ ed    │ fee      │ RED_EUR                     │    
  ├─────┼──────┼──────────┼───────┼──────────┼─────────────────────────────┤
  │ 5   │ BRL  │ R$5.00/u │ Meter │ booking_ │ STRIPE_PRICE_ID_GROWTH_METE │    
  │     │      │ nit      │ ed    │ fee      │ RED_BRL                     │    
  ├─────┼──────┼──────────┼───────┼──────────┼─────────────────────────────┤
  │ 6   │ USD  │ $1.50/un │ Meter │ booking_ │ STRIPE_PRICE_ID_GROWTH_METE │    
  │     │      │ it       │ ed    │ fee      │ RED_USD                     │    
  └─────┴──────┴──────────┴───────┴──────────┴─────────────────────────────┘
                                                                                
  ▎ Lógica: o código reporta quantity: 1 por reserva. O Stripe cobra o amount   
  ▎ configurado (€1, R$5 ou $1.50) por cada unit reportada.
                                                                                
  ---                                                       
  Produto 3 — Pro
                                                                                
  Product catalog → + Add product → Nome: Home Stay Pro
                                                                                
  Adicionar 6 preços (3 base + 3 metered):                  

  Base (licensed):

  ┌─────┬───────┬──────────┬──────────┬────────────┬─────────────────────────┐  
  │  #  │ Moeda │  Amount  │   Tipo   │ Usage type │         Env var         │
  ├─────┼───────┼──────────┼──────────┼────────────┼─────────────────────────┤  
  │ 1   │ EUR   │ €19.00   │ Per unit │ Licensed   │ STRIPE_PRICE_ID_PRO_EUR │
  ├─────┼───────┼──────────┼──────────┼────────────┼─────────────────────────┤
  │ 2   │ BRL   │ R$109.00 │ Per unit │ Licensed   │ STRIPE_PRICE_ID_PRO_BRL │  
  ├─────┼───────┼──────────┼──────────┼────────────┼─────────────────────────┤
  │ 3   │ USD   │ $24.00   │ Per unit │ Licensed   │ STRIPE_PRICE_ID_PRO_USD │  
  └─────┴───────┴──────────┴──────────┴────────────┴─────────────────────────┘  
   
  Metered (1% da receita):                                                      
                                                            
  ┌─────┬──────┬───────────┬───────┬───────────┬───────────────────────────┐    
  │  #  │ Moed │  Amount   │ Tipo  │   Meter   │          Env var          │
  │     │  a   │           │       │           │                           │    
  ├─────┼──────┼───────────┼───────┼───────────┼───────────────────────────┤
  │ 4   │ EUR  │ €0.01/uni │ Meter │ revenue_f │ STRIPE_PRICE_ID_PRO_METER │
  │     │      │ t         │ ed    │ ee        │ ED_EUR                    │    
  ├─────┼──────┼───────────┼───────┼───────────┼───────────────────────────┤
  │ 5   │ BRL  │ R$0.01/un │ Meter │ revenue_f │ STRIPE_PRICE_ID_PRO_METER │    
  │     │      │ it        │ ed    │ ee        │ ED_BRL                    │
  ├─────┼──────┼───────────┼───────┼───────────┼───────────────────────────┤
  │ 6   │ USD  │ $0.01/uni │ Meter │ revenue_f │ STRIPE_PRICE_ID_PRO_METER │
  │     │      │ t         │ ed    │ ee        │ ED_USD                    │    
  └─────┴──────┴───────────┴───────┴───────────┴───────────────────────────┘
                                                                                
  ▎ Lógica do 1%: o código reporta quantity: Math.round(reserva.total_amount)   
  ▎ (receita em unidades da moeda). Com €0.01/unit: €3000 receita → reporta 3000
  ▎  units → cobra €30 = 1%.                                                    
                                                            
  ---
  Meters a criar antes dos preços metered
                                                                                
  Billing → Meters → + Create meter (criar 2):
                                                                                
  Meter 1:                                                                      
  Display name: Booking Fee                                                     
  Event name:   booking_fee                                                     
  Value key:    value                                       
  Customer key: stripe_customer_id
  Aggregation:  Sum                                                             
   
  Meter 2:                                                                      
  Display name: Revenue Fee                                 
  Event name:   revenue_fee                                                     
  Value key:    value                                       
  Customer key: stripe_customer_id
  Aggregation:  Sum

  ---
  .env.local completo
                                                                                
  # Base prices
  STRIPE_PRICE_ID_STARTER_EUR=price_...                                         
  STRIPE_PRICE_ID_STARTER_BRL=price_...                     
  STRIPE_PRICE_ID_STARTER_USD=price_...                                         
   
  STRIPE_PRICE_ID_GROWTH_EUR=price_...                                          
  STRIPE_PRICE_ID_GROWTH_BRL=price_...                      
  STRIPE_PRICE_ID_GROWTH_USD=price_...                                          
   
  STRIPE_PRICE_ID_PRO_EUR=price_...                                             
  STRIPE_PRICE_ID_PRO_BRL=price_...                         
  STRIPE_PRICE_ID_PRO_USD=price_...                                             
   
  # Metered prices                                                              
  STRIPE_PRICE_ID_GROWTH_METERED_EUR=price_...              
  STRIPE_PRICE_ID_GROWTH_METERED_BRL=price_...
  STRIPE_PRICE_ID_GROWTH_METERED_USD=price_...                                  
   
  STRIPE_PRICE_ID_PRO_METERED_EUR=price_...                                     
  STRIPE_PRICE_ID_PRO_METERED_BRL=price_...                 
  STRIPE_PRICE_ID_PRO_METERED_USD=price_...                                     
                                                            
  # Meter event names                                                           
  STRIPE_METER_EVENT_GROWTH=booking_fee
  STRIPE_METER_EVENT_PRO=revenue_fee  