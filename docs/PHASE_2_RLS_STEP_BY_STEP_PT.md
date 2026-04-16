# Phase 2: Configuração de RLS Policies - Guia Passo-a-Passo

**Idioma**: Português
**Tempo Estimado**: 15 minutos
**Dificuldade**: Fácil (copy-paste)

---

## 🎯 Objetivo

Configurar 4 políticas de segurança (RLS) no bucket `property-images` para controlar quem pode fazer upload, visualizar e deletar imagens.

---

## ✅ Passo 0: Acessar o Dashboard

1. Abra: **https://supabase.com/dashboard**
2. Selecione o projeto: **brjumbfpvijrkhrherpt**
3. Clique em **Storage** (lado esquerdo)
4. Clique no bucket **property-images**
5. Clique na aba **Policies**

Você verá:
```
Storage > property-images
 [Objects] [Policies] [Settings]

[+ Add New Policy]

(Nenhuma política configurada ainda)
```

---

## ✅ Passo 1: Criar Política #1 - Manager Upload

**O que faz**: Permite que managers e admins façam upload de imagens

### 1.1 Clique em `[+ Add New Policy]`

### 1.2 Escolha "For full customization, use custom check my expression"
(não use templates)

### 1.3 Preencha os campos:

**POLICY NAME:**
```
Allow managers to upload images
```

**TARGET ROLES:**
- ☑ Public
- ☑ Authenticated

**ALLOWED OPERATIONS:**
- ☑ INSERT
- ☐ SELECT
- ☐ UPDATE
- ☐ DELETE

**CUSTOM EXPRESSION (SQL):**
```sql
(bucket_id = 'property-images')
AND auth.jwt() ->> 'role' IN ('admin', 'manager')
AND (auth.jwt() ->> 'organization_id')::uuid = (
  SELECT organization_id FROM properties
  WHERE properties.id = (path_tokens[2])::uuid
)
```

### 1.4 Clique em "Review" para verificar

### 1.5 Clique em "Save policy"

✅ **Resultado**: Política #1 criada

---

## ✅ Passo 2: Criar Política #2 - User View Organization Images

**O que faz**: Permite que usuários visualizem imagens da sua organização

### 2.1 Clique novamente em `[+ Add New Policy]`

### 2.2 Preencha os campos:

**POLICY NAME:**
```
Allow users to view organization images
```

**TARGET ROLES:**
- ☑ Public
- ☑ Authenticated

**ALLOWED OPERATIONS:**
- ☐ INSERT
- ☑ SELECT
- ☐ UPDATE
- ☐ DELETE

**CUSTOM EXPRESSION (SQL):**
```sql
(bucket_id = 'property-images')
AND auth.jwt() ->> 'role' IS NOT NULL
AND (auth.jwt() ->> 'organization_id')::uuid IN (
  SELECT organization_id FROM properties
  WHERE properties.id = (path_tokens[2])::uuid
)
```

### 2.3 Clique em "Review"

### 2.4 Clique em "Save policy"

✅ **Resultado**: Política #2 criada

---

## ✅ Passo 3: Criar Política #3 - Public Access

**O que faz**: Permite que pessoas não autenticadas visualizem imagens de propriedades públicas

### 3.1 Clique novamente em `[+ Add New Policy]`

### 3.2 Preencha os campos:

**POLICY NAME:**
```
Allow public access for public properties
```

**TARGET ROLES:**
- ☑ Public
- ☐ Authenticated

**ALLOWED OPERATIONS:**
- ☐ INSERT
- ☑ SELECT
- ☐ UPDATE
- ☐ DELETE

**CUSTOM EXPRESSION (SQL):**
```sql
(bucket_id = 'property-images')
AND (
  SELECT is_public FROM properties
  WHERE properties.id = (path_tokens[2])::uuid
) = true
```

### 3.3 Clique em "Review"

### 3.4 Clique em "Save policy"

✅ **Resultado**: Política #3 criada

---

## ✅ Passo 4: Criar Política #4 - Admin Delete

**O que faz**: Permite que apenas admins deletem imagens

### 4.1 Clique novamente em `[+ Add New Policy]`

### 4.2 Preencha os campos:

**POLICY NAME:**
```
Allow admins to delete images
```

**TARGET ROLES:**
- ☑ Public
- ☑ Authenticated

**ALLOWED OPERATIONS:**
- ☐ INSERT
- ☐ SELECT
- ☐ UPDATE
- ☑ DELETE

**CUSTOM EXPRESSION (SQL):**
```sql
(bucket_id = 'property-images')
AND auth.jwt() ->> 'role' = 'admin'
AND (auth.jwt() ->> 'organization_id')::uuid = (
  SELECT organization_id FROM properties
  WHERE properties.id = (path_tokens[2])::uuid
)
```

### 4.3 Clique em "Review"

### 4.4 Clique em "Save policy"

✅ **Resultado**: Política #4 criada

---

## ✅ Passo 5: Verificação Final

Na aba "Policies", você deve ver:

```
✅ Allow managers to upload images          | INSERT
✅ Allow users to view organization images  | SELECT
✅ Allow public access for public properties| SELECT
✅ Allow admins to delete images            | DELETE
```

Todos com toggle **ENABLED** (verde).

**Se alguma estiver cinza (desabilitada):**
1. Clique no toggle para ativar
2. Deve ficar verde

---

## ❓ Dúvidas Frequentes

### P: Copiei errado o SQL, recebi erro "Syntax error"

**R:** Verifique:
- Parênteses balanceados `( )`
- Aspas duplas retas `"` (não curvas `" "`)
- Nomes de tabelas corretos: `properties` (não `property`)
- Nomes de colunas corretos: `organization_id`, `is_public`
- Não adicione ponto-e-vírgula `;` no final

**Dica**: Copie direto do documento, não reescreva manualmente.

### P: Como funciona cada política?

**R:**
- **#1 (INSERT)**: Apenas `manager` ou `admin` pode fazer **upload**
- **#2 (SELECT)**: Usuários autenticados podem **visualizar** imagens da sua organização
- **#3 (SELECT)**: Pessoas não autenticadas podem **visualizar** imagens de propriedades públicas (is_public = true)
- **#4 (DELETE)**: Apenas `admin` pode **deletar** imagens

### P: Por que tantas políticas?

**R:** Cada política controla uma ação (INSERT, SELECT, DELETE). Você pode ter múltiplas políticas que se aplicam. Todas devem passar para permitir a operação.

### P: Como sabe que funcionou?

**R:** Depois configuraremos o CDN (Phase 3) e rodaremos testes (Phase 4). Os testes verificarão que:
- Managers conseguem fazer upload
- Usuários conseguem visualizar
- Públicos conseguem visualizar propriedades públicas
- Admins conseguem deletar
- Não-autorizados recebem 403 Forbidden

---

## 📋 Próximo Passo

Depois de criar as 4 políticas:

1. Avise-me que terminou
2. Vamos configurar o **CDN** (Phase 3)
3. Depois rodamos os **testes** (Phase 4)

---

**Status**: Ready para começar!
**Tempo**: ~15 minutos
**Dificuldade**: ⭐ Fácil (copy-paste do SQL)
