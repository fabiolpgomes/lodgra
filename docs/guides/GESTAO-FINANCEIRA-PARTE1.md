# 💰 GESTÃO FINANCEIRA - PARTE 1

## ✅ **O QUE FOI IMPLEMENTADO:**

### **1. Tabela de Despesas** 📋
- ✅ Banco de dados (`expenses`)
- ✅ Relacionada com propriedades
- ✅ Suporte multi-moedas
- ✅ 11 categorias de despesas

### **2. Página de Despesas** `/expenses`
- ✅ Lista todas as despesas
- ✅ Filtro por propriedade
- ✅ Total de despesas
- ✅ Categorização

### **3. Nova Despesa** `/expenses/new`
- ✅ Formulário completo
- ✅ Herda moeda da propriedade
- ✅ Categorias predefinidas
- ✅ Data e notas

---

## 📦 **INSTALAÇÃO:**

```bash
cd ~/Projetos/home-stay

# 1. Parar (Ctrl+C)

# 2. Extrair
tar -xzf ~/Downloads/home-stay-v13-gestao-financeira-parte1.tar.gz --strip-components=1

# 3. EXECUTAR SQL NO SUPABASE
# Abra: migration-despesas.sql
# Copie TODO o conteúdo
# Cole no Supabase SQL Editor
# Execute (Run)

# 4. Reiniciar
rm -rf .next
npm run dev
```

---

## 🧪 **TESTAR:**

### **Teste 1: Acessar Despesas**
```
http://localhost:3000/expenses
```
Deve mostrar página vazia (ainda sem despesas)

### **Teste 2: Criar Primeira Despesa**
1. Clique em "Nova Despesa"
2. Preencher:
   - **Propriedade:** Selecione uma
   - **Data:** Hoje
   - **Categoria:** "Limpeza"
   - **Descrição:** "Limpeza após check-out"
   - **Valor:** 80
3. Salvar
4. **Verificar:** Deve aparecer na lista

### **Teste 3: Verificar Moeda**
- Se propriedade é BRL → Despesa em R$
- Se propriedade é EUR → Despesa em €

---

## 📊 **CATEGORIAS DISPONÍVEIS:**

| Categoria | Descrição |
|-----------|-----------|
| Limpeza | Serviços de limpeza |
| Manutenção | Manutenção preventiva/corretiva |
| Utilidades | Água, luz, gás |
| Impostos | IMI, IRS, etc |
| Seguros | Seguros diversos |
| Suprimentos | Toalhas, produtos |
| Reparos | Consertos |
| Marketing | Anúncios, fotos |
| Gestão | Taxas de gestão |
| Hipoteca | Financiamento |
| Outros | Demais despesas |

---

## 🎯 **PRÓXIMO PASSO (PARTE 2):**

Após testar, vou implementar:
1. ✅ Dashboard com Lucro Líquido
2. ✅ Receita vs Despesas
3. ✅ Gráficos de fluxo de caixa
4. ✅ Relatórios expandidos com lucro

---

**Execute o SQL e teste criar uma despesa!** 💸
