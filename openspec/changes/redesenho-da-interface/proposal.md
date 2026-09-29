## Why

O módulo `/palestras` foi entregue change a change e cada uma trouxe a própria casca: administração com barra de abas, painel do colaborador sem navegação, relatórios e check-in com cabeçalhos próprios. O resultado é um sistema que funciona e não se lê: três cascas diferentes, filtro de palestra repetido em cada tela, listas em cartão onde caberia tabela, e nenhum lugar que responda "como está o circuito agora" sem somar números à mão.

A cliente pediu a reconstrução da interface e aprovou o mockup navegável das 27 telas em 28/09/2026. Esta change aplica esse mockup ao produto, antes de o circuito entrar em operação em outubro.

## What Changes

- **Casca única para tudo que é autenticado.** Administração, painel, relatórios e check-in passam a viver no mesmo shell, com menu lateral fixo agrupado em cinco seções (Visão geral, Convites, Evento, Cadastro, Sistema) e itens filtrados pela matriz de papéis. **BREAKING** para `app/palestras/admin/layout.tsx` e `app/palestras/painel/layout.tsx`, que deixam de existir na forma atual.
- **Palestra vira contexto de navegação.** O seletor sobe para a barra de topo, é persistido entre telas e alimenta convites, equipe, relatórios, métricas e check-in. Os formulários de filtro por tela saem.
- **Nova tela de métricas** (`/palestras/painel/metricas`): funil de gerado a presente, confirmações por dia, ranking por regional, situação de cada palestra, lojas com melhor conversão e uma lista de alertas acionáveis. Exige consultas agregadas novas, que não existem hoje.
- **Densidade de painel.** Cartão branco sobre creme com borda hairline de 1px no interno; a borda de 2px com laje de cor fica reservada às telas públicas, ao ingresso e ao PDF. A lista de convites vira tabela no desktop, mantendo cartões no celular.
- **Telas públicas refeitas** mantendo a arquitetura de informação atual: circuito, confirmação, ingresso, estados do convite e recuperação.
- **Login com controle segmentado** para os quatro métodos de acesso, em lugar dos botões soltos, com o cartão reunindo título, abas, campos e ação.
- **Regra de copy: sem travessão.** Toda a interface passa a usar ` · `, dois-pontos, vírgula ou parênteses no lugar de `—` e `–`.
- Nenhuma regra de domínio muda: escopo por papel, estados do convite, prazos, mascaramento de CPF, limites e auditoria continuam como estão.

## Capabilities

### New Capabilities

- `navegacao-do-painel`: casca única das telas autenticadas — menu lateral filtrado por papel, barra de topo com contexto de palestra e busca, gaveta no celular, e as regras de o que cada papel enxerga na navegação.
- `metricas-do-circuito`: tela de métricas e as consultas agregadas que a alimentam, dentro do escopo de quem consulta, com as definições de taxa visíveis na tela.
- `sistema-visual`: superfícies, densidade, componentes compartilhados (botão, campo, tabela, selo de estado, aviso, abas segmentadas, medidor) e as regras de acessibilidade e de copy que valem para toda a interface.

### Modified Capabilities

<!-- Nenhuma. `openspec/specs/` está vazio: as capabilities de `painel-colaborador`,
     `operacao-evento`, `auth-e-papeis` e `confirmacao-convidado` ainda vivem nas
     próprias changes e nenhum requisito de domínio delas muda aqui. O que muda é
     apresentação, coberta pelas três capabilities novas acima. -->

## Impact

**Código de interface** (reescrito ou substituído)

- Cascas: `app/palestras/admin/layout.tsx`, `app/palestras/painel/layout.tsx`, `app/palestras/layout.tsx`, `components/palestras/selo.tsx` (CabecalhoDoCircuito), `components/palestras/barra-da-sessao.tsx`.
- Telas do painel: `painel/page.tsx`, `painel/convites/{page,linha}.tsx`, `painel/convites/[codigo]/page.tsx`, `painel/equipe/page.tsx`.
- Telas administrativas: `admin/page.tsx`, `admin/palestras/*`, `admin/organizacao/*`, `admin/importar/*`, `admin/gerar/*`, `admin/distribuir/*`, `admin/auditoria/page.tsx`.
- Operação e relatórios: `relatorios/page.tsx`, `relatorios/lista/*`, `checkin/*`.
- Acesso: `entrar/page.tsx`, `entrar/layout.tsx`, `entrar/formularios.tsx`.
- Públicas: `palestras/page.tsx`, `c/[codigo]/{page,formulario,ingresso}.tsx`, `ingresso/*`, `components/palestras/{publico,estados}.tsx`.
- Biblioteca de componentes: `components/ui/index.tsx` ganha abas segmentadas, medidor, linha do tempo, painel lateral e variantes de densidade.

**Consultas**

- `lib/palestras/dados.ts` e `lib/palestras/consultas.ts` ganham agregações por dia e por loja para a tela de métricas, sempre passando pelo escopo (`lib/palestras/escopo.ts`). Nenhuma consulta existente muda de assinatura sem necessidade.

**Fora do escopo**

- Schema do banco, Server Actions, autenticação, auditoria e geração de PDF: sem alteração.
- Landing dos 45 anos e `/foto-comemorativa`: não entram nesta change.
- Dados de exemplo do mockup não vão para o produto; a tela de métricas lê o banco.

**Referência visual**

- Mockup aprovado (27 artboards): canvas "Mockup Circuito Acelera no Campo 3.0", validado pela cliente em 28/09/2026.
- Design system: `tokens.css` e `docs/Nossa Lavoura 45 Anos Design System/`, sem mudança de token.
