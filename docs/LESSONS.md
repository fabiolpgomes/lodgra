# LIÇÕES APRENDIDAS (Meta-Learning)

- [Setup] Sempre verificar versões antes de instalar.
- [Geral] Manter arquivos de governança sempre na raiz para fácil acesso.
- [Next.js] Páginas server-side (async) para buscar dados do Supabase sem client-side fetching.
- [Next.js] Usar 'use client' apenas em páginas com interatividade (forms, estados).
- [Next.js] Adicionar suppressHydrationWarning no html e body para evitar warnings de hydration.
- [Next.js] Rotas dinâmicas com [id] para páginas de detalhes.
- [UI/UX] Dashboard inicial simples com cards de estatísticas e ações rápidas.
- [UI/UX] Modal de confirmação para ações destrutivas (excluir).
- [UI/UX] Breadcrumb e botões "Voltar" melhoram navegação.
- [Supabase] Sempre tratar erros ao buscar dados e mostrar feedback ao usuário.
- [CRÍTICO] .env.local DEVE estar na raiz do projeto e servidor DEVE ser reiniciado após mudanças.
- [CRÍTICO - RLS] Supabase ativa Row Level Security por padrão - desabilitar em desenvolvimento.
- [Supabase] Erro vazio {} geralmente indica problema de permissões RLS, não de código.
- [Debug] Criar arquivo diagnose.js para verificar variáveis de ambiente rapidamente.
- [Componentes] Separar lógica complexa (como modais) em componentes reutilizáveis.
