# Módulo `/palestras` — Circuito Acelera no Campo 3.0

Sistema de confirmação de presença do Circuito de Palestras Acelera no Campo
3.0 (Nossa Lavoura / Grupo Axia Agro), dentro do mesmo projeto Next.js da
landing dos 45 anos.

Esta é a documentação da change **`fundacao`**. O que ela entrega: base
Next.js, banco, cadastro de palestras, estrutura organizacional, importação
de CSV, geração de convites, expiração e PDF de distribuição.

> **Fora desta change:** confirmação pelo convidado, login, painel do
> colaborador e check-in. São as changes `confirmacao-convidado`,
> `auth-e-papeis`, `painel-colaborador` e `operacao-evento`.
>
> `auth-e-papeis` **já está implementada**: login, papéis, escopo e travas
> estão em [`docs/AUTH-E-PAPEIS.md`](./AUTH-E-PAPEIS.md). O guard provisório
> descrito mais abaixo **não existe mais**.
>
> `redesenho-da-interface` **também já está implementada**: as telas
> administrativas descritas neste documento (`/palestras/admin/*`)
> passaram a viver dentro do grupo de rotas `app/palestras/(interno)/`,
> com uma casca única (menu lateral filtrado por papel, barra de topo,
> seletor de palestra como contexto), no lugar do antigo
> `admin/layout.tsx` com barra de abas. Nenhum endereço mudou. A change
> também acrescentou uma tela de indicadores, `/palestras/painel/metricas`
> (funil, série diária de confirmações e desempenho por regional e loja),
> documentada em [`docs/PAINEL-COLABORADOR.md`](./PAINEL-COLABORADOR.md).

---

## Como rodar

```bash
npm install
cp .env.example .env     # e preencha
npm run db:migrate       # cria as 13 tabelas
npm run dev
```

| Comando | O que faz |
| --- | --- |
| `npm run dev` | servidor de desenvolvimento |
| `npm run build` / `npm start` | build e execução de produção |
| `npm run typecheck` | `tsc --noEmit`, modo estrito |
| `npm test` | testes puros (fuso, CPF, código, mensagem, CSV, estados, canvas) |
| `npm run test:integracao` | **escreve no banco de `DATABASE_URL`** — ver abaixo |
| `npm run db:generate` | gera uma migração a partir de `lib/db/schema.ts` |
| `npm run db:migrate` | aplica as migrações pendentes |
| `npm run db:studio` | Drizzle Studio |
| `npm run palestras:cadastrar` | cadastra as quatro palestras do circuito |
| `npm run expirar-convites` | roda a expiração à mão |

---

## Variáveis de ambiente

Validadas por Zod em `lib/env.ts` e lidas na subida do servidor por
`instrumentation.ts`: faltando qualquer obrigatória, **o processo não sobe**,
e a mensagem nomeia a variável.

| Variável | Obrigatória | Para quê |
| --- | --- | --- |
| `DATABASE_URL` | sim | conexão com o Neon Postgres |
| `APP_BASE_URL` | sim | origem pública: é a base do link do convite (`{APP_BASE_URL}/palestras/c/{codigo}`) |
| `CRON_SECRET` | sim | autoriza `/api/cron/expirar-convites` |
| `BETTER_AUTH_SECRET` | sim | assina cookies de sessão e tokens de acesso (mín. 32 caracteres) |
| `BETTER_AUTH_URL` | sim | origem confiável do Better Auth; sem ela, `APP_BASE_URL` é usada |
| `RESEND_API_KEY` | não | e-mails de acesso; sem ela o envio falha com mensagem neutra e registro |
| `EMAIL_FROM` | não | remetente, obrigatoriamente em `agpremium.com.br` |

Nenhuma delas tem prefixo `NEXT_PUBLIC_`, e `lib/env.ts` é `server-only`:
um import a partir de componente cliente quebra o build.

`APP_BASE_URL` muda por ambiente (local, preview, produção). Os metadados da
landing **não** usam essa variável: são fixos no domínio canônico, para um
deploy de preview não publicar um `canonical` apontando para si mesmo.

---

## Acesso administrativo

> O guard por `ADMIN_PREVIEW_TOKEN` que esta change criou **saiu** em
> `auth-e-papeis`, junto com `lib/palestras/guard.ts`,
> `app/palestras/admin/acesso/route.ts` e a constante `ADMIN_PROVISORIO`.
> Nenhuma rota responde mais àquele token.

`/palestras/admin/*` exige agora **sessão e papel `admin`**, conferidos no
middleware e de novo em cada layout. Ver
[`docs/AUTH-E-PAPEIS.md`](./AUTH-E-PAPEIS.md).

Duas decisões de `fundacao` que continuam valendo:

- **404, nunca 401.** Rota administrativa **sem sessão** responde a mesma 404
  de qualquer endereço inexistente. Um 401 confirmaria que existe algo ali.
  Quem tem sessão e não é Admin recebe 403.
- **Falha fechada.** Sem banco acessível, o middleware nega.

Todas as telas administrativas levam `noindex, nofollow`.

### O primeiro Admin

Há um problema de ovo e galinha: as telas de cadastro de usuário exigem
sessão de Admin, e um banco novo começa sem nenhum usuário. Alguém precisa
ser o primeiro, e é por `scripts/criar-admin.ts`:

```sh
npm run admin:criar -- --nome "Fulano de Tal" \
  --email "fulano@agpremium.com.br" \
  --cpf "000.000.000-00" --nascimento "01/01/1990"
```

O script cria (ou promove) o usuário com papel `admin` e **imprime no
terminal um link de primeiro acesso**, para a pessoa definir a própria
senha. O link sai do fluxo oficial de redefinição do Better Auth — mesmo
token, mesma validade, mesmo uso único —, só que impresso em vez de
enviado por e-mail. Assim o primeiro acesso não fica refém do Resend
estar configurado, e quem roda o script não fica sabendo a senha de
ninguém.

`cpf` e `data_nascimento` são obrigatórios no esquema, e o CPF é conferido
pelo dígito verificador antes de qualquer escrita. É idempotente pelo CPF:
rodar de novo atualiza o cadastro e emite um link novo.

Depois do primeiro Admin, todo o resto entra pela interface ou pela
importação de CSV.

### Usuários de teste

Os scripts de integração criam usuários para exercitar papéis e escopo, e não
conseguem se apagar por completo. O resíduo **não é cosmético**: são contas num
banco que preview e produção compartilham, algumas com papel `admin`, e as de
papel `colaborador` e `recepcao` aceitam login por CPF e data de nascimento,
com datas redondas e previsíveis.

Duas ferramentas, e a segunda é a definitiva:

```sh
npm run usuarios:desativar-teste             # mostra o que faria
npm run usuarios:desativar-teste -- --aplicar   # ativo = false, reversível

npm run usuarios:remover-teste               # mostra o que faria
npm run usuarios:remover-teste -- --aplicar     # DELETE, com backup em docs/
```

Desativar deve rodar **depois de cada rodada de integração**, antes de
qualquer uso sério do ambiente. Remover é para a limpeza de verdade: escreve
um backup `.sql` dos usuários e das contas antes de apagar, recusa se algum
deles tiver convite ou lote apontando para si (as duas colunas são
`on delete restrict`: não seriam usuários descartáveis, teriam distribuído
convites de verdade) e recusa também se alguma linha de auditoria deles
estiver sem `ator_nome`, que seria a única identificação de quem agiu ali.

#### Por que apagar era impossível até a migração 0007

`palestra_auditoria.ator_id` tinha chave estrangeira para `user` com
`ON DELETE SET NULL`. Para o Postgres, `SET NULL` é um `UPDATE` — e o gatilho
`palestra_auditoria_sem_update` proíbe qualquer UPDATE nessa tabela. As duas
regras se anulavam: **qualquer** `DELETE` em `user` derrubava a transação
inteira, e por isso só existia o caminho de desativar.

A migração `0007` tirou aquela FK. `ator_id` continua lá, como texto e
indexado; o que sai é a garantia referencial do ponteiro, que pode passar a
apontar para um usuário removido. A troca vale porque **nenhuma leitura do
sistema junta essa tabela com `user`**: a tela de auditoria, o filtro por ator
e a linha do tempo do convite usam `ator_nome`, gravado junto de cada
registro. Em troca, nenhuma linha de auditoria é mais tocada pelo ciclo de
vida de outra tabela, e os três gatilhos ficam armados o tempo inteiro — é
imutabilidade mais forte que antes, não uma exceção aberta nela.

---

## Banco de dados

Neon Postgres + Drizzle ORM. Migrações versionadas em `drizzle/`.

```bash
npm run db:generate        # depois de mexer em lib/db/schema.ts
npm run db:migrate         # aplica; rodar duas vezes não repete nada
```

O migrador guarda o hash de cada arquivo aplicado em
`drizzle.__drizzle_migrations`, então a idempotência é do próprio Drizzle.

**Treze tabelas**, todas criadas na migração inicial — inclusive
`palestra_confirmacao` e `palestra_checkin`, que só serão escritas pelas
changes seguintes (D2 do design):

| Grupo | Tabelas |
| --- | --- |
| Estrutura | `palestra_regional`, `palestra_loja` |
| Better Auth | `user` (estendida com cpf, data_nascimento, whatsapp, papel, regional_id, loja_id, ativo), `session`, `account`, `verification` |
| Convites | `palestra_evento`, `palestra_lote`, `palestra_convite` |
| Operação | `palestra_confirmacao`, `palestra_checkin` |
| Apoio | `palestra_importacao`, `palestra_auditoria` |

Restrições que carregam regra de negócio:

- `palestra_confirmacao (cpf) WHERE ativa` — índice único **parcial**: um CPF,
  uma confirmação ativa no circuito inteiro.
- `palestra_evento`: `prazo_confirmacao < data_hora`.
- `palestra_convite.estado` e `user.papel` com CHECK de domínio.
- `user.cpf` e `palestra_confirmacao.cpf` com CHECK `^[0-9]{11}$`.
- `palestra_auditoria`: gatilhos que **recusam** UPDATE, DELETE e TRUNCATE.

Dois clientes, por transporte (`lib/db/index.ts`):

- `db()` — HTTP, uma viagem por consulta. É o que quase toda tela usa.
- `dbTx()` — WebSocket, mantém sessão. **Obrigatório** para `BEGIN … COMMIT`
  e `SELECT … FOR UPDATE`. Usar HTTP numa transação não dá erro visível: cada
  consulta abre sua própria sessão e a trava simplesmente não vale.

---

## Fuso horário

Tudo é gravado em `timestamptz` (UTC). A conversão para `America/Porto_Velho`
acontece só na borda, em `lib/tempo.ts`, com `date-fns-tz`. O identificador
IANA é usado em vez do offset fixo: Rondônia não adota horário de verão hoje,
mas se a regra mudar o sistema acompanha sem alteração de código.

O prazo padrão de confirmação é **23h59 da véspera**, calculado sobre a data
civil em Porto Velho — não sobre o instante UTC. Uma palestra às 19h00 de
13/10 acontece às 23h00 UTC do mesmo dia, e a véspera precisa ser 12/10 nos
dois casos.

---

## Ciclo de vida do convite

```
disponivel ──┬─> confirmado ──┬─> presente
             │                └─> cancelado
             ├─> expirado
             └─> cancelado
```

`presente`, `expirado` e `cancelado` são terminais: nada volta para
`disponivel`. E `confirmado` **nunca** vai para `expirado` — quem confirmou
dentro do prazo continua confirmado depois dele.

**Toda** transição passa por `transicionarConvite()`
(`lib/palestras/estado-do-convite.ts`), que roda em transação com
`SELECT … FOR UPDATE` sobre a linha do convite. Sem a trava, dois cliques
simultâneos no mesmo link leriam `disponivel` ao mesmo tempo e ambos
gravariam `confirmado`, com CPFs diferentes — e a restrição única de CPF não
pega esse caso, porque são CPFs distintos.

As changes seguintes usam esse helper. Não reimplemente a trava.

### Expiração: dupla, de propósito

1. **Na leitura** — `estadoEfetivo()` compara o prazo com o instante atual e
   apresenta como expirado qualquer `disponivel` vencido, mesmo que a rotina
   não tenha rodado. É o que garante a correção.
2. **Por rotina diária** — consolida o estado gravado.

O cron é um efeito colateral. Se ele falhar, ninguém confirma fora do prazo;
só o estado gravado fica atrasado.

```bash
# Manual (o caminho previsto se o plano da Vercel não permitir cron diário)
npm run expirar-convites

# Por HTTP
curl -H "Authorization: Bearer $CRON_SECRET" \
     https://<host>/api/cron/expirar-convites
```

Sem o segredo, ou com o segredo errado, a rota responde **401** e nada é
alterado. (Aqui 401 é o certo: o segredo *é* o controle de acesso e quem
chama é uma máquina, que precisa distinguir "não autorizado" de "rota
errada".)

O agendamento está em `vercel.json`: `5 4 * * *` UTC = **00h05 em Porto
Velho**, logo depois da virada, para consolidar um prazo das 23h59 ainda de
madrugada.

---

## Código do convite

Seis caracteres do alfabeto `23456789ABCDEFGHJKMNPQRSTUVWXYZ` — 31 símbolos,
sem `0`, `O`, `1`, `I` e `L`, que são os pares que as pessoas confundem ao ler
em voz alta. Cerca de 887 milhões de combinações.

Sorteado com `crypto.randomInt`, que rejeita e re-sorteia os valores da faixa
enviesada: um módulo simples sobre 31 símbolos tornaria alguns caracteres mais
prováveis, e um código previsível é um código adivinhável.

Colisão é resolvida pela restrição única do banco: o bloco inteiro é
re-sorteado e o `insert` repetido, até `MAX_TENTATIVAS_DE_CODIGO`.

---

## Importação de CSV

Duas etapas, `/palestras/admin/importar`:

1. **Pré-visualização** — analisa, conta novos/atualizados/erros e mostra uma
   amostra. **Não grava nada.**
2. **Confirmação** — grava tudo numa transação única.

Upsert: regional por **nome**, loja por **código**, usuário por **CPF**.
Reimportar o mesmo arquivo não duplica ninguém, e o identificador do usuário é
preservado — convites, confirmações e lotes já apontam para ele.

Cabeçalho exato exigido:

```
regional,loja_codigo,loja_nome,loja_cidade,nome,cpf,data_nascimento,email,whatsapp,papel
```

Cabeçalho divergente recusa o arquivo **inteiro**, nomeando as colunas que
faltam ou sobram.

Cuidados que o parser trata: BOM do Excel, `\r\n` do Windows, linhas de
comentário do modelo e — o clássico — **CPF formatado como número**, que perde
o zero à esquerda. Um CPF com 10 dígitos recebe uma mensagem específica
dizendo para formatar a coluna como texto.

A lógica de banco fica em `lib/palestras/servicos/importacao.ts`; a análise
pura, sem banco, em `lib/palestras/importacao.ts`.

---

## PDF de distribuição

`@react-pdf/renderer` em Route Handler com `runtime = 'nodejs'` — ele usa APIs
de Node (fontes e imagens do disco) que não existem no Edge Runtime.

- `/palestras/admin/distribuir/pdf?colaborador=…&palestra=…` — um PDF
- `/palestras/admin/distribuir/lote?colaborador=…&colaborador=…` — `.zip`

Montado no momento do pedido e **nunca armazenado**. Fotografa os convites
disponíveis naquele instante — coerente com o carimbo de geração impresso.

Só entram convites `disponivel` **no estado efetivo**: um convite cujo prazo
venceu não é impresso, mesmo que o cron ainda não tenha rodado. Imprimir link
morto é pior que não imprimir nada. Colaborador sem convite disponível recebe
**409**, não um PDF em branco.

O botão "Enviar via WhatsApp" aponta para `https://wa.me/?text=…` **sem
número**, o que abre o seletor de contatos do próprio WhatsApp. A mensagem
passa por `encodeURIComponent` — acentos, `·`, emojis, quebras de linha e
principalmente o `&`, que sem escape cortaria a mensagem ao meio.

O limite de colaboradores por lote (`LIMITE_POR_LOTE`, hoje 60) vem do teto de
execução da função na Vercel. O `.zip` é transmitido em streaming, então
memória não é o gargalo. Quem não tem convite disponível é pulado e aparece
com nome e motivo num `LEIA-ME.txt` dentro do próprio arquivo.

---

## Convites avulsos (change `convites-avulsos`)

O Admin gera convites **sem colaborador de origem** direto de uma palestra:
imprensa, patrocinador, autoridade, convidado do Grupo. É a segunda aba de
`/palestras/admin/gerar` (`?modo=avulso`), e não uma tela separada, porque o
que muda é só a ausência de destinatário.

| O que | Onde |
| --- | --- |
| Gerar (formulário) | `/palestras/admin/gerar?modo=avulso` |
| Links do lote recém gerado | `/palestras/admin/gerar/lote/<id>` |
| Lotes avulsos da palestra | `/palestras/admin/gerar/lotes?palestra=<id>` |
| PDF do lote | `/palestras/admin/gerar/lote/<id>/pdf` |
| CSV do lote | `/palestras/admin/gerar/lote/<id>/csv` |
| Serviço | `gerarLoteAvulso()` em `lib/palestras/servicos/geracao.ts` |
| Consultas | `resumoAvulso`, `lotesAvulsosDaPalestra`, `loteAvulsoNoEscopo` em `lib/palestras/dados.ts` |
| Texto de origem | `lib/palestras/origem.ts` |

No banco, convite avulso é `palestra_convite.colaborador_id IS NULL` (as duas
colunas ficaram anuláveis na migração `0006`, que também acrescentou
`palestra_lote.rotulo`). Não existe coluna "é avulso": a ausência do vínculo
**é** a definição, e é o que mantém o resto do sistema coerente sem um campo
novo para alguém esquecer de preencher.

### Rótulo do lote

Opcional, até 80 caracteres ("Imprensa", "Patrocinador Virbac"). Onde a
interface mostraria o colaborador, o convite avulso mostra **Administração**,
com o rótulo como linha secundária; sem rótulo, a linha secundária diz
**Avulso**. Campo em branco é proibido: numa folha impressa ou na porta,
célula vazia parece defeito do sistema.

Esse par (título, detalhe) é decidido num lugar só, `origemDoConvite()` em
`lib/palestras/origem.ts` — módulo puro, sem `server-only`, para que a
consulta, o Server Component, o Client Component da linha, o PDF e o CSV usem
o mesmo texto em vez de cada um inventar o próprio "sem colaborador".

### `leftJoin` nas leituras, `innerJoin` nos recortes

É a regra central da change, e a fonte de erro mais provável nela:

- **Leitura** (`convitesNoEscopo`, `conviteNoEscopo`, `confirmacoesNoEscopo`,
  `listaDeImpressao`, `dadosParaExportacaoCsv`, e o `select` do resultado do
  check-in) usa `leftJoin` em `user`. Um `innerJoin` faria o convite avulso
  **desaparecer em silêncio**, sem erro nenhum.
- **Recorte por origem** (`resumoPorRegional`, `resumoPorLoja`,
  `resumoPorColaborador`) continua com `innerJoin` de propósito: é o que
  mantém o avulso fora desses números **por construção**, sem depender de
  ninguém lembrar de filtrar.

`tests/convite-avulso.test.ts` trava as duas metades lendo o próprio código
das funções, sem banco. O caso mais grave que isso protege já aconteceu:
`executarCheckin` fazia `innerJoin` em `user`, e por isso um convidado que
confirmasse por convite avulso levava **tela vermelha** na portaria (a
consulta não devolvia linha, o serviço lançava `RecusaDeCheckin('invalido')` e
a transação inteira era desfeita). Não era campo em branco, era entrada
negada. A seção 12 de `scripts/integracao-operacao.ts` exercita esse caminho
contra o banco real.

### Os números

Convite avulso entra no total da palestra, no funil e na série diária. **Não**
entra nos recortes por regional, loja e colaborador. Como a soma desses
recortes passa a ser menor que o total, a tela de métricas mostra uma linha
**Avulsos** com a diferença (`resumoAvulso`), e explica em texto por que ela
existe: número que não fecha parece erro.

### O que o convite avulso não tem

- **Envio por WhatsApp**, nem na tela do lote, nem na lista de convites, nem
  no PDF do lote. Não é esquecimento: sem colaborador, não há remetente para
  a mensagem do sistema. O Admin copia o endereço e distribui pelo canal que
  fizer sentido.
- **Anotação de "enviado para"**, que é um lembrete pessoal do colaborador.
- **Visibilidade fora do Admin.** Colaborador, gerente de loja, gerente
  regional e recepção não o veem em lista, contagem, exportação nem detalhe.
  A trava não é a tela: `restricao()` compara vínculos que o avulso não tem,
  então a igualdade nunca casa, e `resumoAvulso`, `lotesAvulsosDaPalestra` e
  `loteAvulsoNoEscopo` recusam o papel explicitamente.

A geração avulsa é registrada na auditoria como `lote_avulso.gerado`, ação
própria e distinta de `lote.gerado`: a origem não precisa ser deduzida de um
campo nulo.


## Auditoria

Toda ação sensível é gravada em `palestra_auditoria` com ator, ação, entidade,
identificador, payload e data e hora. Rotina automática grava sem ator.

**Imutável no banco**: os gatilhos de
`drizzle/0001_auditoria_imutavel.sql` recusam UPDATE, DELETE e TRUNCATE. Uma
regra só na aplicação não bastaria — um `update` esquecido, um script de
manutenção ou uma change futura furariam a trilha.

O payload é limpo no único ponto de escrita
(`limparPayload` em `lib/palestras/auditoria.ts`): CPF vira máscara
(`529.***.***-25`), e senha, OTP, token de ingresso e segredos somem inteiros.
A limpeza não confia em quem chama — é fácil passar o objeto de um formulário
sem perceber o que vai junto.

Consulta em `/palestras/admin/auditoria`, com filtro por ator, ação, entidade
e período.

---

## Identidade visual

O design system é o mesmo da landing: `tokens.css` na raiz é a **única fonte
da verdade** de cor, tipografia, espaçamento, forma e movimento.

- `app/base.css` — importa `tokens.css`. Carregado pelo layout raiz, vale em
  todas as rotas.
- `app/globals.css` — tema do Tailwind, traduzido de `tokens.css`. Carregado
  **só** pelo layout de `/palestras`.
- `app/landing.css` e `app/foto-comemorativa/foto-comemorativa.css` — o CSS
  das páginas antigas, migrado sem alteração.

O Tailwind fica escopado ao módulo de propósito: a landing e a foto
comemorativa são reconstruções fiéis e não devem ter nenhuma camada de reset
por cima.

No tema, as escalas padrão do Tailwind são **zeradas** com `initial` antes de
serem redefinidas. Sem isso, o `--radius-md` do Tailwind (0.375rem)
sobrescreveria o do design system (16px) no `:root` das rotas do módulo.

A escala de espaçamento é a exceção — a do Tailwind já contém a do design
system: `space-1`=`p-1`, `space-2`=`p-2`, `space-3`=`p-3`, `space-4`=`p-4`,
`space-5`=`p-6`, `space-6`=`p-8`, `space-7`=`p-12`, `space-8`=`p-16`,
`space-9`=`p-24`, `space-10`=`p-32`.

**Selo.** Nas superfícies do circuito (página `/palestras`, telas
administrativas, PDF) use `assets/img/selo_circuito_acelera_no_campo.webp`.
Na landing e na foto comemorativa, o selo dos 45 anos.

> O selo do circuito carrega as marcas **Virbac** e **Supremax**, que são dos
> patrocinadores. **Nunca recorte nem distorça** — proporção sempre 1:1. E não
> use como favicon: em 32px as marcas ficam ilegíveis. O favicon continua
> sendo o selo dos 45 anos.

---

## Mapa dos arquivos

> **Atualizado por `redesenho-da-interface`:** o antigo `admin/layout.tsx`
> (barra de abas) foi removido. As telas administrativas agora vivem em
> `app/palestras/(interno)/admin/`, dentro da casca única com menu lateral
> e barra de topo de `app/palestras/(interno)/layout.tsx` (ver a nota no
> topo deste documento). Os endereços continuam os mesmos.

```
app/
  layout.tsx                  casca comum: fontes, tokens
  page.tsx                    landing dos 45 anos (React)
  landing.css                 CSS da landing, migrado sem alteração
  foto-comemorativa/          página do gerador de moldura
  robots.txt/ sitemap.xml/    Route Handlers com o conteúdo exato da versão estática
  palestras/
    layout.tsx                carrega o Tailwind
    page.tsx                  página pública do circuito
    not-found.tsx             404 com a identidade do Acelera
    (interno)/                casca única: menu lateral, barra de topo,
                               contexto de palestra (`redesenho-da-interface`)
      layout.tsx               sessão + escopo + navegação, sem mudar URL
      admin/
        palestras/              CRUD de palestras
        organizacao/            regionais, lojas, usuários
        importar/               assistente de CSV + modelo baixável
        gerar/                  geração de lotes (por colaborador e avulso)
          lote/[id]/              links, PDF e CSV de um lote avulso
          lotes/                  lotes avulsos da palestra
        distribuir/             PDFs (individual e .zip)
        auditoria/              consulta da trilha
      painel/                   painel do colaborador (ver
                                 `docs/PAINEL-COLABORADOR.md`), incluindo
                                 `metricas/` (indicadores do circuito)
      checkin/ relatorios/      operação do evento (ver
                                 `docs/OPERACAO-EVENTO.md`)
  api/cron/expirar-convites/  rotina diária

components/
  landing/                    comportamentos de main.js, em React
  foto-comemorativa/          motor de canvas (geometria + invólucro)
  palestras/                  selo e cabeçalho do circuito
  ui/                         primitivas shadcn com os tokens do design system

lib/
  env.ts                      configuração validada por Zod
  tempo.ts                    fuso America/Porto_Velho
  urls.ts                     domínio canônico
  db/                         conexões e esquema Drizzle
  palestras/
    auditoria.ts              trilha + limpeza do payload
    codigo.ts                 código curto do convite
    consultas.ts              leituras
    cpf.ts                    validação, normalização, máscara
    estado-do-convite.ts      máquina de estados + trava de linha
    expiracao.ts              rotina de consolidação
    importacao.ts             análise pura do CSV
    mensagem.ts               copy aprovada + marcadores + wa.me
    slug.ts                   slug de palestra
    validacao.ts              esquemas Zod compartilhados
    pdf/                      documento e montagem dos dados
    servicos/                 importação e geração (lógica de banco)

drizzle/                      migrações versionadas
scripts/                      migração, cadastro das palestras, expiração, integração
tests/                        testes puros
docs/paridade-migracao-nextjs.md   referência da migração da landing
```

---

## Testes

```bash
npm test                  # puros, sem banco
npm run test:integracao   # ESCREVE no banco de DATABASE_URL
npm run test:acesso       # os quatro métodos de login; ESCREVE no banco
```

Os testes puros cobrem: fuso e prazo da véspera, CPF, gerador de código,
marcadores e codificação da mensagem de WhatsApp, análise de CSV, máquina de
estados e a geometria do canvas da foto comemorativa.

O teste de integração roda contra um Postgres real e exercita importação
limpa, importação com erros, reimportação idempotente, geração com
quantidades diferentes, recusa por prazo vencido, lote de 600 convites,
montagem do PDF e a rotina de expiração. Tudo que ele cria leva o prefixo
`[TESTE]` e é removido no fim — menos os registros de auditoria, que são
imutáveis por contrato.

> **Não aponte `DATABASE_URL` para produção ao rodar a integração.**

Para exercitar também os endpoints de PDF (que precisam do servidor rodando,
por causa do `runtime = 'nodejs'`):

```bash
npm run build && npm start &
# entre em /palestras/entrar, copie o valor do cookie de sessão e exporte:
BASE=http://localhost:3000 SESSAO_ADMIN=<palestras.session_token> npm run test:integracao
```

**Resíduo que o teste deixa.** Tudo que ele cria é removido no fim, menos os
registros de `palestra_auditoria` — que são imutáveis por contrato e não
podem ser apagados nem pela aplicação nem por `psql`. Num banco que vai
receber a base real, conte com algumas dezenas de linhas de auditoria de
teste na trilha.

---

## Paridade da landing

A landing dos 45 anos e a `/foto-comemorativa` foram **reconstruídas** em
React, substituindo o HTML estático. URLs, conteúdo visível, metadados e
headers foram preservados.

O registro da conferência — o que foi comparado, o que deu igual e as
divergências aceitas — está em
[`docs/paridade-migracao-nextjs.md`](./paridade-migracao-nextjs.md).

---

## Critérios de aceite do PRD · `fundacao`

Os cinco critérios da seção `fundacao` do PRD, conferidos um a um em
28/09/2026 contra o banco Neon e o servidor de produção local.

### 1. Admin cadastra as 4 palestras e o prazo é preenchido como véspera às 23h59

**Atendido.** `npm run palestras:cadastrar` criou as quatro com o prazo
calculado por `prazoPadrao()` — o mesmo que o formulário usa — e o script
**falha** se o valor divergir do publicado no PRD:

| Palestra | Data e hora | Prazo calculado |
| --- | --- | --- |
| Vilhena | 13/10/2026 19h00 | 12/10/2026 às 23h59 |
| Espigão d'Oeste | 14/10/2026 19h00 | 13/10/2026 às 23h59 |
| Ji-Paraná | 15/10/2026 19h00 | 14/10/2026 às 23h59 |
| Porto Velho | 17/10/2026 10h30 | 16/10/2026 às 23h59 |

Pelo formulário, o prazo acompanha a data enquanto não for tocado e vira
valor do Admin assim que for editado. Prazo igual ou posterior à palestra é
recusado na tela, no servidor e por um CHECK no banco.

### 2. Modelo CSV baixável; pré-visualização com novos, atualizados e erros por linha

**Atendido.** `/palestras/admin/importar/modelo` entrega
`colaboradores.csv` em UTF-8 com BOM, cabeçalho exato e um exemplo por papel
que exige escopo. A pré-visualização mostra novos, atualizados, com erro,
regionais e lojas novas, mais a lista de erros com linha, campo e motivo — e
**não grava nada** (conferido comparando as contagens do banco antes e
depois).

### 3. Reimportar o mesmo CSV não duplica regionais, lojas nem usuários

**Atendido.** Segunda importação do mesmo arquivo: **0 criados, 5
atualizados**, e as contagens de `user`, `palestra_regional` e
`palestra_loja` idênticas antes e depois.

### 4. Quantidades diferentes para colaboradores diferentes, numa só operação

**Atendido.** 10 + 20 + 5 = **35 convites** numa transação, distribuídos
corretamente, todos `disponivel`, todos com código de 6 caracteres do
alfabeto sem ambiguidade e nenhum repetido. Um lote novo **soma** aos
existentes (35 → 38). Quantidade zero ou negativa recusa a operação inteira
e aponta os colaboradores culpados, sem gerar nada.

### 5. PDF lista só links disponíveis, com link em texto e botão WhatsApp

**Atendido.** Conferido pelo endpoint real: `Content-Type: application/pdf`,
nome de arquivo com loja e colaborador, `%PDF-` nos primeiros bytes, anotação
`/URI` apontando para `wa.me` e a mensagem da palestra com os marcadores já
substituídos pelo link daquele convite. Só entram convites `disponivel` no
estado efetivo. Colaborador sem convites recebe **409**, não um PDF em branco.

### Fora da `fundacao`, mas verificado porque a spec pede

- Geração de convites **depois do prazo** é recusada, com mensagem que
  explica o motivo.
- A rotina de expiração responde **401** sem o `CRON_SECRET`, expira só os
  `disponivel` vencidos, **não toca em `confirmado`** e é idempotente.
- `/palestras/admin/*` sem o token responde **404** (nunca 401), com a 404 do
  circuito.
- `palestra_auditoria` recusa UPDATE, DELETE e TRUNCATE no próprio banco. Desde
  a migração `0007` isso vale sem exceção: a FK `ator_id -> user` saiu
  justamente porque o `ON DELETE SET NULL` dela era um UPDATE disfarçado e
  tornava a remoção de qualquer usuário impossível (ver "Usuários de teste").

### Desempenho

600 e 800 convites numa operação: **1,2 s** (~1,5 ms por convite), bem
dentro do teto de execução de uma função da Vercel.

---

## Changes seguintes

- **`confirmacao-convidado`** — a página do convite, o formulário, a trava do
  convite no primeiro CPF, o ingresso com QR, a recuperação em outro
  dispositivo e o cancelamento pelo convidado:
  [`docs/CONFIRMACAO-CONVIDADO.md`](./CONFIRMACAO-CONVIDADO.md).

- **`auth-e-papeis`** — os quatro métodos de login, a matriz de permissões do
  PRD aplicada no servidor, escopo por vínculo, sessão por papel, bloqueio
  por tentativas e a remoção do guard provisório:
  [`docs/AUTH-E-PAPEIS.md`](./AUTH-E-PAPEIS.md).
