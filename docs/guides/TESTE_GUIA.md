# 🧪 GUIA DE TESTE - PRIMEIRA VERSÃO

## ✅ O que foi criado

### 1. Dashboard (Página Inicial)
- **URL**: http://localhost:3000
- **Funcionalidades**:
  - Cards de estatísticas (Propriedades, Reservas, Hóspedes, Receita)
  - Ações rápidas (botões para criar propriedade, reserva, ver calendário)
  - Mensagem de boas-vindas
  - Navegação no header

### 2. Listagem de Propriedades
- **URL**: http://localhost:3000/properties
- **Funcionalidades**:
  - Lista todas as propriedades cadastradas
  - Cards com informações resumidas (nome, localização, quartos, hóspedes)
  - Estado vazio (quando não há propriedades)
  - Botão para adicionar nova propriedade

### 3. Nova Propriedade (Formulário)
- **URL**: http://localhost:3000/properties/new
- **Funcionalidades**:
  - Formulário completo para cadastrar propriedade
  - Validação de campos obrigatórios
  - Mensagem de erro (se houver falha)
  - Redirecionamento após salvar

---

## 📝 Como Testar

### Passo 1: Iniciar o Servidor
```bash
cd ~/Projetos/home-stay
npm run dev
```

Aguarde aparecer: `✓ Ready in XXXms`

### Passo 2: Acessar o Dashboard
1. Abra: http://localhost:3000
2. Você deve ver:
   - Header com logo "Home Stay"
   - 4 cards de estatísticas (todos em 0)
   - 3 botões de ações rápidas
   - Mensagem de boas-vindas azul

### Passo 3: Testar Navegação
1. Clique em **"Propriedades"** no header
2. Você deve ver a mensagem: "Nenhuma propriedade cadastrada"
3. Clique em **"Adicionar Primeira Propriedade"**

### Passo 4: Criar Primeira Propriedade
1. Preencha o formulário:
   - **Nome**: Apartamento T2 Antuérpia
   - **Tipo**: Apartamento
   - **Endereço**: Rue de la Loi 123
   - **Cidade**: Antuérpia
   - **País**: Bélgica
   - **Quartos**: 2
   - **Casas de Banho**: 1
   - **Máx. Hóspedes**: 4

2. Clique em **"Salvar Propriedade"**

3. Você deve ser redirecionado para `/properties` e ver o card da propriedade criada

### Passo 5: Verificar no Supabase
1. Acesse o Supabase Dashboard
2. Vá em **Table Editor**
3. Abra a tabela **properties**
4. Você deve ver a propriedade cadastrada

---

## ✅ Checklist de Testes

- [ ] Dashboard carrega sem erros
- [ ] Cards de estatísticas mostram "0"
- [ ] Botões de ações rápidas funcionam
- [ ] Navegação do header funciona
- [ ] Página de propriedades mostra estado vazio
- [ ] Formulário de nova propriedade carrega
- [ ] Validação de campos obrigatórios funciona
- [ ] Propriedade é salva no banco de dados
- [ ] Redirecionamento após salvar funciona
- [ ] Card da propriedade aparece na listagem

---

## 🐛 Possíveis Erros

### Erro: "Invalid Supabase credentials"
**Causa**: `.env.local` não configurado ou credenciais erradas
**Solução**: 
1. Verifique se o arquivo `.env.local` existe
2. Confirme que as credenciais estão corretas
3. Reinicie o servidor (`npm run dev`)

### Erro: "relation properties does not exist"
**Causa**: Schema não foi migrado para o Supabase
**Solução**:
1. Acesse Supabase Dashboard → SQL Editor
2. Execute o conteúdo do arquivo `supabase-schema.sql`
3. Verifique se as tabelas foram criadas em Table Editor

### Erro: "Network error" ao salvar
**Causa**: Problema de conexão ou permissões
**Solução**:
1. Verifique sua conexão com internet
2. Confirme que o projeto Supabase está ativo
3. Verifique se as permissões RLS estão desabilitadas (para desenvolvimento)

---

## 🎯 Próximos Testes

Após validar que tudo funciona, podemos:
1. ✅ Criar mais propriedades
2. ✅ Testar edição de propriedades
3. ✅ Implementar exclusão de propriedades
4. ✅ Criar sistema de reservas
5. ✅ Implementar calendário unificado

---

## 📸 Screenshots Esperados

### Dashboard
```
┌─────────────────────────────────────────┐
│  🏢 Home Stay        Dashboard | Props  │
├─────────────────────────────────────────┤
│  [0 Props] [0 Reservas] [0 Hóspedes]   │
│  [Nova Propriedade] [Nova Reserva]      │
│  🎉 Bem-vindo ao Home Stay!            │
└─────────────────────────────────────────┘
```

### Propriedades (Vazio)
```
┌─────────────────────────────────────────┐
│  Propriedades          [+ Nova Prop]    │
├─────────────────────────────────────────┤
│        🏠                               │
│  Nenhuma propriedade cadastrada         │
│  [Adicionar Primeira Propriedade]       │
└─────────────────────────────────────────┘
```

### Formulário
```
┌─────────────────────────────────────────┐
│  ← Voltar                               │
│  Nova Propriedade                       │
├─────────────────────────────────────────┤
│  Nome: [____________]                   │
│  Tipo: [▼ Apartamento]                 │
│  Endereço: [____________]              │
│  [Salvar Propriedade] [Cancelar]       │
└─────────────────────────────────────────┘
```

---

Me avise se tudo funcionou ou se encontrou algum erro! 🚀
