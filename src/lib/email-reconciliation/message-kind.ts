export type ReservationMessageKind = 'confirmation' | 'change' | 'irrelevant' | 'other'

/** Placeholder kept instead of the body of messages that carry no reservation data (e.g. login codes). */
export const DISCARDED_CONTENT = '[conteúdo descartado: mensagem sem dados de reserva]'

const normalize = (subject: string) => subject.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase()

/**
 * Only explicit confirmation subjects can create reservations automatically.
 * Security codes, payouts and reviews are discarded instead of queued for human review.
 */
export function reservationMessageKind(subject: string): ReservationMessageKind {
  const text = normalize(subject)
  if (/codigo de verificacao|verification code|security code|codigo de seguranca|one-time (pass)?code|login code/.test(text)) return 'irrelevant'
  // Replies/forwards are conversations about an existing stay, never a new reservation.
  if (/^\s*(re|res|fw|fwd|enc)\s*:/.test(text)) return 'irrelevant'
  if (/cancel|modific|alterad|alteracao|changed|change to|updated|refund|reembols|declin|recus/.test(text)) return 'change'
  if (/nova reserva|new reservation|new booking|booking confirm|reservation confirm|reserva confirm|confirmed reservation|confirmed booking|reservierung bestatigt|nouvelle reservation|reservation confirmee|rezervace potvrzena/.test(text)) return 'confirmation'
  // Airbnb "request to book" accepted by the host: "A solicitação de <hóspede> foi confirmada".
  if (/solicitacao de .+ (foi )?(confirmada|aceita)|reservation request .*(confirmed|accepted)|request from .+ (has been |was )?(confirmed|accepted)|pedido de reserva .*(confirmado|aceite)/.test(text)) return 'confirmation'
  if (/pagamento|payout|payment|we sent you|enviamos|fatura|invoice|extrato|statement|avalia|review|newsletter|dicas|tips/.test(text)) return 'irrelevant'
  // Platform marketing sent from the same domains (flights, car rental, offers, "finish your booking" nudges).
  // Host tips, pricing nudges and performance digests.
  if (/lembrete|reminder|ajustar os precos|adjust (your )?prices|taxa de cliques|click.?through|desempenho|performance|visibilidade|visibility|melhore|improve your/.test(text)) return 'irrelevant'
  if (/flight|voo|aluguel de carro|car rental|destination|destino|oferta|offer|deal|desconto|discount|genius|finish your|complete your|termine a sua|conclua a sua/.test(text)) return 'irrelevant'
  // Service, community and host-tool notices: no reservation data.
  if (/atendimento ao cliente|customer service|customer support|pesquisa|survey|mencionou|mentioned you|nova mensagem|new message|nova pergunta|new question|novas ferramentas|new tools|financial report|relatorio|informacoes uteis|useful information|mensagem programada|scheduled message|acesso exclusivo|exclusive access/.test(text)) return 'irrelevant'
  return 'other'
}
