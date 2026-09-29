## Context

O modelo de dados amarra convite a colaborador: `palestra_convite.colaborador_id` é `NOT NULL` com referência a `user`, e `palestra_lote.colaborador_id` também. Foi a decisão certa para a operação que o PRD descreve, em que o convite existe para ser distribuído pela rede de lojas, e é o que faz o escopo por papel funcionar sem nenhuma coluna extra: `restricao()` filtra colaborador pelo próprio id, gerente de loja pela loja do colaborador e gerente regional pela regional da loja.

O que falta é o caso de fora da rede: imprensa, patrocinador, autoridade, convidado do Grupo. Hoje o Admin escolhe um colaborador para carregar esses convites, e isso contamina o número daquela pessoa, joga o link na lista dela e registra uma origem falsa.

Esta change existe depois de `redesenho-da-interface`, então as telas envolvidas são as novas: geração com resumo lateral, lista de convites em tabela, métricas.

## Goals / Non-Goals

**Goals:**

- O Admin gera N convites de uma palestra sem escolher pessoa nenhuma, e sai da tela com os links na mão.
- O convite avulso é indistinguível do outro para quem o recebe: mesmo código, mesmo prazo, mesma confirmação, mesmo ingresso, mesma entrada na porta.
- Os números do circuito continuam fechando: o avulso conta no total e no funil, e não aparece onde não tem onde cair.
- Nenhum papel além do Admin passa a ver o que não via.

**Non-Goals:**

- Envio por WhatsApp a partir do lote avulso.
- Transferir um convite avulso para um colaborador depois de gerado.
- Reposição automática de cancelado.
- Qualquer mudança na tela do convidado.

## Decisions

### D1. Colaborador nulo, não um usuário de fachada

`colaborador_id` passa a aceitar nulo em `palestra_convite` e em `palestra_lote`. Convite avulso é o convite sem colaborador.

*Alternativa considerada:* criar um usuário "Administração" e pendurar os avulsos nele. Não exige migração, e é pior em tudo o mais: o usuário apareceria na lista de colaboradores para geração, na estrutura organizacional, no alerta de "colaboradores sem distribuição" das métricas e nos recortes por loja, sempre precisando de uma exceção escrita à mão. Uma coluna nula diz a verdade: não há colaborador.

*Consequência:* a migração é `DROP NOT NULL` nas duas colunas, sem reescrita de tabela e sem tocar em linha existente. O índice composto `evento_id, colaborador_id, estado` continua servindo: Postgres indexa nulos em B-tree.

### D2. O escopo já exclui o avulso de todo mundo, menos do Admin

Nenhuma regra nova de autorização. A `restricao()` de hoje resolve sozinha:

- **colaborador**: `colaborador_id = <id dele>`. Nulo nunca casa com igualdade em SQL, então o avulso não aparece.
- **gerente de loja** e **gerente regional**: filtram por `loja_id` e `regional_id`, que vêm do colaborador. Sem colaborador, os dois são nulos, e de novo a igualdade não casa.
- **admin**: sem restrição, vê tudo.
- **recepção**: continua sem escopo de origem, enxergando confirmados da palestra pelo caminho próprio.

Isto é bom e é frágil ao mesmo tempo: funciona por consequência do SQL, não por uma linha escrita dizendo "avulso é do Admin". Por isso vira **cenário de teste explícito** para cada papel, e não uma nota de rodapé.

### D3. O `innerJoin` em `user` é o ponto de ruptura

`convitesNoEscopo` e `confirmacoesNoEscopo` fazem `innerJoin(user, eq(user.id, convite.colaboradorId))`. Com colaborador nulo, o join **descarta a linha**, e o convite avulso desapareceria da lista do Admin, do resumo por estado, do funil e da tela de detalhe. E desapareceria em silêncio: nenhum erro, só um número menor.

Os dois viram `leftJoin`. Os campos derivados do colaborador (`colaboradorNome`, `lojaId`, `lojaNome`, `regionalId`) passam a ser anuláveis no tipo, o que obriga cada tela a decidir o que mostrar no lugar, que é exatamente a decisão que queremos forçar.

**Correção de 29/09/2026, durante a implementação:** este parágrafo nomeava duas funções, e
existiam CINCO `innerJoin` em `user`. As que faltavam eram `listaDeImpressao` e
`dadosParaExportacaoCsv`, e as duas são leitura, não recorte: com join interno, quem
confirmasse por convite avulso chegaria ao evento com ingresso válido e não estaria na
folha impressa de contingência, nem na planilha. As duas viraram `leftJoin`. A regra que
vale, e que o teste agora guarda função por função, é: **leitura usa `leftJoin`, recorte
por origem usa `innerJoin`**.

**Segunda correção, 29/09/2026, na implementação do grupo 6:** havia um SEXTO `innerJoin` em
`user`, fora de `dados.ts` — no `select` que monta o resultado verde do check-in, em
`lib/palestras/servicos/checkin.ts`. Ali o efeito não era um número menor: a consulta não
devolvia linha, o serviço caía no `if (!dadosDoTitular) throw new RecusaDeCheckin('invalido')`,
e o `throw` desfazia a transação inteira. Um convidado que confirmasse por convite avulso
levaria **tela vermelha na portaria**, com o check-in não gravado, e a recepção não teria como
saber que o problema era do sistema e não do ingresso. Corrigido para `leftJoin`, com o rótulo
do lote passando a viajar no resultado. Lição para o resto da change: a busca por `innerJoin`
em `user` precisava sair de `dados.ts` e varrer `lib/palestras/servicos/` também.

Os recortes por origem (`resumoPorRegional`, `resumoPorLoja`, `resumoPorColaborador`) **continuam com `innerJoin`**: é o que mantém o avulso fora deles por construção, sem `WHERE` extra. A soma desses recortes passa a ser menor que o total da palestra, e isso é correto; a tela é que precisa dizer.

*Alternativa considerada:* deixar `innerJoin` e acrescentar um `OR colaborador_id IS NULL` em cada consulta. Espalharia a regra por sete lugares e quebraria de novo no próximo `join` que alguém escrevesse.

### D4. O rótulo do lote é o que devolve a noção de origem

`palestra_lote` ganha `rotulo text`, opcional, até 80 caracteres. É o que o Admin escreve ao gerar: "Imprensa", "Patrocinador Virbac", "Prefeitura de Ji-Paraná". Onde a tela mostraria o nome do colaborador, o avulso mostra o rótulo; sem rótulo, mostra "Avulso".

Sem isso, dois lotes avulsos da mesma palestra são indistinguíveis na lista de convites, e o Admin perde a única pergunta que ele realmente faz sobre esses links: para onde foram.

*Não* é um campo de busca nem de agrupamento nesta change: é rótulo de leitura. Agrupar métricas por rótulo é ideia para depois, se o uso pedir.

### D5. Geração avulsa é um caminho novo no mesmo serviço

`gerarLotesDeConvites` continua como está, para não arriscar o caminho que a rede de lojas usa. Ao lado dele nasce `gerarLoteAvulso({ eventoId, quantidade, rotulo, ator })`, no mesmo módulo, compartilhando o que já é comum: checagem de prazo, geração de código com retentativa, inserção em blocos de 200, transação única e registro em auditoria.

A validação de quantidade reaproveita `esquemaDeQuantidade`, o mesmo limite por operação que a geração por colaborador usa. Não inventamos um teto diferente: se o limite do circuito mudar, muda nos dois.

A ação de auditoria é própria (`lote_avulso.gerado`), com palestra, quantidade e rótulo no payload, para o rastro distinguir as duas origens sem interpretar campo nulo.

### D6. A entrega é a tela do lote, não o PDF por pessoa

Depois de gerar, o Admin cai numa tela do lote com os N convites: código, link em texto puro, copiar individual, copiar todos, e download em PDF e em CSV. O PDF reaproveita `lib/palestras/pdf` e o CSV reaproveita `lib/palestras/csv`, trocando só o cabeçalho, porque não há colaborador a nomear.

Não existe botão de WhatsApp aqui. A mensagem pronta é a do colaborador, escrita na primeira pessoa de quem convida; num lote de imprensa ela não serve, e oferecer um botão que abre a conversa errada é pior que não ter botão.

O lote fica acessível depois pela lista de lotes avulsos da palestra: gerar e nunca mais achar os links seria um jeito elegante de perder convite.

### D7. "Administração" onde a tela pedia loja e colaborador

Na lista de convites, no detalhe do confirmado, na lista impressa e no resultado do check-in, o convite avulso mostra **"Administração"** no lugar da loja e do colaborador, e o rótulo do lote quando existir. Nunca campo vazio, nunca traço: quem está na porta precisa entender em dois segundos de onde veio aquela pessoa, e "vazio" parece defeito.

### D8. O que acontece nas métricas

- Totais da palestra, funil e série diária: o avulso entra, porque é convite do circuito.
- Por regional, por loja, por colaborador: o avulso fica fora, e cada um desses blocos ganha uma linha final **"Avulsos"** com o número, para a soma bater com o total à vista.
- O alerta de "colaboradores sem distribuição" não muda: avulso não tem colaborador, então não entra na conta nem para o bem nem para o mal.

## Risks / Trade-offs

- **[Um `innerJoin` esquecido em `user` faz o avulso sumir de uma tela sem ninguém perceber]** → O teste de consulta cobre "Admin vê o avulso na lista, no resumo e no detalhe", e cada tela que mostra origem ganha cenário com colaborador nulo. É a regressão mais provável desta change.
- **[A soma dos recortes por loja fica menor que o total e parece erro de cálculo]** → A linha "Avulsos" existe para isso, e a definição fica escrita na tela, como já é feito com as taxas.
- **[Convite avulso vazado é convite sem dono para cobrar]** → O convite avulso não tem quem o rastreie no WhatsApp, então some a anotação de envio. O rótulo do lote é o substituto, e o cancelamento continua disponível ao Admin, convite a convite.
- **[Migração em produção com o circuito em andamento]** → `DROP NOT NULL` e `ADD COLUMN` anulável não travam a tabela de forma relevante no Postgres e não reescrevem dado. Ainda assim, a migração roda fora do horário de palestra.
- **[Alguém gera um lote avulso gigante por engano]** → A tela confirma a quantidade antes de gravar, e o teto por operação é o mesmo já validado por `esquemaDeQuantidade`.

## Migration Plan

1. Migração Drizzle: `DROP NOT NULL` nas duas colunas de colaborador e `ADD COLUMN rotulo` em `palestra_lote`. Schema e tipos acompanham.
2. `leftJoin` em `convitesNoEscopo` e `confirmacoesNoEscopo`, com os campos de origem anuláveis no tipo. Nesta etapa nada muda de comportamento, porque ainda não existe convite sem colaborador: é a etapa que o TypeScript usa para apontar toda tela que precisa decidir o texto de origem.
3. `gerarLoteAvulso` no serviço, com teste de integração.
4. Tela de geração com os dois modos, tela do lote, PDF e CSV.
5. Origem nas telas de leitura: lista de convites, detalhe, lista impressa, check-in.
6. Linha "Avulsos" em métricas e relatórios.

**Ordem obrigatória contra o deploy:** o código novo lê `palestra_lote.rotulo` e aceita
`colaborador_id` nulo. Se ele subir antes da migração, a consulta quebra contra um banco
sem a coluna. A branch faz deploy automático, então a migração roda ANTES de o código
ser publicado, e o código só é enviado depois de ela ter passado.

*Rollback:* até o passo 3 não existe convite avulso no banco, e reverter é reverter código. Depois disso, reverter o código deixaria convites avulsos invisíveis (o `innerJoin` voltaria a descartá-los), então o rollback a partir do passo 3 é para trás até o passo 2, nunca até o 1.

## Decisões da cliente (29/09/2026)

- **Rótulo é opcional**, com "Avulso" como padrão na ausência. Confirmado.
- **Só o Admin gera avulso.** Confirmado. Gerente regional gerando para a própria regional fica fora: exigiria o convite carregar regional sem ter colaborador, o que desmonta D2 e seria outra change.

## Decisões tomadas na implementação (29/09/2026)

- **O texto de origem virou um módulo puro.** `lib/palestras/origem.ts`, sem `server-only`, com `ORIGEM_AVULSA`, `ROTULO_AVULSO_PADRAO` e `origemDoConvite()`. Sem ele, seis lugares decidiriam por conta própria o que mostrar quando o colaborador é nulo: a consulta, a lista (Client Component), o detalhe, a lista impressa, o CSV e o check-in. `dados.ts` reexporta `ORIGEM_AVULSA` para não quebrar quem já o importava de lá.
- **O convite avulso não tem WhatsApp em lugar nenhum**, não só na tela do lote: também não na linha da lista de convites, nem no PDF do lote. A spec só proíbe na tela do lote, mas o motivo (não há remetente) vale igual nos outros dois, e o mockup aprovado mostra apenas "Copiar". De passagem, `AcoesDeEnvio` desenhava um botão com `href="#"` quando faltava o link: agora esconde o botão.
- **A aba por colaborador deixou de tomar a tela quando não há colaborador.** Com a estrutura de lojas zerada, `/palestras/admin/gerar` mostrava só "Nenhum colaborador cadastrado" e não havia caminho para gerar nada. O aviso passou para dentro da aba dela, apontando para a aba avulsa.
- **A limpeza da integração de operação passou a apagar os lotes antes do evento.** `palestra_lote.evento_id` é `on delete restrict` e `palestra_convite.lote_id` é `set null`: apagar os convites não apagava o lote, e o lote órfão barrava o `delete` do evento na rodada seguinte.

## Open Questions

- **Limite por lote avulso.** Herda `esquemaDeQuantidade`. Se a operação pedir lotes maiores que o teto por colaborador, é uma constante própria e uma decisão consciente.
- **Quando rodar a migração.** Não existe banco de desenvolvimento separado: o `.env` aponta para o mesmo Neon que o deploy usa, e é por isso que `scripts/desativar-usuarios-de-teste.ts` existe. A migração é aditiva (`DROP NOT NULL` e `ADD COLUMN` anulável), não reescreve tabela e é compatível com o código hoje no ar, que continua gravando `colaborador_id`. Ainda assim é mudança de esquema em banco de produção, e roda com autorização explícita, fora do horário de palestra.
