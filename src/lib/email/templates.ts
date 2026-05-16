export interface EmailTemplate {
  subject: string
  html: string
  text: string
}

export function subscriptionRenewalTemplate(
  organizationName: string,
  planName: string,
  amount: number,
  currency: string,
  renewalDate: string
): EmailTemplate {
  return {
    subject: `Sua subscrição Lodgra foi renovada`,
    html: `
      <h1>Subscrição Renovada</h1>
      <p>Olá ${organizationName},</p>
      <p>Sua subscrição ao plano <strong>${planName}</strong> foi renovada com sucesso.</p>
      <p><strong>Detalhes:</strong></p>
      <ul>
        <li>Plano: ${planName}</li>
        <li>Valor: ${(amount / 100).toFixed(2)} ${currency}</li>
        <li>Próxima renovação: ${renewalDate}</li>
      </ul>
      <p>Se tiver alguma dúvida, entre em contato com nosso suporte.</p>
      <p>Obrigado por usar Lodgra!</p>
    `,
    text: `
      Subscrição Renovada

      Olá ${organizationName},

      Sua subscrição ao plano ${planName} foi renovada com sucesso.

      Detalhes:
      - Plano: ${planName}
      - Valor: ${(amount / 100).toFixed(2)} ${currency}
      - Próxima renovação: ${renewalDate}

      Se tiver alguma dúvida, entre em contato com nosso suporte.

      Obrigado por usar Lodgra!
    `,
  }
}

export function subscriptionPastDueTemplate(
  organizationName: string,
  planName: string,
  amountDue: number,
  currency: string,
  dueDate: string
): EmailTemplate {
  return {
    subject: `Ação necessária: Pagamento vencido da sua subscrição Lodgra`,
    html: `
      <h1>Pagamento Vencido</h1>
      <p>Olá ${organizationName},</p>
      <p>Detectamos que o pagamento da sua subscrição ao plano <strong>${planName}</strong> está vencido.</p>
      <p><strong>Detalhes:</strong></p>
      <ul>
        <li>Plano: ${planName}</li>
        <li>Valor devido: ${(amountDue / 100).toFixed(2)} ${currency}</li>
        <li>Data de vencimento: ${dueDate}</li>
      </ul>
      <p>Por favor, atualize seu método de pagamento ou entre em contato com nosso suporte para resolver este problema.</p>
      <p>Se o pagamento não for recebido, sua subscrição pode ser cancelada.</p>
      <p>Obrigado!</p>
    `,
    text: `
      Pagamento Vencido

      Olá ${organizationName},

      Detectamos que o pagamento da sua subscrição ao plano ${planName} está vencido.

      Detalhes:
      - Plano: ${planName}
      - Valor devido: ${(amountDue / 100).toFixed(2)} ${currency}
      - Data de vencimento: ${dueDate}

      Por favor, atualize seu método de pagamento ou entre em contato com nosso suporte para resolver este problema.

      Se o pagamento não for recebido, sua subscrição pode ser cancelada.

      Obrigado!
    `,
  }
}

export function subscriptionCanceledTemplate(
  organizationName: string,
  planName: string,
  canceledDate: string
): EmailTemplate {
  return {
    subject: `Sua subscrição Lodgra foi cancelada`,
    html: `
      <h1>Subscrição Cancelada</h1>
      <p>Olá ${organizationName},</p>
      <p>Sua subscrição ao plano <strong>${planName}</strong> foi cancelada.</p>
      <p><strong>Detalhes:</strong></p>
      <ul>
        <li>Plano cancelado: ${planName}</li>
        <li>Data do cancelamento: ${canceledDate}</li>
      </ul>
      <p>Você ainda pode acessar seus dados até o final do período de faturamento atual.</p>
      <p>Se deseja reativar sua subscrição, visite sua conta e escolha um novo plano.</p>
      <p>Sentiremos sua falta! Se tiver feedback, entre em contato com nosso suporte.</p>
      <p>Obrigado!</p>
    `,
    text: `
      Subscrição Cancelada

      Olá ${organizationName},

      Sua subscrição ao plano ${planName} foi cancelada.

      Detalhes:
      - Plano cancelado: ${planName}
      - Data do cancelamento: ${canceledDate}

      Você ainda pode acessar seus dados até o final do período de faturamento atual.

      Se deseja reativar sua subscrição, visite sua conta e escolha um novo plano.

      Sentiremos sua falta! Se tiver feedback, entre em contato com nosso suporte.

      Obrigado!
    `,
  }
}

export function subscriptionUpgradedTemplate(
  organizationName: string,
  oldPlan: string,
  newPlan: string,
  newAmount: number,
  currency: string,
  effectiveDate: string
): EmailTemplate {
  return {
    subject: `Sua subscrição Lodgra foi atualizada para ${newPlan}`,
    html: `
      <h1>Subscrição Atualizada</h1>
      <p>Olá ${organizationName},</p>
      <p>Sua subscrição foi atualizada com sucesso!</p>
      <p><strong>Detalhes:</strong></p>
      <ul>
        <li>Plano anterior: ${oldPlan}</li>
        <li>Novo plano: ${newPlan}</li>
        <li>Novo valor: ${(newAmount / 100).toFixed(2)} ${currency}/mês</li>
        <li>Data de vigência: ${effectiveDate}</li>
      </ul>
      <p>Suas novas funcionalidades estão disponíveis imediatamente!</p>
      <p>Obrigado por escolher Lodgra!</p>
    `,
    text: `
      Subscrição Atualizada

      Olá ${organizationName},

      Sua subscrição foi atualizada com sucesso!

      Detalhes:
      - Plano anterior: ${oldPlan}
      - Novo plano: ${newPlan}
      - Novo valor: ${(newAmount / 100).toFixed(2)} ${currency}/mês
      - Data de vigência: ${effectiveDate}

      Suas novas funcionalidades estão disponíveis imediatamente!

      Obrigado por escolher Lodgra!
    `,
  }
}
