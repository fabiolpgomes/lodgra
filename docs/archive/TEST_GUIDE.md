# 🧪 Guia Rápido de Teste - Exportação de Reservas

## ✅ Implementação Concluída

### O que foi feito:
1. ✅ **Modal de Compartilhamento** — Aparece após gerar PDF
2. ✅ **Download Confiável** — Botão de download com arquivo correto
3. ✅ **WhatsApp Sharing** — Copiar mensagem + abrir WhatsApp
4. ✅ **Segurança de Roles** — Admin vê valores, outros não
5. ✅ **Build & Lint** — Tudo passando ✓

---

## 🚀 Como Testar Localmente

### Step 1: Certifique-se que o servidor está rodando
```bash
# Terminal 1
npm run dev
# Servidor rodando em http://localhost:3000
```

### Step 2: Acesse a página de exportação
```
http://localhost:3000/reservations/export
```

### Step 3: Teste o fluxo completo

#### 3.1 Gerar PDF
1. Selecione uma propriedade (ou "Todas")
2. Escolha o período (padrão = mês atual)
3. Clique em **"Gerar PDF"**
4. Aguarde 2-5 segundos
5. Modal aparecerá com sucesso

#### 3.2 Download
1. Clique em **"Download PDF"**
2. Arquivo baixado: `reservas-YYYY-MM-DD-YYYY-MM-DD.pdf`
3. Abra o PDF e valide:
   - ✓ Período correto
   - ✓ Total de reservas
   - ✓ Tabela com dados (check-in, check-out, hóspede, noites)
   - ✓ Se admin: valores de receita

#### 3.3 Compartilhamento WhatsApp
1. Na modal, clique em **"Copiar Mensagem"**
2. Toast mostra "Copiado para a área de transferência!"
3. Clique em **"Abrir WhatsApp"**
4. WhatsApp abre com mensagem pré-formatada
5. Cole a mensagem ou envie como está

---

## 🔐 Teste com Diferentes Roles

### Admin
```bash
# Login como admin
# Acessa /reservations/export
# PDF mostra:
# ✓ Coluna "Valor" (valores das reservas)
# ✓ "Receita Total"
# ✓ "Média por Reserva"
```

### Gestor
```bash
# Login como gestor
# Acessa /reservations/export
# PDF mostra:
# ✓ Check-in, Check-out, Hóspede, Noites
# ✗ Sem coluna "Valor"
# ✗ Sem receita/média
```

### Viewer / Guest
```bash
# Comportamento igual ao Gestor
```

---

## ⚠️ Casos Especiais para Testar

### Sem Reservas
- Gere PDF para período sem reservas
- Deve mostrar: "Total de Reservas: 0"
- Não deve crashear

### Datas Inválidas
- Tente data inicial > data final
- Deve mostrar erro: "Data inicial não pode ser depois da data final"

### Modal Workflows
- [ ] Gerar PDF
- [ ] Fechar modal (X no canto)
- [ ] Gerar novo PDF
- [ ] Baixar + Compartilhar no mesmo PDF

---

## 📊 Checklist de Validação Final

- [ ] Página carrega sem erros
- [ ] PDF gerado com sucesso
- [ ] Download funciona (arquivo correto)
- [ ] Modal mostra com opções
- [ ] Copiar mensagem funciona
- [ ] WhatsApp abre com mensagem
- [ ] Admin vê valores
- [ ] Gestor não vê valores
- [ ] Build passa: `npm run build`
- [ ] Lint passa: `npm run lint`

---

## 🐛 Troubleshooting

### PDF não baixa?
1. Verifique console: `F12 > Console`
2. Procure por erros de html2pdf
3. Tente em outra aba
4. Limpe cache do navegador

### WhatsApp não abre?
1. Verifique se você tem WhatsApp Web aberto em outro navegador
2. Ou instale o WhatsApp Desktop
3. Ou copie manualmente e envie

### Modal não aparece?
1. Verifique console para erros
2. Tente recarregar a página
3. Verifique se há reservas no período

---

## 📝 Arquivos Modificados

```
src/components/reports/ReservationsPdfGenerator.tsx
├── Nova interface: ShareModalState
├── Novas funções:
│   ├── loadHtml2Pdf()
│   ├── downloadPdfFromHtml()
│   ├── handleDownloadPdf()
│   ├── handleCopyText()
│   └── closeShareModal()
└── Novo JSX: Modal com download + sharing
```

---

## ✨ Próximos Passos (Opcional)

- [ ] Teste automatizado (Playwright)
- [ ] Server-side PDF generation (pdfkit)
- [ ] Email delivery option
- [ ] S3 storage for PDFs
- [ ] Scheduled reports

---

**Status:** ✅ Pronto para teste  
**Data:** 2026-04-03  
**Versão:** 1.0
