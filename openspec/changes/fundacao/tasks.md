## 1. Base Next.js e reconstrução da landing

- [x] 1.1 Registrar a paridade atual: capturar status, headers, metadados e capturas de tela de `/`, `/foto-comemorativa`, `/figurinhas`, `/assets/*`, `/robots.txt`, `/sitemap.xml` em produção, como referência de comparação
- [x] 1.2 Criar `package.json`, `tsconfig.json`, `next.config.ts` e a estrutura do App Router, com TypeScript em modo estrito
- [x] 1.3 Configurar Tailwind traduzindo `tokens.css` e `styles.css` para o tema (cores, tipografia, espaçamento), e instalar shadcn/ui
- [x] 1.4 Mover imagens, vídeos e fontes para `public/`, preservando os caminhos sob `/assets/`
- [x] 1.5 Reconstruir a landing dos 45 anos como página React, seção a seção, comparando com a produção a cada etapa
- [x] 1.6 Reescrever em componentes React os comportamentos de `main.js` (animações, rolagem, interações)
- [x] 1.7 Reconstruir `/foto-comemorativa`, migrando a lógica de canvas de `foto-comemorativa.js` para um componente cliente
- [x] 1.8 Comparar imagens geradas pela foto comemorativa antes e depois, nos formatos de perfil e story, com a mesma foto de origem
- [x] 1.9 Migrar metadados e Open Graph para a API de metadata do Next, reproduzindo exatamente as tags atuais
- [x] 1.10 Migrar `robots.txt` e `sitemap.xml`, mantendo as mesmas URLs e o mesmo conteúdo
- [x] 1.11 Migrar os headers de `vercel.json` para `next.config.ts` e manter os redirects de host e de `/figurinhas`
- [x] 1.12 Criar o carregador de configuração com validação Zod de `DATABASE_URL`, `APP_BASE_URL` e `CRON_SECRET`, falhando na inicialização quando faltar variável obrigatória
- [x] 1.13 Criar os utilitários de fuso `America/Porto_Velho` (formatação, início do dia, véspera às 23h59) com testes
- [ ] 1.14 Publicar preview na Vercel e executar a checagem de paridade do item 1.1, incluindo conferência visual em desktop e celular
- [ ] 1.15 Após a versão React estar no ar e aprovada, remover `index.html`, `styles.css`, `main.js` e `foto-comemorativa/` em commit próprio

## 2. Banco de dados e esquema

- [x] 2.1 Conferir a conexão com o banco Neon já provisionado e a presença das variáveis nos ambientes da Vercel e no `.env` local
- [x] 2.2 Configurar Drizzle ORM com o driver serverless do Neon e o pipeline de migrações versionadas
- [x] 2.3 Definir o esquema `palestra_regional`, `palestra_loja` e as tabelas do Better Auth (`user` estendida com cpf, data_nascimento, whatsapp, papel, regional_id, loja_id, ativo; `session`, `account`, `verification`)
- [x] 2.4 Definir o esquema `palestra_evento`, `palestra_lote` e `palestra_convite`, com unicidade de `codigo` e domínio do campo `estado`
- [x] 2.5 Definir o esquema `palestra_confirmacao`, `palestra_checkin`, `palestra_importacao` e `palestra_auditoria` (usados integralmente pelas changes seguintes)
- [x] 2.6 Criar o índice único parcial em `palestra_confirmacao (cpf) WHERE ativa` e os índices de consulta por evento, colaborador e estado
- [x] 2.7 Rodar a migração inicial em preview e verificar que uma segunda execução é idempotente
- [x] 2.8 Implementar o helper de transição de estado de convite com transação e `SELECT ... FOR UPDATE`, compartilhado com as changes seguintes

## 3. Guard administrativo provisório

- [x] 3.1 Implementar o guard de `/palestras/admin/*` por `ADMIN_PREVIEW_TOKEN` em cookie ou header, com 404 (não 401) para não revelar a existência das rotas
- [x] 3.2 Aplicar `noindex` e `nofollow` em todas as telas administrativas
- [x] 3.3 Registrar no README do módulo que o guard é provisório e é removido por `auth-e-papeis`

## 4. Auditoria

- [x] 4.1 Implementar o serviço de auditoria com ator, ação, entidade, identificador e payload
- [x] 4.2 Garantir que o payload nunca inclua CPF completo, senha, OTP ou token de ingresso
- [x] 4.3 Criar a tela de consulta com filtros por ator, ação, entidade e período
- [x] 4.4 Testar que registros de auditoria não podem ser alterados nem removidos pela aplicação

## 5. Telas administrativas para validação em preview

Implementadas em Next com dados de exemplo e validadas pela cliente no preview, antes de a lógica de domínio ser finalizada.

- [x] 5.1 Página pública `/palestras` com as quatro palestras
- [x] 5.2 Telas do CRUD de palestras, incluindo o editor da mensagem de WhatsApp com os marcadores
- [x] 5.3 Telas do CRUD de regionais, lojas e usuários
- [x] 5.4 Telas da importação em duas etapas: envio, pré-visualização com contagens e lista de erros, confirmação
- [x] 5.5 Tela de geração de lotes com filtro por regional e loja e quantidades por colaborador
- [x] 5.6 Amostra do PDF de distribuição, com cabeçalho, bloco de palestra e linhas de convite
- [ ] 5.7 Publicar em preview e validar as telas com a cliente antes de seguir para o grupo 6

## 6. Cadastro de palestras

- [x] 6.1 Implementar o CRUD de palestras com validação Zod compartilhada entre formulário e servidor
- [x] 6.2 Implementar o cálculo automático do prazo como véspera às 23h59 em `America/Porto_Velho`, com marcação de ajuste manual
- [x] 6.3 Implementar o recálculo do prazo quando a data muda e o prazo nunca foi ajustado manualmente
- [x] 6.4 Recusar prazo igual ou posterior à data e hora da palestra
- [x] 6.5 Implementar a mensagem padrão de WhatsApp por palestra, com validação dos marcadores e obrigatoriedade de `{link}`
- [x] 6.6 Implementar desativação e impedir exclusão de palestra com convites gerados
- [x] 6.7 Implementar a página pública `/palestras` listando apenas palestras ativas, ordenadas por data

## 7. Estrutura organizacional

- [x] 7.1 Implementar o CRUD de regionais com nome único
- [x] 7.2 Implementar o CRUD de lojas com código único e vínculo obrigatório à regional
- [x] 7.3 Implementar o CRUD de usuários com papel único, vínculo de escopo exigido por papel e CPF único
- [x] 7.4 Implementar validação de CPF por dígito verificador, normalização para dígitos e validação de data no formato DD/MM/AAAA
- [x] 7.5 Implementar a desativação de usuário, loja e regional preservando o histórico
- [x] 7.6 Garantir que convites de colaborador desativado permanecem válidos e passam a ser geridos pelo Admin

## 8. Importação CSV

- [x] 8.1 Gerar o modelo `colaboradores.csv` baixável, com cabeçalhos exatos e exemplos por papel
- [x] 8.2 Implementar o parser com papaparse, em UTF-8 e separador vírgula, com verificação estrita do cabeçalho
- [x] 8.3 Implementar a validação por linha: campos obrigatórios, papel válido, loja obrigatória por papel, CPF e data
- [x] 8.4 Implementar a detecção de CPF e e-mail repetidos dentro do próprio arquivo
- [x] 8.5 Implementar a pré-visualização com contagem de novos, atualizados e erros, sem gravar nada
- [x] 8.6 Implementar a confirmação em transação única, com upsert de regional por nome, loja por código e usuário por CPF
- [x] 8.7 Implementar a opção de importar apenas as linhas válidas
- [x] 8.8 Implementar o relatório de erros baixável em CSV com linha, motivo e conteúdo original
- [x] 8.9 Registrar cada importação confirmada no histórico e na auditoria
- [x] 8.10 Testar a reimportação do mesmo arquivo e verificar que nada é duplicado

## 9. Geração de convites

- [x] 9.1 Implementar o gerador de código curto de 6 caracteres do alfabeto sem ambiguidade, com fonte criptográfica
- [x] 9.2 Implementar o tratamento de colisão por re-sorteio, apoiado na unicidade do banco
- [x] 9.3 Implementar a tela de geração com filtro por regional e loja e quantidade por colaborador
- [x] 9.4 Implementar a geração em lote em transação única, com quantidades diferentes por colaborador
- [x] 9.5 Recusar quantidade inválida e geração após o prazo da palestra
- [x] 9.6 Registrar o lote com palestra, colaborador, quantidade, autor e data e hora
- [x] 9.7 Testar a geração de um lote grande (algumas centenas de convites) e medir o tempo da operação

## 10. Expiração de convites

- [x] 10.1 Implementar a avaliação de expiração na leitura de convites `disponivel`
- [x] 10.2 Implementar a rota de cron da Vercel protegida por `CRON_SECRET`, com 401 quando ausente ou incorreto
- [x] 10.3 Configurar o agendamento diário na Vercel e registrar o resultado de cada execução na auditoria
- [x] 10.4 Garantir idempotência da rotina e que convites `confirmado` não sejam afetados

## 11. PDF de distribuição

- [x] 11.1 Implementar o Route Handler de PDF com `@react-pdf/renderer` e `runtime = 'nodejs'`
- [x] 11.2 Montar o cabeçalho com identidade do Acelera no Campo 3.0, colaborador, loja e carimbo de geração
- [x] 11.3 Montar um bloco por palestra com cidade, data, horário, local e prazo
- [x] 11.4 Montar a linha de convite com número, URL em texto puro copiável e botão "Enviar via WhatsApp" clicável
- [x] 11.5 Implementar a montagem do link `wa.me` com substituição de marcadores e codificação de URL, testando acentos, quebras de linha e `&`
- [x] 11.6 Filtrar somente convites `disponivel` e tratar o caso de colaborador sem convites disponíveis
- [x] 11.7 Implementar a geração em lote com um PDF por colaborador dentro de um `.zip`, pulando quem não tem convites e informando quem foi pulado
- [x] 11.8 Definir e aplicar o limite de colaboradores por operação em lote, com geração em streaming
- [x] 11.9 Registrar cada geração de PDF na auditoria

## 12. Verificação e publicação

- [x] 12.1 Testes automatizados dos utilitários críticos: validação de CPF, cálculo de prazo, gerador de código, substituição de marcadores
- [x] 12.2 Testes de integração da importação (arquivo limpo, arquivo com erros, reimportação) e da geração de lotes
- [x] 12.3 Validar os critérios de aceite do PRD para `fundacao`, um a um
- [ ] 12.4 Repetir a checagem de paridade da landing e da foto comemorativa no deploy de produção
- [x] 12.5 Cadastrar as quatro palestras do circuito e conferir os prazos preenchidos
- [x] 12.6 Documentar no README do módulo: variáveis de ambiente, como rodar migrações e como executar a rotina de expiração manualmente
