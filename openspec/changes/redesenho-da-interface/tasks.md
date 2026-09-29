## 1. Mockup e aprovação

- [x] 1.1 Mockup navegável das 27 telas, em canvas, sobre os tokens de `tokens.css`
- [x] 1.2 Aprovação da cliente em 28/09/2026, com as quatro decisões de direção registradas em `design.md`
- [x] 1.3 Ajustes pedidos na aprovação: login com abas segmentadas e copy sem travessão

## 2. Componentes e casca

- [x] 2.1 Criar `components/ui/icones.tsx` com o conjunto de ícones de interface (traço 1.8, 24×24, `currentColor`), separado dos quatro pictogramas de marca
- [x] 2.2 Estender `components/ui/index.tsx`: abas segmentadas, medidor, chip de filtro com contagem, linha do tempo, painel lateral e as variantes de densidade das duas superfícies
- [x] 2.3 Criar `lib/palestras/contexto-de-palestra.ts`: resolve a palestra por URL, memória de sessão, dia e primeira ativa, validando o identificador contra as palestras ativas
- [x] 2.4 Criar o menu lateral como componente de servidor, montando os itens a partir de `alcanceDe` da matriz de papéis
- [x] 2.5 Criar `app/palestras/(interno)/layout.tsx` com menu, barra de topo (título, contexto de palestra, busca, ação principal) e área de conteúdo, exigindo escopo
- [x] 2.6 Mover as rotas autenticadas para o grupo `(interno)` sem alterar conteúdo, remover `admin/layout.tsx` e `painel/layout.tsx` e tirar `CabecalhoDoCircuito` das telas internas
- [x] 2.7 Implementar a gaveta de navegação no celular, com véu e alvos de 44 px
- [x] 2.8 Rodar `npm run typecheck`, `tests/acesso.test.ts` e `scripts/integracao-acesso.ts`, conferindo a matriz de respostas de `docs/AUTH-E-PAPEIS.md`

## 3. Telas do painel

- [x] 3.1 Refazer `painel/page.tsx` como início por papel, com números próprios, palestras do escopo e atalhos, removendo o selo "em breve" de relatórios e check-in
- [x] 3.2 Refazer a lista de convites: tabela no desktop e cartões no celular a partir da mesma fonte de dados, com chips de estado contados, filtros de regional, loja e colaborador, e paginação com tamanho de página
- [x] 3.3 Reimplementar as ações de linha (copiar, WhatsApp, anotar envio) e o cancelamento em duas etapas nomeando o titular
- [x] 3.4 Refazer o detalhe do convite confirmado com os dados permitidos e a linha do tempo do convite
- [x] 3.5 Refazer a tela de equipe com trilha de nível e abertura da loja no lugar, mantendo a recusa de identificador fora do escopo
- [x] 3.6 Acrescentar à lista de convites a busca por código, titular ou CPF e a ordenação, que o mockup mostra na barra de topo e ficaram de fora do primeiro corte
- [x] 3.7 Acrescentar o menu de mais ações na linha do convite, com "ver no rastro de auditoria", depois que a tarefa 5.8 existir

## 4. Métricas

- [x] 4.1 Criar `lib/palestras/metricas.ts` com série diária de confirmações, funil, colaboradores sem distribuição e agregados por loja, todos recebendo escopo
- [x] 4.2 Escrever testes puros das partes sem banco: agrupamento por dia no fuso do evento, preenchimento de dias vazios e cálculo das taxas
- [x] 4.3 Criar `app/palestras/(interno)/painel/metricas/page.tsx` com indicadores, funil, série, desempenho por regional, lojas e alertas acionáveis
- [x] 4.4 Desenhar os gráficos em SVG no servidor, série única por gráfico, rótulos diretos e grade de 1px
- [x] 4.5 Incluir Métricas no menu com a ação protegida correspondente e conferir a recusa para colaborador

## 5. Administração

- [x] 5.1 Refazer a lista de palestras com situação, prazo e convites por linha
- [x] 5.2 Refazer o formulário de palestra com pré-visualização da mensagem de WhatsApp e do cartão público, e o prazo acompanhando a data
- [x] 5.3 Refazer a estrutura organizacional com abas por nível, busca, filtros e cadastro em painel lateral
- [x] 5.4 Refazer a importação com passos, contagens, amostra, erros e confirmação em duas etapas
- [x] 5.5 Refazer a geração de convites com filtros, quantidade em massa e resumo lateral da operação
- [x] 5.6 Refazer os PDFs de distribuição com seleção, resumo lateral, aviso de quem é pulado e limite por lote
- [x] 5.7 Refazer a auditoria com filtros por ator, ação, entidade e período, e payload expandido na própria linha
- [x] 5.8 Permitir filtrar a auditoria por um registro específico (`entidadeId`), para o convite poder linkar direto para o próprio rastro

## 6. Operação, acesso e impressão

- [x] 6.1 Refazer os relatórios com a palestra em contexto, números do escopo e as definições de taxa na tela
- [x] 6.2 Ajustar a lista A4 para a superfície de impressão: 1px nas réguas, números à direita e nada de cinza abaixo do mínimo legível
- [x] 6.3 Refazer o check-in: seleção de palestra, alternância leitor e busca, resultado em tela cheia com símbolo, palavra e cor
- [x] 6.4 Refazer o acesso com abas segmentadas e o cartão único de entrada
- [x] 6.5 Ajustar as telas de código por CPF, redefinição e nova senha à mesma casca de acesso
- [x] 6.6 Refazer a casca do acesso em duas colunas, com o painel de marca em terra à esquerda e o cartão à direita, empilhando no celular, como no artboard `Entrar`
- [x] 6.7 Mostrar em relatórios o total de pessoas esperadas (titulares mais acompanhantes), reaproveitando a contagem que a lista impressa já faz

## 7. Telas do convidado

- [x] 7.1 Refazer `/palestras` com as palestras do banco e a chamada de como confirmar
- [x] 7.2 Refazer a confirmação mantendo consentimento desmarcado por padrão e o aviso de palestra única
- [x] 7.3 Refazer o ingresso com QR, validade para duas pessoas, salvar imagem, agenda e cancelamento em duas etapas
- [x] 7.4 Refazer as telas de estado do convite, sem receber nenhum dado pessoal por prop
- [x] 7.5 Refazer a recuperação de ingresso por CPF e código

## 8. Fechamento

- [x] 8.1 Criar `tests/copy.test.ts` que falha quando um texto de interface contém travessão ou meia-risca, nomeando arquivo e trecho
- [x] 8.2 Varrer `app/`, `components/` e os textos de `lib/palestras/` e substituir os travessões existentes por ` · `, dois-pontos, vírgula ou parênteses
- [ ] 8.3 Rodar `npm run typecheck`, `npm test` e as integrações de confirmação, painel e operação (typecheck e npm test feitos; integrações não rodadas, ver relatório)
- [x] 8.4 Atualizar `docs/PAINEL-COLABORADOR.md`, `docs/OPERACAO-EVENTO.md` e `docs/MODULO-PALESTRAS.md` com a navegação nova e a tela de métricas
- [x] 8.5 Conferir cada tela contra o artboard correspondente do mockup aprovado
- [x] 8.6 Conferir contraste, alvos de toque e foco visível nas telas do convidado e na porta do evento
