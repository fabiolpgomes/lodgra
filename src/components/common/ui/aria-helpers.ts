/**
 * ARIA Helper: Quick accessibility utilities
 * Use to add aria-labels to icon buttons and decorative elements
 */

export const ariaLabels = {
  buttons: {
    settings: 'Abrir configurações',
    close: 'Fechar',
    back: 'Voltar',
    next: 'Próximo',
    prev: 'Anterior',
    menu: 'Abrir menu',
    search: 'Pesquisar',
    filter: 'Aplicar filtros',
    delete: 'Eliminar',
    edit: 'Editar',
    save: 'Guardar',
    cancel: 'Cancelar',
  },
  icons: {
    star: 'Classificação', // use aria-hidden="true" if decorative
    calendar: 'Calendário',
    clock: 'Horário',
    map: 'Localização',
    user: 'Utilizador',
    email: 'Email',
    phone: 'Telefone',
    home: 'Propriedade',
    bed: 'Quartos',
    bath: 'Casas de banho',
    guests: 'Hóspedes',
    check: 'Confirmado',
    x: 'Fechar',
  },
  forms: {
    email: 'Endereço de email',
    password: 'Palavra-passe',
    name: 'Nome completo',
    phone: 'Número de telefone',
    message: 'Mensagem',
    search: 'Pesquisar propriedades',
  },
}
