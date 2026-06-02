# Guia de Acesso para Colaboradores — Lodgra

## 🚀 Acesso Rápido

**URL de Login:** https://www.lodgra.io/login

Simples assim! Não precisa de configuração adicional.

---

## 📋 Como Acessar

### 1. Criar Conta
1. Acesse: https://www.lodgra.io/login
2. Clique em **"Sign up"** (ou "Criar conta")
3. Preencha:
   - Email (recomendado: seu email corporativo ou pessoal)
   - Senha (mínimo 8 caracteres)
4. Clique em **"Create account"**
5. Verifique seu email para confirmar a conta
6. Volte ao login e entre com suas credenciais

### 2. Primeira Autenticação
- O sistema pode usar **GitHub OAuth** para login social (se ativado)
- Ou login tradicional com email/senha

---

## 🏢 Ambientes Disponíveis

### Produção (www.lodgra.io)
- **Status:** ✅ Ativo e em uso
- **Database:** Supabase Production
- **Dados:** Dados reais de produção
- **Acesso:** Público (qualquer um pode criar conta)

### Staging (staging preview)
- **Status:** ✅ Disponível para testes
- **URL:** Compartilhada sob demanda
- **Database:** Supabase Staging (separado de produção)
- **Dados:** Dados de teste apenas
- **Caso de Uso:** Testes de features antes de produção

---

## 📱 Plataformas Suportadas

### Web
- ✅ Chrome, Firefox, Safari, Edge
- ✅ Desktop e Mobile (responsivo)

### PWA (Progressive Web App)
- **iOS:** Safari → Share → Add to Home Screen
- **Android:** Chrome → Menu → Install app
- ✅ App funciona offline (com dados em cache)

---

## 🔑 Primeiro Acesso — O Que Esperar

1. **Login página**
   - Opções: Email/Senha ou GitHub OAuth
   - Tempo: < 2 segundos

2. **Redirect para onboarding** (primeira vez)
   - Seleção de plano (Essencial, Growth, Premium)
   - Configuração de organização
   - Tempo: ~1-2 minutos

3. **Dashboard principal**
   - Vista geral de propriedades
   - Calendário de reservas
   - Menu lateral com navegação
   - Tempo de carregamento: ~1-3 segundos

---

## 🛠️ Funcionalidades Principais

| Área | Descrição |
|------|-----------|
| **Dashboard** | Visão geral de propriedades e métricas |
| **Calendário** | Gestão de datas e disponibilidade |
| **Reservas** | Visualização e gestão de bookings |
| **Proprietários** | Informações de proprietários de imóveis |
| **Limpeza** | Checklist de limpeza por propriedade |
| **Relatórios** | Análises e estatísticas |
| **Financeiro** | Receitas, despesas, comissões |
| **Google Vacation Rentals** | Integração com Google (feed de propriedades) |
| **Configurações** | Perfil, organização, branding |

---

## 📞 Suporte & Troubleshooting

### "Failed to load resource: 503"
- Erro intermitente (servidor em reinicialização)
- **Solução:** Recarregue a página (F5)
- Normalmente resolvido em segundos

### Senha esquecida
1. No login, clique **"Forgot password?"**
2. Insira seu email
3. Verifique seu email para link de reset
4. Crie nova senha

### Não recebo email de confirmação
1. Verifique pasta de **Spam**
2. Aguarde até 5 minutos
3. Se persistir, recarregue a página e tente novamente
4. Contact: support@lodgra.io (quando disponível)

### Login com GitHub não funciona
- GitHub OAuth pode estar desativado para staging
- Use login com email/senha como fallback
- Para produção, ambas opções devem funcionar

---

## 🔐 Segurança & Boas Práticas

- ✅ Todos os dados são criptografados em trânsito (HTTPS)
- ✅ Senhas armazenadas com hash seguro (Supabase Auth)
- ✅ RLS (Row Level Security) garante isolamento de dados por organização
- ⚠️ **Não compartilhe** sua senha com outros colaboradores
- ⚠️ Logout quando terminar, especialmente em computadores compartilhados

---

## 📊 Informações Técnicas (Opcional)

**Stack:**
- Frontend: Next.js 15 (React)
- Backend: Next.js API Routes
- Database: PostgreSQL (Supabase)
- Auth: Supabase Auth + GitHub OAuth
- Deployment: Vercel

**Versão Atual:** 1.0.0 (Production)

**Última Atualização:** 2026-06-02 (Story 32.2 — Staging Environment)

---

## ❓ Dúvidas?

Se tiver problemas ao acessar ou usar o sistema:
1. Verifique este guia (section Troubleshooting)
2. Tente em outro navegador
3. Limpe cache (Ctrl+Shift+Delete)
4. Contacte: Fabio Gomes (fabiolpgomes@gmail.com)

---

*Last updated: 2026-06-02*  
*Maintained by: @dev (Dex)*
