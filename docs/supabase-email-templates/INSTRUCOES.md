# Customização de Email de Recuperação de Password - Supabase

## Problema
O email de recuperação de password enviado pelo Supabase Auth exibe a URL como texto simples, não como um link clicável.

**Email atual:**
```
https://homestay.pt/auth/callback?code=7716791&type=recovery
```

**Esperado:**
Um botão ou link clicável com estilo profissional.

---

## Solução: Customizar Template no Supabase Dashboard

### Passo 1: Aceda ao Supabase Dashboard
1. Aceda a https://supabase.com/dashboard
2. Selecione o projeto **home-stay**

### Passo 2: Navegue até Email Templates
1. No menu lateral, vá a **Authentication**
2. Clique em **Email Templates**

### Passo 3: Edite o Template "Reset Password"
1. Procure por **"Reset Password"** na lista
2. Clique no ícone de editar (lápis)

### Passo 4: Substitua o Conteúdo
1. Apague todo o conteúdo atual
2. Copie o conteúdo completo do arquivo **`reset-password-template.html`**
3. Cole no editor do Supabase

### Passo 5: Salve as Alterações
1. Clique em **Save** (botão no topo direito)
2. Aguarde a confirmação "Template updated"

### Passo 6: Teste
1. Vá a `/auth/reset-password` na aplicação
2. Introduza um email de teste
3. Verifique o email recebido
4. **Agora o link deve ser clicável!** ✅

---

## Variáveis Disponíveis no Supabase

O template suporta estas variáveis:

| Variável | O que é | Exemplo |
|----------|---------|---------|
| `{{ .SiteURL }}` | URL base da aplicação | `https://homestay.pt` |
| `{{ .Token }}` | Código de recuperação | `7716791` |
| `{{ .Email }}` | Email do utilizador | `user@example.com` |

---

## Customizações Extras (Opcional)

Se quiser fazer ajustes visuais:

### Mudar Cores
Na seção `<style>`, procure por:
```css
.header {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}
```

**Cores disponíveis:**
- Azul (novo): `background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);`
- Verde: `background: linear-gradient(135deg, #10b981 0%, #059669 100%);`
- Laranja: `background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);`

### Mudar Texto do Botão
Procure por:
```html
<a href="{{ .SiteURL }}/auth/callback?code={{ .Token }}&type=recovery" class="cta-button">
    Resetar Password
</a>
```

Pode trocar "Resetar Password" por qualquer outro texto.

### Adicionar Logo
Adicione antes do `<h1>`:
```html
<img src="https://seu-dominio.com/logo.png" alt="Home Stay" style="height: 40px; margin-bottom: 15px;">
```

---

## Resolução de Problemas

### "Template não atualiza"
- Limpe a cache do navegador (Cmd+Shift+R no Mac)
- Aguarde 5 minutos para a propagação

### "Email ainda não é clicável"
- Verifique se clicou em **Save** no Supabase
- Confirme se o cliente de email suporta HTML (alguns clientes antigos mostram só texto)

### "Caracteres estranhos no email"
- Certifique-se que copiar/colar preserva a formatação HTML
- Tente copiar direto do ficheiro `reset-password-template.html`

---

## Ficheiros Relacionados

- `reset-password-template.html` — Template HTML customizado
- `src/app/auth/reset-password/page.tsx` — Página de reset (envia o email)
- `src/app/auth/callback/route.ts` — Rota que processa o código de recuperação

---

## Próximos Passos

Depois de aplicar este template:

1. ✅ Testar com um email pessoal
2. ✅ Confirmar que o link é clicável
3. ✅ Testar o fluxo completo (reset → nova password → login)
4. ✅ Verificar em diferentes clientes de email (Gmail, Outlook, Apple Mail)

---

**Data:** 13 de Abril de 2026  
**Status:** Pronto para aplicar  
**Responsável:** @dev (Dex)
