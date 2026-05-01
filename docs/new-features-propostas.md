# Funcionalidades Futuras — Backlog

## 🌍 Internacionalização (i18n)

### i18n da página /booking
**Estado:** Pendente — decisão tomada em 2026-04-22  
**Prioridade:** Média — implementar quando expandir para mercados ES/UK  

A página `/booking` está actualmente hardcoded em português (PT). Quando o produto estiver validado e houver expansão para mercados internacionais, migrar para `/[locale]/booking` com suporte a:
- `pt` / `pt-BR` — Português (já funciona)
- `es` — Espanhol (mercado ibérico)
- `en-US` — Inglês (mercado UK/internacional)

**Ficheiros a traduzir (~30 strings):**
- `src/components/common/public/properties/PropertyFilters.tsx` — labels de filtros, comodidades, tipos de imóvel
- `src/components/common/public/properties/PropertyCard.tsx` — "Reservar Agora"
- `src/components/common/public/properties/SearchBar.tsx` — "Para onde?", placeholders
- `src/app/booking/BookingPageClient.tsx` — título, subtítulo, header

**Como implementar:**
1. Mover `src/app/booking/` para `src/app/[locale]/booking/`
2. Adicionar namespace `booking` nos ficheiros de locale existentes em `src/locales/`
3. Substituir strings hardcoded por `useTranslations('booking')`

---

## Outras Funcionalidades

mensagens automatizadas para convidados com base em regras (check-in, check-out, código da porta, dia da lixeira, etc. + algumas mensagens de IA com base em solicitações de convidados, como "check-in antecipado", check-out tardio, etc.

Integração de código de porta com a maioria das fechaduras inteligentes, onde eles enviam códigos exclusivos aos hóspedes com base em seu check-in e check-out.

integrações com outros Serviços como pricelabs, turno, etc.

Sites de reserva direta, concluido e implementado.

Configure várias subcontas para sua equipe.Tenho uma conta de faxineiro (eles podem usar suas próprias credenciais) onde veem meu calendário e nada mais,os co-anfitriões podem ver preços, calendário etc. Ela pode atribuir tarefas aos membros da equipe (como manutenção etc.)

Multicanal,multicalendário. vrbo,airbnb, direto etc.

Listagens de pais e filhos. Se quiser listar toda a sua casa E subquartos, você pode configurá-la para que a reserva 1 feche a outra, ou vice-versa.