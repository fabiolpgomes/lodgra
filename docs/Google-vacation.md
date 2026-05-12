O teste do Google mostrou que a página está parcialmente correta, mas o schema de Vacation Rental está inválido. Isso impede que o imóvel apareça com rich results no Google.

O que está funcionando:

LocalBusiness → válido
Organization → válido

O problema principal:

Vacation rental → inválido

Isso significa que o JSON-LD da página /p/sweet-home está incompleto ou incompatível com o padrão esperado pelo Google.

Você precisa corrigir a geração dinâmica do schema dentro da aplicação.

Provavelmente você está usando Next.js + JSON-LD renderizado no <head>.

A estrutura recomendada para páginas de alojamento/local accommodation é algo parecido com isto:

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "VacationRental",
  "name": "Sweet Home",
  "description": "Apartamento confortável em Armação de Pêra",
  "image": [
    "https://lodgra.io/images/imovel-1.jpg"
  ],
  "url": "https://lodgra.io/p/sweet-home",
  "telephone": "+351900000000",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "Av Gen Humberto Delgado",
    "addressLocality": "Armação de Pêra",
    "postalCode": "8365-000",
    "addressCountry": "PT"
  },
  "geo": {
    "@type": "GeoCoordinates",
    "latitude": "37.102",
    "longitude": "-8.356"
  },
  "amenityFeature": [
    {
      "@type": "LocationFeatureSpecification",
      "name": "Wi-Fi",
      "value": true
    }
  ],
  "occupancy": {
    "@type": "QuantitativeValue",
    "maxValue": 4
  },
  "petsAllowed": false
}
</script>

Os erros mais comuns que causam exatamente esse problema:

campo image ausente
address incompleto
URLs relativas ao invés de absolutas
@type incorreto
schema sendo renderizado apenas no client side
JSON quebrado
campos vazios ("")
múltiplos schemas conflitantes

Além disso, encontrei outros problemas técnicos importantes no teste:

1. CSP bloqueando scripts inline

O Google detectou:

Executing inline script violates Content Security Policy

Isso pode impedir o Google de ler partes do schema.

Você precisa:

Se usa Next.js

Adicionar nonce corretamente ou permitir inline para JSON-LD:

Exemplo:

<script
  type="application/ld+json"
  dangerouslySetInnerHTML={{
    __html: JSON.stringify(schema)
  }}
/>

E ajustar a CSP para permitir esse script.

2. Sentry inicializado duas vezes

O teste mostrou:

Sentry.init() more than once

Corrija removendo uma inicialização:

mantenha apenas:
instrumentation-client.ts
OU
sentry.client.config.ts

Não os dois.

3. Problema no Service Worker/PWA
Service worker registration failed

Isso não afeta diretamente SEO, mas indica erro estrutural na aplicação.

Revise:

next-pwa
registro do SW
modo production
O que eu faria agora no Lodgra
Prioridade 1 — Corrigir schema VacationRental

Criar um gerador centralizado:

generateVacationRentalSchema(property)

e renderizar server-side.

Prioridade 2 — Garantir SSR do JSON-LD

O Google prefere schema presente no HTML inicial.

Em Next.js App Router:

export async function generateMetadata()

ou renderizar diretamente no Server Component.

Prioridade 3 — Validar automaticamente

Após cada deploy:

testar URL
validar schema
salvar resultado

Você pode automatizar isso no CI/CD.

Estrutura ideal para Lodgra

Cada propriedade deveria gerar automaticamente:

VacationRental
BreadcrumbList
ImageObject
Offer
AggregateRating
LocalBusiness

Isso aumenta muito a chance de:

aparecer no Google Travel
rich snippets
indexação mais rápida
CTR maior

Outro detalhe importante:

Seu sistema já está muito próximo do correto. O Google conseguiu:

acessar a página
renderizar JS
detectar schemas

Então o problema não é estrutural do app inteiro.
É principalmente qualidade/completude do schema VacationRental