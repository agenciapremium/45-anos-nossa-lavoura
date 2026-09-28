## Why

Todas as peças de convite do Circuito de Palestras Acelera no Campo 3.0 (quatro palestras em Rondônia, outubro/2026) dependem de um link de confirmação que ainda não existe. Antes de qualquer link poder ser distribuído, é preciso existir: a base técnica do módulo, as palestras cadastradas, a hierarquia Regional → Loja → Colaborador carregada a partir da planilha da Nossa Lavoura, e a capacidade do Admin gerar lotes de links e entregá-los ao colaborador em PDF pronto para o WhatsApp.

Esta é a change de base: as outras quatro dependem dos convites que ela produz.

## What Changes

- **BREAKING (infraestrutura)**: o repositório, hoje um site estático, passa a ser um projeto Next.js (App Router) + TypeScript. A landing dos 45 anos e a `/foto-comemorativa` são **reconstruídas como páginas React**, e o HTML estático (`index.html`, `styles.css`, `main.js`, `foto-comemorativa/`) é eliminado. As URLs públicas, o conteúdo visível e o SEO permanecem idênticos; só a tecnologia por trás muda.
- Banco Neon Postgres com Drizzle ORM, migrações versionadas no repo, e o esquema completo do domínio (`palestra_*`) mais as tabelas do Better Auth.
- CRUD de palestras pelo Admin, com prazo de confirmação calculado como 23h59 da véspera (America/Porto_Velho) e editável, e mensagem padrão de WhatsApp por palestra.
- CRUD de regionais, lojas e usuários, com papéis e desativação.
- Importação em massa por CSV: modelo baixável, validação linha a linha, pré-visualização com contagem de novos/atualizados/erros, upsert por CPF e relatório de erros exportável.
- Geração de lotes de convites pelo Admin: uma operação cobre vários colaboradores com quantidades diferentes na mesma palestra; cada convite recebe um código curto de 6 caracteres sem ambiguidade visual.
- Ciclo de vida base do convite (`disponivel` → `expirado`), com expiração calculada na leitura e consolidada por cron diário da Vercel.
- PDF de distribuição por colaborador, com link em texto puro e botão "Enviar via WhatsApp" clicável; em lote, um arquivo por colaborador dentro de um `.zip`.
- Trilha de auditoria de toda ação sensível.
- Página pública `/palestras` apresentando o circuito e as quatro palestras, sem formulário.

Fora desta change: confirmação pelo convidado, login dos colaboradores, painel do colaborador e check-in. Até `auth-e-papeis` entrar, o acesso administrativo usa um guard provisório (ver design).

## Capabilities

### New Capabilities

- `plataforma-palestras`: base Next.js do módulo `/palestras` dentro do projeto existente, preservação das URLs da landing atual, variáveis de ambiente, conexão com o Neon e a página pública de apresentação do circuito.
- `cadastro-palestras`: criação, edição, desativação e listagem de palestras, cálculo e ajuste do prazo de confirmação, mensagem padrão de WhatsApp por palestra.
- `estrutura-organizacional`: regionais, lojas e usuários com papel e vínculo de escopo, criação e edição pela interface, desativação.
- `importacao-csv`: modelo de CSV baixável, validação, pré-visualização em duas etapas, upsert idempotente e relatório de erros.
- `geracao-convites`: geração de lotes de convites por palestra e colaborador, código curto único, estados `disponivel` e `expirado`, expiração por prazo.
- `pdf-distribuicao`: PDF por colaborador com os convites disponíveis, link em texto e botão `wa.me` clicável, geração em lote compactada.
- `auditoria`: registro imutável de ações sensíveis com ator, ação, entidade e payload.

### Modified Capabilities

Nenhuma — não há specs existentes em `openspec/specs/`.

## Impact

- **Repositório**: introdução de `package.json`, `tsconfig.json`, `next.config.ts`, `app/`, `components/`, `lib/`, `drizzle/`. A landing e a foto comemorativa viram páginas e componentes React; apenas as imagens, fontes e demais binários vão para `public/`. `index.html`, `styles.css`, `main.js` e `foto-comemorativa/` são removidos ao fim da migração.
- **Deploy**: o projeto Vercel existente passa de "Other/estático" para preset Next.js; `vercel.json` precisa ser revisto (redirects mantidos, `cleanUrls` passa a ser responsabilidade do Next).
- **Novos serviços**: Neon Postgres (banco e região a definir — ver Open Questions do design) e, a partir daqui, dependência de `DATABASE_URL` no build/runtime.
- **Novas dependências**: next, react, drizzle-orm, @neondatabase/serverless, zod, tailwindcss, shadcn/ui, @react-pdf/renderer, papaparse, nanoid, date-fns-tz, archiver (ou jszip).
- **Banco**: o Neon já está provisionado e conectado ao projeto da Vercel, com as variáveis no `.env` local.
- **Variáveis de ambiente**: `DATABASE_URL`, `APP_BASE_URL`, `CRON_SECRET` (as de auth e e-mail entram em `auth-e-papeis`).
- **Risco de regressão**: a landing dos 45 anos está no ar e é a peça principal da campanha; qualquer alteração precisa preservar URLs, headers de cache e SEO (`sitemap.xml`, `robots.txt`).
