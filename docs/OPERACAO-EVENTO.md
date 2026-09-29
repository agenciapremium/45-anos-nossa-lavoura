# Operação do evento — `/palestras/checkin` e `/palestras/relatorios`

Documentação da change **`operacao-evento`**: a única parte do sistema que
roda sob pressão de tempo real — fila na porta, quatro noites, quatro
cidades, sem segunda chance. O que ela entrega: check-in por QR e por busca
manual, lista de confirmados para impressão, exportação CSV e os números
por palestra e por loja.

> **Fora desta change:** geração de convites, confirmação pelo convidado,
> login e painel do colaborador. São `fundacao`, `confirmacao-convidado`,
> `auth-e-papeis` e `painel-colaborador` — ver
> [`docs/MODULO-PALESTRAS.md`](./MODULO-PALESTRAS.md) e os três documentos
> irmãos.

Pré-requisitos: `confirmacao-convidado` (ingressos e `ingresso_token`) e
`auth-e-papeis` (papel Recepção, escopo, sessão). `palestra_checkin` já
existia desde `fundacao` — esta change é a primeira a **escrever** nela.

Para a equipe que vai operar a porta: [`docs/ROTEIRO-RECEPCAO.md`](./ROTEIRO-RECEPCAO.md).

---

> **Atualização (`redesenho-da-interface`):** check-in e relatórios
> passaram a viver dentro do mesmo grupo de rotas das demais telas
> autenticadas, `app/palestras/(interno)/`, com uma casca única (menu
> lateral por papel, barra de topo, seletor de palestra como contexto).
> Nenhum endereço mudou. O seletor de palestra da barra de topo substitui o
> formulário de escolha de palestra que cada tela tinha por conta própria;
> a palestra escolhida é lembrada num cookie de sessão e continua podendo
> ser sobrescrita por `?palestra=` na URL, para um link continuar
> compartilhável. Detalhes em
> `openspec/changes/redesenho-da-interface/design.md` (decisões D1 e D2).

## Rotas

| Rota | O que faz | Acesso |
| --- | --- | --- |
| `/palestras/checkin` | Leitor de QR e busca manual | Admin e Recepção |
| `/palestras/relatorios` | Números por palestra, com atalhos | Admin, gerentes, Recepção |
| `/palestras/relatorios/lista?palestra=` | Lista para impressão, A4 retrato | Admin, gerentes, Recepção |
| `/palestras/relatorios/csv?palestra=` | Exportação CSV | Admin e gerentes (**não** Recepção) |

As quatro já estavam no `middleware.ts` de `auth-e-papeis`, que as
antecipou: nenhuma mudança no arquivo foi necessária para esta change, nem
para `redesenho-da-interface` depois.

---

## Check-in

### Três resultados, uma decisão (D5 do design)

A tela nunca mostra parágrafo: mostra a cor, o operador confere o nome e
libera. Detalhe fica abaixo da dobra.

- **Verde — ENTROU.** Titular, acompanhante (ou "sem acompanhante — entrada
  só do titular"), loja e colaborador de origem. O convite passa a
  `presente`.
- **Amarelo — JÁ UTILIZADO.** Data e hora do **primeiro** check-in — é a
  informação que resolve a conversa na porta. Nenhum novo registro é
  criado.
- **Vermelho — NÃO ENTRA.** Um motivo em uma linha: `cancelado`,
  `expirado`, `outra-palestra` (sem dizer qual — mesma regra de não
  vazamento do resto do sistema), `token-desconhecido` ou `fora-do-dia`
  (com a data exata em que o convite vale).

Implementado em `lib/palestras/servicos/checkin.ts`. `ResultadoDoCheckin`
é a união dos três; `MENSAGENS_DE_CHECKIN` reúne os textos, no mesmo
espírito de `lib/palestras/confirmacao.ts`.

### D2: nenhuma decisão de validade no cliente

A câmera só lê o `ingresso_token` do QR e manda para o servidor
(`checkinPorToken`). O componente `Leitor`
(`app/palestras/(interno)/checkin/leitor.tsx`) não interpreta o texto lido nem
decide nada — devolve a string crua. Quem resolve verde/amarelo/vermelho é
sempre `lib/palestras/servicos/checkin.ts`.

Consequência assumida: **a tela exige conexão**. Sem internet, ela
simplesmente para de responder — não há cache de confirmações no
dispositivo. A mitigação é a lista impressa (ver abaixo) e o roteiro de
contingência.

### D3: transação com trava de linha

```
BEGIN
  SELECT … FROM palestra_convite WHERE id = … FOR UPDATE
  -- dentro de aoAplicar, com a linha já travada e o UPDATE já aplicado:
  -- valida palestra correta e dia da palestra; se falhar, lança e desfaz tudo
  INSERT INTO palestra_checkin (…)     -- unicidade por convite
  UPDATE palestra_convite SET estado = 'presente'
COMMIT
```

`executarCheckin()` **reaproveita** `transicionarConvite()` (de
`fundacao`) em vez de reimplementar a trava — o mesmo helper que
`confirmacao-convidado` e `painel-colaborador` já usam. A diferença desta
change: duas checagens de negócio (palestra certa, dia certo) acontecem
dentro de `aoAplicar`, com a linha já travada; se uma delas falha, uma
exceção própria (`RecusaDeCheckin`) desfaz a transação inteira — nem o
estado muda, nem o check-in é gravado.

Unicidade garantida por restrição única em `palestra_checkin(convite_id)`
— já existente desde `fundacao`, sem migração nova.

**Prova de concorrência** (`npm run test:integracao:operacao`):

- 5 rodadas de `Promise.all` com duas leituras simultâneas do **mesmo**
  QR: em todas, exatamente um check-in e o outro "dispositivo" recebe
  amarelo.
- Como em `confirmacao-convidado`: uma transação é aberta e segurada
  **sem commit** (convite já `presente`, check-in já inserido), e só
  então a segunda leitura é disparada. Ela fica bloqueada até a primeira
  liberar — prova de que quem decide é o `SELECT … FOR UPDATE`, não uma
  checagem prévia da aplicação.
- Um `insert` direto de um segundo `palestra_checkin` para o mesmo
  convite é recusado pelo Postgres com `23505`
  (`palestra_checkin_convite_idx`), conferindo que a restrição existe e é
  a esperada.

### D4: "dia da palestra" = dia civil em America/Porto_Velho

`lib/tempo.ts` ganhou `mesmoDiaCivil(a, b)`, pura e testada em
`tests/tempo.test.ts`. A checagem compara `agora()` com a `data_hora` do
evento pelo dia civil, não por uma janela de horas — uma palestra às 19h
aceita check-in desde a meia-noite do mesmo dia. Fora do dia, a mensagem
diz explicitamente a data em que o convite vale ("Este convite só é
aceito no dia da palestra: 13/10/2026.").

### Registro do check-in

`palestra_checkin` grava convite, autor (`feito_por`), data e hora
(`feito_em`) e método (`qr` ou `manual`) — schema inalterado desde
`fundacao`. Cada check-in aceito também vira uma linha em
`palestra_auditoria` (`checkin.registrado`).

### Busca manual (D1): não é contingência escondida

Fica na mesma tela do leitor, atrás de um botão "Busca manual" — sem
navegação, sem recarregar (`app/palestras/(interno)/checkin/tela.tsx` alterna entre
os dois com `useState`). Um campo só decide sozinho se o que foi digitado
é CPF (11 dígitos) ou nome parcial.

`buscarConfirmadoPorCpf` e `buscarConfirmadosPorNome`
(`lib/palestras/dados.ts`) devolvem o mesmo tipo restrito que a recepção
já usava desde `auth-e-papeis` (`ConfirmadoParaRecepcao`): titular,
acompanhante e CPF mascarado — nada de WhatsApp, cidade, propriedade ou
atividade. As duas são restritas à palestra escolhida: um confirmado de
outra palestra não aparece.

O check-in pela busca (`checkinManual`) passa pelo **mesmo**
`executarCheckin()` do QR — o registro é idêntico, e só o `metodo` muda
para `manual`.

---

## Lista para impressão

`/palestras/relatorios/lista?palestra=` (`app/palestras/(interno)/relatorios/lista/`),
com CSS próprio (`impressao.css`) para A4 retrato: `@page { size: A4
portrait }`, cabeçalho de tabela repetido em cada página quebrada
(`thead { display: table-header-group }`) e numeração de página via
`@page { @bottom-right { content: counter(page) " de " counter(pages) } }`
— só é possível declarar isso dentro da margem da `@page`, não no fluxo
normal do documento.

- Cabeçalho: palestra, cidade, data, horário, local, total de confirmados
  e total de pessoas (titulares + acompanhantes).
- Colunas: nº sequencial, titular, CPF mascarado, acompanhante, loja,
  colaborador, caixa para marcar presença à mão.
- Ordem alfabética pelo titular; cancelados fora (a consulta só traz
  `confirmado`/`presente`).
- Rodapé com "Gerado em …" repetido em cada página via
  `position: fixed` — truque padrão de impressão no Chrome/Edge; Firefox
  e Safari têm suporte mais inconsistente para isso (ver "O que falta").

### D6: CPF mascarado mesmo para o Admin

`listaDeImpressao()` (`lib/palestras/dados.ts`) mascara o CPF **sempre**,
sem checar `veCpfCompleto()` — ao contrário de `confirmacoesNoEscopo`, que
respeita o papel. É a diferença que D6 exige: o papel circula pelo salão e
pode ficar esquecido numa mesa; o CPF completo não pertence a esse
suporte, mesmo para quem tem permissão de vê-lo em outras telas.

Escopo: Admin vê tudo, gerente regional/de loja veem a origem deles
(mesmo filtro de `restricao()` usado no resto do módulo), e a Recepção vê
a palestra inteira, sem filtro de origem — ela não tem "escopo de loja",
tem escopo de palestra.

---

## Exportação CSV

`/palestras/relatorios/csv?palestra=` (`app/palestras/(interno)/relatorios/csv/route.ts`).

### D7: compatível com Excel em pt-BR

- **UTF-8 com BOM** e **separador `;`** — sem os dois, o Excel em
  português abre tudo numa coluna só ou com acento quebrado.
- Escape por RFC 4180 (`lib/palestras/csv.ts`, módulo puro, testado em
  `tests/csv.test.ts`): aspas quando o valor carrega `;`, `"` ou quebra de
  linha, com `"` interna duplicada.
- **CPF preservado como texto.** Aspas ao redor da célula, sozinhas, **não
  bastam** — o Excel decide o tipo de cada célula pelo conteúdo depois de
  tirar o escape do CSV, não pela presença das aspas; um CPF só entre
  aspas simples ainda vira número e ainda perde o zero à esquerda ao abrir
  com duplo clique. `valorDeTextoForcado()` usa o truque padrão
  `="0123456789"`: o Excel avalia como fórmula de texto ao abrir o
  arquivo. A célula final ainda sai entre aspas (D7 pede isso
  explicitamente), porque o valor cru (`="…"`) contém aspas e passa pelo
  mesmo escape de qualquer outro campo — não há um caminho especial que
  possa esquecer de aplicá-lo.
- Datas no formato brasileiro (`dd/MM/yyyy HH:mm`), no fuso
  America/Porto_Velho, via `formatarCarimbo()`.

### D6: CPF completo só para o Admin (regra geral, diferente da lista impressa)

`dadosParaExportacaoCsv()` usa `veCpfCompleto(escopo)` — Admin recebe o
CPF completo, os demais recebem mascarado. Diferente da lista impressa
porque o CSV tem destino controlado (baixado por quem tem permissão, fica
registrado em auditoria) e não circula pelo salão.

### Todos os estados, sempre

A consulta parte de `palestra_convite`, com `LEFT JOIN` até
`palestra_confirmacao` e `palestra_checkin`: um convite `disponivel` não
tem nenhum dos dois, e a linha sai com essas colunas vazias em vez de
sumir da exportação — "todos os estados são exportados" é literal.

### Quem exporta — refinamento sobre a matriz do PRD

A tabela do PRD junta "Lista de impressão e CSV" numa única linha, com a
Recepção tendo alcance "Por palestra". A spec `exportacao-csv` desta
change, porém, é explícita: **colaborador OU Recepção que tentam exportar
recebem 403.** A Recepção opera a porta com a lista impressa; o CSV tem
destino de análise, fora do salão.

Como isso não cabia na linha existente do PRD sem misturar duas
permissões diferentes debaixo do mesmo nome, `lib/palestras/papeis.ts`
ganhou uma ação **nova**, fora da matriz literal do PRD:
`exportarCsv` (`admin: todos`, `gerente_regional: regional`,
`gerente_loja: loja`, `colaborador: nenhum`, `recepcao: nenhum`). A ação
`listaImpressaECsv` original continua exatamente como estava — ela agora
governa só a lista impressa. `tests/papeis.test.ts` tem casos para as
duas, com o motivo anotado no próprio teste.

Tentativas recusadas também são auditadas quando existe sessão (a recusa
foi por papel/escopo, não por ausência de login) — `autorizarRota()`
ganhou um campo `atual` na resposta de recusa (`lib/palestras/sessao.ts`),
backward-compatible com as quatro rotas que já a usavam.

---

## Números por palestra e por loja

`/palestras/relatorios` reaproveita a infraestrutura de `painel-colaborador`
quase inteira: `resumoNoEscopo`, `resumoPorLoja`, `resumoPorRegional` e
`lib/palestras/taxas.ts` já existiam, com o escopo e a agregação por
consulta (D8: nenhum contador materializado) resolvidos desde a change
anterior. Esta change só precisou de uma tela nova, com a palestra como
filtro **obrigatório** — diferente de `/palestras/painel/equipe`, onde o
filtro de palestra é opcional.

Definição das taxas, visível na tela (task 9.4):

- **Confirmação** = confirmados ÷ gerados. Cancelados **continuam** no
  total de gerados.
- **Comparecimento** = presentes ÷ confirmados, onde "confirmados" inclui
  quem já é `presente` (passou por `confirmado` a caminho). Um convite
  `confirmado` sem check-in continua `confirmado` depois da palestra — é
  tratado como ausência, não como um estado à parte (task 9.5).
- Divisor zero → "—", nunca "0%" nem erro.

A soma de disponíveis + confirmados + presentes + cancelados + expirados
bate com o total de convites gerados na palestra, no escopo de quem
consulta — conferido em `scripts/integracao-operacao.ts`, seção "números
por palestra".

---

## Leitura de QR

`@zxing/browser` (`BrowserQRCodeReader`) + `@zxing/library`, importados
**sob demanda** dentro de um `useEffect`: quem abre a tela em "busca
manual" nunca baixa o decodificador
(`app/palestras/(interno)/checkin/leitor.tsx`).

- `NotFoundException` do zxing dispara a cada quadro sem código
  encontrado — tratada como caminho normal ("ainda não achei"), não como
  erro. É o que mantém a leitura ativa sem "piscar" um estado de falha a
  cada frame (task 3.3).
- Erro de permissão (`NotAllowedError`/`SecurityError`) mostra a
  orientação de como liberar a câmera, com a busca manual sempre visível
  ao lado. `NotFoundError`/sem `getUserMedia`/contexto inseguro (HTTP)
  têm mensagens próprias.
- Depois de cada leitura, a tela troca para o resultado grande; ao tocar
  em qualquer lugar dele, volta ao estado de leitura — sem recarregar a
  página (o leitor é desmontado/remontado por `key={eventoId}`, o que
  também reinicia a câmera ao trocar de palestra).
- O tempo entre a leitura e o resultado é medido no cliente
  (`performance.now()`) e mostrado junto do resultado — é a evidência da
  meta de 2 segundos (task 3.5) e a base da simulação de fila (task 11.4).

---

## Identidade visual (D5 do design)

Resultado verde usa `bg-sucesso`/`text-creme-500` (`#4e8c2b` com texto
quase branco); vermelho, `bg-perigo`/`text-creme-500` (`#a8341f`).
**Amarelo usa texto escuro** (`text-terra-900`), não claro: o
`--status-warning` (`#c98a12`) do design system é claro demais para texto
branco manter contraste legível a um braço de distância, com o brilho
reduzido que a spec pede. O veredito (ENTROU/JÁ UTILIZADO/NÃO ENTRA) sai
em `text-destaque` (o mesmo token da landing para títulos grandes),
sempre acompanhado de um símbolo (✓/!/×) — a cor nunca é o único sinal.

O selo do circuito não aparece na tela de check-in nem na lista impressa
por decisão de espaço/legibilidade a essa distância; ele seria ilegível
no formato exigido (1:1, sem recorte) num cabeçalho compacto de porta.
Continua presente no cabeçalho de `/palestras/checkin` e
`/palestras/relatorios` (herdado do layout do módulo).

---

## Mapa dos arquivos desta change

> As rotas abaixo vivem hoje dentro de `app/palestras/(interno)/` (grupo de
> rotas da change `redesenho-da-interface`, sem efeito no endereço: veja a
> nota no topo deste documento). A árvore a seguir mantém os caminhos como
> a change `operacao-evento` os criou, só com o prefixo atualizado.

```
app/palestras/(interno)/
  checkin/
    page.tsx           sessão + papel + palestra do dia sugerida
    tela.tsx            orquestra leitor e busca manual (client)
    leitor.tsx           câmera + zxing (client)
    busca.tsx            CPF/nome + confirmar (client)
    resultado.tsx         os três resultados, corpo grande (client)
    acoes.ts              Server Actions: verificarQr, confirmarCheckinManual,
                           buscarPorCpf, buscarPorNome
  relatorios/
    page.tsx             hub: seletor de palestra, números, atalhos
    lista/
      page.tsx            lista para impressão
      impressao.css        CSS de impressão A4
      botao-imprimir.tsx    window.print() (client)
    csv/route.ts          exportação CSV

lib/palestras/
  servicos/checkin.ts   resolução do token, transação, os três resultados
  dados.ts              +buscarConfirmadoPorCpf/PorNome, listaDeImpressao,
                         dadosParaExportacaoCsv
  csv.ts                CSV puro: escape, BOM, separador, texto forçado
  papeis.ts             +exportarCsv (refinamento sobre listaImpressaECsv)
  auditoria.ts           +checkinRegistrado, listaImpressaGerada,
                          csvExportado, csvExportacaoRecusada
  sessao.ts              autorizarRota expõe `atual` também na recusa

lib/tempo.ts             +mesmoDiaCivil

tests/
  csv.test.ts            escape, BOM, separador, texto forçado do CPF
  tempo.test.ts           +mesmo dia civil
  papeis.test.ts          +exportarCsv

scripts/integracao-operacao.ts   concorrência, dia da palestra, escopo,
                                  CSV/lista de verdade contra o banco

docs/ROTEIRO-RECEPCAO.md          uma página para a equipe da porta
```

Nenhuma migração: `palestra_checkin` já existia desde `fundacao`, com
todas as colunas que esta change precisava. `npm run db:generate`
confirma "No schema changes, nothing to migrate".

---

## Testes

```bash
npm test                        # puros (254 testes)
npm run test:integracao:operacao # ESCREVE no banco de DATABASE_URL
```

Como sempre, os três scripts de integração das changes anteriores
(`test:integracao`, `test:integracao:confirmacao`, `test:acesso`,
`test:integracao:painel`) foram reexecutados depois das mudanças em
`papeis.ts`, `dados.ts` e `sessao.ts`, e continuam passando sem alteração
de comportamento.

**Resíduo que o script desta change deixa.** Check-in grava auditoria com
autor, e a auditoria é imutável — o mesmo problema que `painel-colaborador`
já documentou para `canceladoPor`. Solução igual: dois usuários **fixos**
(Admin e Recepção, CPF constante), reaproveitados entre execuções, para o
resíduo não crescer a cada rodada. Durante o desenvolvimento, uma execução
anterior a essa solução deixou mais dois usuários de teste (`[TESTE-OPER]
Admin` e `[TESTE-OPER] Recepção`, sem o sufixo "(fixo)") já referenciados
por auditoria — ficam para sempre, por contrato, junto com uma dezena de
linhas de `palestra_auditoria`.

Uma verificação HTTP manual adicional (fora dos scripts versionados, feita
uma única vez para confirmar o 403/200 real de cada papel nas quatro rotas
desta change, com sessão de verdade obtida via `auth.api.*` e cookie
assinado) deixou mais um pequeno grupo, rotulado `[SMOKE-OPER]`: cinco
usuários (um por papel), uma loja e uma regional — pelo mesmo motivo
(login bem-sucedido audita, auditoria é imutável). Não é um script
reexecutável; foi limpeza manual do que dava para limpar (a palestra, o
convite e a confirmação usados para baixar um CSV e uma lista de verdade
foram removidos na mesma verificação).

**Não aponte `DATABASE_URL` para produção ao rodar a integração.**

---

## Critérios de aceite do PRD · `operacao-evento`

Os cinco critérios da seção `operacao-evento` do PRD, conferidos um a um
contra o banco Neon, via `scripts/integracao-operacao.ts`.

### 1. Leitura de QR no celular retorna verde, amarelo ou vermelho em até 2 segundos com boa conexão

**Atendido.** Os três resultados foram exercitados (válido, já utilizado,
cancelado, expirado, outra palestra, token desconhecido, fora do dia). O
check-in válido, de ponta a ponta contra o banco de desenvolvimento (sem a
rede de um celular real), levou **cerca de 1 a 1,3 segundo**. Uma
simulação de fila (task 11.4) com 8 leituras em sequência, uma de cada
vez, deu **806 ms de média e 868 ms no pior caso** — dentro da meta, com
folga para a latência real de uma conexão móvel razoável. **Ressalva:** a
medição de verdade, em celular e rede 4G do local, continua dependendo do
ensaio em campo.

### 2. Segunda leitura do mesmo QR mostra o horário do primeiro check-in

**Atendido.** Confirmado, inclusive sob concorrência real (cinco rodadas
de leitura simultânea): o "dispositivo" que perde sempre recebe o horário
gravado na primeira leitura, nunca um horário próprio.

### 3. Check-in manual por CPF ou nome produz o mesmo registro do QR

**Atendido.** Busca por CPF e por nome parcial, restritas à palestra
escolhida, com o registro final idêntico ao do QR — mesmas colunas
preenchidas, único campo diferente é `metodo` (`manual` em vez de `qr`).

### 4. Lista impressa sai em A4 ordenada por nome, com total de pessoas

**Atendido no código e na conferência de dados** (ordem alfabética,
CPF sempre mascarado, cancelados fora, total de confirmados e de pessoas
no cabeçalho). **Ressalva:** a impressão física de prova (task 7.8), para
conferir quebra de página com o volume real de uma palestra, depende de
papel e impressora — não foi possível fazer neste ambiente.

### 5. CSV abre corretamente no Excel em português, com acentos

**Atendido no que dá para verificar sem o Excel instalado**: BOM UTF-8
confirmado byte a byte (inclusive no arquivo baixado de verdade pela rota
HTTP: os três primeiros bytes da resposta são `239 187 191` = `EF BB BF`),
separador `;`, escape RFC 4180 provado com um campo real contendo `;` e
aspas, CPF com zero à esquerda preservado pelo truque de fórmula de texto
(`="…"`), datas no formato brasileiro. **Não foi possível abrir o arquivo
num Excel de verdade neste ambiente** — ver "O que falta" abaixo para o
que isso implica.

---

## O que falta

- **Abrir o CSV num Excel de verdade** (task 8.9): o mecanismo (BOM,
  separador, `="…"` para o CPF) é o documentado como funcionando para
  esse cenário, e o arquivo foi conferido byte a byte contra o que o
  Excel em pt-BR espera — mas a prova final é alguém abrir o arquivo
  gerado com duplo clique, num Excel em português, e olhar a tela.
- **Imprimir a lista de verdade** (task 7.8): CSS de A4 escrito com
  cabeçalho de tabela repetido e numeração de página via `@page`, mas a
  prova de quebra de página correta com um volume realista de confirmados
  é uma impressora, não um script.
- **Validar as telas com a cliente e com quem vai operar a recepção**
  (tasks 1.6, 3.6, 5.6): a interface está no ar no preview, com os
  tamanhos de fonte e as cores pensados para legibilidade a um braço de
  distância — falta o teste com pessoas de verdade, de preferência no
  celular que vai ser usado na porta.
- **Preparação operacional de cada praça** (tasks 10.1, 10.2, 10.5): quem
  são os operadores de Recepção de cada cidade, o cadastro deles, o teste
  no aparelho real e a combinação com a cliente sobre acompanhante sem
  titular — ver [`docs/ROTEIRO-RECEPCAO.md`](./ROTEIRO-RECEPCAO.md) para o
  que já está pronto do lado do sistema.
- **Verificação HTTP de papéis nas rotas novas** (task 11.3): feita, com
  sessão real de cada um dos cinco papéis (obtida via `auth.api.*` com
  `asResponse: true`, sem passar por um navegador nem por cookie copiado
  à mão — este projeto não expõe um endpoint HTTP de login, então essa
  rota alternativa foi o que tornou o teste automatizável). Contra o
  `next start` local:

  | Rota | Admin | Ger. Loja | Ger. Regional | Colaborador | Recepção |
  | --- | --- | --- | --- | --- | --- |
  | `/palestras/checkin` | 200 | 403 | 403 | 403 | 200 |
  | `/palestras/relatorios` | 200 | 200 | 200 | 403 | 200 |
  | `/palestras/relatorios/csv` | 200/404* | 200/404* | 200/404* | 403 | **403** |
  | `/palestras/relatorios/lista` | 200/404* | 200/404* | 200/404* | 403 | 200/404* |

  (*404 quando a palestra do parâmetro não existe — a autorização já
  passou; com uma palestra real, é 200. Conferido com uma palestra e um
  confirmado de verdade: o CSV baixado tinha os três bytes do BOM
  \[`EF BB BF`\] antes de qualquer outro conteúdo, e a lista impressa da
  Recepção trouxe "Total de confirmados: 1 · Total de pessoas … : 1"
  corretamente.) A linha que mais importa desta change está em negrito:
  a Recepção acessa a lista impressa mas é a única, entre quem chega à
  rota, recusada especificamente no CSV — exatamente a distinção que a
  spec `exportacao-csv` pede e que não está na tabela literal do PRD.
- **Lançamento posterior de check-in fora do dia da palestra**: ponto em
  aberto explícito do PRD ("se a internet cair e a conferência for feita
  no papel, a cliente quer esses check-ins lançados depois, fora do dia
  da palestra?"). Não implementado — exigiria uma exceção só para o
  Admin, e o design não decidiu isso. Enquanto não houver decisão, a
  lista impressa marcada à mão é o registro definitivo desse cenário (ver
  o roteiro de contingência).
