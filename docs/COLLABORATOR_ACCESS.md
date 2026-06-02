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
✅ App funciona offline (com dados em cache)

#### 📱 Android (Chrome)
1. Abra: https://www.lodgra.io em **Chrome**
2. Clique no **Menu** (⋮) no canto superior direito
3. Selecione **"Instalar app"** ou **"Install app"**
4. Confirme **"Instalar"**
5. O app aparecerá na sua **Home Screen**
6. Ícone: Logo Lodgra (personalizável)

**Alternativa:** Menu → "Add to Home Screen"

#### 🍎 Mac (Safari)
1. Abra: https://www.lodgra.io em **Safari**
2. Clique em **Arquivo** (File) no menu superior
3. Selecione **"Add to Dock"** ou **"Add to Home Screen"**
4. Nomeie a app (ex: "Lodgra")
5. Clique **"Adicionar"** (Add)
6. App será instalada como uma app independente

**Dica:** Aparecerá no Dock do Mac e na Launchpad

#### 🖥️ Windows (Chrome/Edge)
1. Abra: https://www.lodgra.io
2. Clique no **ícone de instalação** (⬇️) na barra de endereço
3. Selecione **"Instalar"** ou **"Install"**
4. App será adicionada ao Menu Iniciar e Desktop

#### 🐧 Linux (Chrome)
1. Abra: https://www.lodgra.io em **Chrome**
2. Clique no **Menu** (⋮)
3. Selecione **"Instalar"** ou **"Install Lodgra"**
4. Confirme a instalação
5. App será disponível via terminal: `lodgra`

---

## 🔑 Primeiro Acesso — O Que Esperar

1. **Login página**
   - Opções: Email/Senha ou GitHub OAuth
   - Tempo: < 2 segundos

2. **Redirect para onboarding** (primeira vez)
   - Seleção de plano (Essencial, Expansão, Premium)
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
