# Painel do colaborador — `/palestras/painel`

Documentação da change **`painel-colaborador`**: a ferramenta de trabalho de
cerca de 390 colaboradores, usada principalmente no celular, para distribuir
convites pelo WhatsApp, acompanhar confirmações e cancelar quando preciso —
e, para gerentes e Admin, a primeira visão da distribuição no próprio
escopo.

> **Fora desta change:** check-in, lista impressa e exportação CSV. São de
> `operacao-evento`, que vem depois.

Pré-requisito: `auth-e-papeis` (sessão, papéis, escopo, máscara de CPF) e,
por transitividade, `fundacao` e `confirmacao-convidado`.

O ponto central desta change (D1 do design): **ela não cria regra de
negócio nova**. Dá interface e escopo ao que já existia — cancelamento,
geração de PDF, transição de estado, mensagem de WhatsApp. Onde havia dois
pontos de entrada possíveis (colaborador e Admin), o código por baixo
continuou sendo um só.

---

> **Atualização (`redesenho-da-interface`):** todas as telas autenticadas
> (este painel, a administração, os relatórios e o check-in) passaram a
> viver dentro de um único grupo de rotas, `app/palestras/(interno)/`, sem
> mudar nenhum endereço. A casca ganhou menu lateral (filtrado pelo papel,
> conforme `lib/palestras/papeis.ts`), barra de topo com a identidade da
> sessão e um seletor de palestra que vale como contexto para convites,
> equipe, relatórios, métricas e check-in: a palestra escolhida atravessa a
> navegação em vez de ser filtro repetido em cada tela. Detalhes em
> `openspec/changes/redesenho-da-interface/design.md` (decisões D1 a D3).

## Rotas

| Rota | O que faz | Acesso |
| --- | --- | --- |
| `/palestras/painel` | Início por papel: números por palestra e atalhos | Todos os autenticados |
| `/palestras/painel/convites` | Lista de convites, com busca, ordenação, filtros, contagens e ações na linha | Admin, gerentes, colaborador |
| `/palestras/painel/convites/[codigo]` | Detalhe de um convite confirmado: titular, acompanhante, CPF mascarado | Dentro do escopo |
| `/palestras/painel/convites/pdf` | PDF com os próprios convites disponíveis | Só colaborador |
| `/palestras/painel/equipe` | Números e listas por regional, loja e colaborador, somente leitura | Admin e gerentes |
| `/palestras/painel/metricas` | Indicadores do circuito: funil, série diária de confirmações, colaboradores sem distribuição e desempenho por regional e loja | Quem tem alcance acima de "próprios" em `verConvitesEConfirmacoes` |

As cinco primeiras já estavam na tabela de rotas do middleware
(`middleware.ts`), publicada por `auth-e-papeis` antecipando esta change. A
tela de métricas é nova, da change `redesenho-da-interface`: números lidos
de `lib/palestras/metricas.ts`, sempre recebendo o escopo, e gráficos em
SVG desenhados no servidor (sem biblioteca de gráfico).

---

## Lista de convites — a tela mais usada (D6)

`app/palestras/(interno)/painel/convites/page.tsx` busca os convites com
`convitesNoEscopo(escopo, filtro)` — a mesma função central de
`lib/palestras/dados.ts` que já aplicava o escopo por vínculo e a máscara de
CPF desde `auth-e-papeis`. Esta change **estendeu** a função, não duplicou:

- `ConviteNoEscopo` passou a trazer também os dados do evento necessários
  para montar a mensagem de WhatsApp (cidade, data, horário, local, prazo,
  o texto padrão da palestra), o `enviado_para` e a data do check-in.
- Um `leftJoin` com `palestra_checkin` traz a data e a hora de quem já
  passou pela recepção — a tabela existe desde `fundacao`, esta change só
  passou a **ler** dela; escrever continua sendo tarefa de `operacao-evento`.

**Filtros e contagem (D6):** um formulário GET por palestra e por estado,
com a contagem por estado sempre visível acima da lista, num contêiner
`sticky` que acompanha a rolagem. A contagem reflete o filtro de palestra,
não o de estado — senão a barra deixaria de servir para orientação.

**Paginação:** 20 convites por página, por `?pagina=`. Suficiente mesmo
para o colaborador com mais convites, e evita carregar centenas de linhas
de uma vez em conexão de loja do interior.

**Ações na própria linha:** "Copiar link" (`navigator.clipboard`, com
confirmação visual) e "Enviar via WhatsApp" (link `wa.me`, sem round-trip
ao servidor) só aparecem em convites `disponivel`. Nenhuma delas é uma rota
de escrita — o WhatsApp continua sendo um link aberto pelo navegador,
exatamente como o PRD pede.

### A mensagem é a mesma do PDF, porque é o mesmo código (D1)

`montarMensagemDoConvite` (`lib/palestras/mensagem.ts`) é o único lugar que
junta o texto padrão da palestra com o link e monta o `wa.me`. O PDF de
`fundacao` (`lib/palestras/pdf/montar.ts`) e a lista do painel chamam a
mesma função com os mesmos dados. `tests/utilitarios.test.ts` prova que ela
é pura (mesma entrada, mesma saída) e `scripts/integracao-painel.ts`
(seção 8) confere que o PDF gerado pelo painel e pelo Admin, para o mesmo
colaborador, trazem exatamente os mesmos links de WhatsApp.

### O link nunca chega ao navegador de quem não pode enviar

Copiar e enviar exigem `permitido(escopo, 'enviarConvitePorWhatsapp', …)`.
A checagem não fica só no botão: quando ela é falsa, a página **nem monta**
a mensagem para aquela linha — o campo chega `null` ao componente de
cliente. Um gerente que inspecionasse o código-fonte da página não
encontraria o endereço do convite, porque ele nunca saiu do servidor. É o
mesmo raciocínio de `ConfirmadoParaRecepcao` em `auth-e-papeis`: não existe
o que vazar por engano quando o dado não chega.

### Marcação de envio — lembrete pessoal, sem efeito de sistema (D4)

`enviado_para` já existia no esquema desde `fundacao`; esta change deu a
ele interface e regra de acesso. `definirEnviadoPara`
(`lib/palestras/dados.ts`) só grava quando `escopo.papel === 'colaborador'`
**e** o convite é dele — o `where` já filtra por `colaboradorId =
escopo.usuarioId`, então tentar anotar o convite de outra pessoa não altera
nada (zero linhas afetadas, sem 403 específico: a resposta não distingue
"não existe" de "não é seu"). Gerentes e Admin veem a anotação como texto,
sem campo de edição.

**Ponto de atenção de LGPD (mantido do design):** o campo aceita nome e
telefone de terceiros que não deram consentimento algum. A interface diz
explicitamente que é "lembrete pessoal". Fica sob a mesma política de
retenção indeterminada e eliminação manual pelo Admin de D9c
(`confirmacao-convidado`) — não há rotina de expurgo própria para esta
coluna, nem para nenhuma outra ainda.

---

## Cancelamento operacional — uma transação, dois autores (D1)

`lib/palestras/servicos/confirmacao.ts` ganhou
`executarTransacaoDeCancelamento`, uma função privada que faz a escrita de
verdade: chama `transicionarConvite({ para: 'cancelado' })` (o mesmo helper
de `fundacao`, com `SELECT … FOR UPDATE`), desativa a confirmação quando
existir e grava a auditoria. Duas fachadas por cima dela:

- **`cancelarPeloConvidado`** (`confirmacao-convidado`) — **comportamento e
  assinatura inalterados**. Continua só cancelando `confirmado`, continua
  idempotente (cancelar de novo responde "ok, já estava cancelado"), e
  todos os testes de integração de `confirmacao-convidado` passam sem
  alteração nenhuma.
- **`cancelarPeloPainel`** (nova) — cancela `disponivel` **ou**
  `confirmado`, recebe o autor (colaborador ou Admin) e um motivo opcional,
  e **recusa** — não trata como idempotente — cancelar algo que já está
  `cancelado`, `expirado` ou `presente`, informando o estado atual. É uma
  diferença de propósito: o convidado clicando duas vezes merece silêncio;
  o colaborador operando uma lista merece saber o que já mudou.

**Escopo da ação (D2), em duas etapas**, em
`app/palestras/(interno)/painel/convites/acoes.ts`:

1. `conviteNoEscopo(escopo, { codigo })` — o convite só existe para quem
   chamou se estiver dentro do que ele **lê**. Fora do escopo, `forbidden()`
   sem distinguir "não existe" de "é de outra pessoa".
2. `exigirAcao('cancelarConvite', { colaboradorId })` — confere se o papel
   tem a ação de **escrever**. Um gerente de loja passa no passo 1 (lê o
   convite da própria loja) e é recusado no passo 2 (alcance `nenhum` em
   `cancelarConvite` na matriz do PRD) — 403 mesmo depois de já ter
   enxergado a linha.

**Confirmação explícita nomeando o titular (D7):** quando o convite está
`confirmado`, a tela de confirmação de cancelamento busca o nome do titular
(reaproveitando `confirmacoesNoEscopo`) e o cita: "Este convite já está
confirmado por **Fulano**, que já se programou para ir e vai perder o
ingresso." e "é responsabilidade sua avisar Fulano pelo WhatsApp" — o
sistema não tem canal de notificação ao convidado, ponto que o design já
registrava como limitação aceita.

**Cancelar não devolve o convite:** a mesma tela de confirmação e o aviso
"não pode ser desfeita" deixam isso explícito antes do clique final. A
reposição é manual, pelo Admin, gerando um novo lote — decisão da cliente,
sem mudança nesta change.

---

## PDF do colaborador (`pdf-proprio`)

`montarDadosDoPdf` (`lib/palestras/pdf/montar.ts`) passou a receber o
**escopo do solicitante**:

```ts
export async function montarDadosDoPdf(
  escopo: Escopo,
  colaboradorIdAlvo: string | null,
  eventoIds: string[],
): Promise<DadosDoPdf | null>
```

Quando `escopo.papel !== 'admin'`, `colaboradorIdAlvo` é **ignorado** — o
alvo é sempre `escopo.usuarioId`. Só o Admin, cujo alcance na matriz é
`todos`, pode mirar em outro colaborador, e precisa dizer qual. É a mesma
função por baixo de `/palestras/admin/distribuir/pdf`,
`/palestras/admin/distribuir/lote` e da rota nova
`/palestras/painel/convites/pdf` — o mesmo documento
(`DocumentoDeDistribuicao`), a mesma mensagem de WhatsApp, o mesmo PDF
"nunca armazenado, montado na hora" de `fundacao`.

A rota do painel (`app/palestras/(interno)/painel/convites/pdf/route.tsx`) **nem lê**
um identificador de colaborador da query — diferente da rota do Admin, que
recebe `?colaborador=`. Não há parâmetro para ignorar porque não existe
parâmetro: o único alvo possível é a própria sessão. Gerentes recebem 403
antes de qualquer leitura de banco (a checagem de papel vem logo depois da
sessão, e é manual — `forbidden()` interrompe renderização de **página**,
não serve a uma rota que devolve PDF, o mesmo motivo pelo qual as rotas de
PDF do Admin já usavam `autorizarRota` em vez de `exigirEscopo`).

Colaborador sem convite disponível recebe 409 com uma mensagem, nunca um
PDF em branco — mesmo comportamento de `fundacao`.

**Equivalência provada:** `scripts/integracao-painel.ts`, seção 8, gera o
PDF do mesmo colaborador pelas duas rotas no mesmo instante e compara
código a código, mensagem a mensagem. Também confere que informar o id de
outro colaborador na requisição do painel não muda o resultado — ele
continua sendo ignorado.

---

## Visão de equipe (`visao-gerencial`)

`app/palestras/(interno)/painel/equipe/page.tsx`, somente leitura, sem formulário de
escrita nenhum. Três novas consultas agregadas em `lib/palestras/dados.ts`,
todas em SQL (`GROUP BY` + `count()`), não trazendo convite por convite
para agrupar em JavaScript (D5):

- `resumoPorRegional` — só Admin (é o único alcance que enxerga mais de
  uma regional).
- `resumoPorLoja` — Admin e gerente regional; explicitamente recusa
  colaborador, recepção **e** gerente de loja (que não tem "várias lojas",
  só a própria — ele cai direto em `resumoPorColaborador`).
- `resumoPorColaborador` — recebe uma `lojaId` e confere, com
  `permitido(escopo, 'verConvitesEConfirmacoes', { lojaId, regionalId })`,
  se aquela loja está no alcance de quem pediu. Fora do escopo, lança
  `SemAcesso`, que a página converte em `forbidden()` — inclusive quando o
  `lojaId`/`regionalId` vem de um parâmetro de URL manipulado à mão.

A navegação segue o papel: Admin começa em regionais e desce até
colaborador; gerente regional começa em lojas (já restritas à própria
regional pela consulta) e desce até colaborador; gerente de loja vai direto
para os colaboradores da própria loja.

**Taxas (D5 do PRD, com a regra do enunciado da spec):**
`lib/palestras/taxas.ts`, puro e testado em `tests/taxas.test.ts`.

- Confirmação = confirmados ÷ gerados. "Gerados" soma **todos** os
  estados, cancelados inclusive — a tela diz isso explicitamente.
- Comparecimento = presentes ÷ confirmados, onde "confirmados" conta quem
  chegou a confirmar (estado `confirmado` **ou** `presente` — um convite
  `presente` passou por `confirmado` a caminho).
- Divisor zero devolve `null`, exibido como "—", nunca "0%" nem uma
  exceção.

A lista de confirmados do escopo (com CPF mascarado) reaproveita
`confirmacoesNoEscopo`, que já mascarava no SQL desde `auth-e-papeis`.

---

## Prova de que o escopo não vaza

`scripts/integracao-painel.ts` é o teste de integração desta change —
escreve no banco de `DATABASE_URL`, roda com `npm run test:integracao:painel`.
Cobre, contra um Postgres real:

- **Por identificador em requisição:** colaborador B não enxerga (nem
  edita `enviado_para`, nem consegue autorização para cancelar) o convite
  do colaborador A, mesmo sabendo o código; gerente de loja não enxerga
  convite de outra loja.
- **Por URL** (parâmetro de drill-down da visão de equipe): gerente
  regional não vê lojas de outra regional; gerente de loja não obtém
  colaboradores de outra loja; colaborador não acessa a visão de equipe
  nenhuma — os três casos via exceção `SemAcesso`, sem devolver dado
  nenhum.
- Admin alcança tudo, nos quatro papéis testados lado a lado.
- Cancelamento de confirmado invalida o ingresso (`confirmacao.ativa`
  passa a falso) e libera o CPF (uma nova confirmação ativa com o mesmo
  CPF é aceita pelo índice único parcial).
- Cancelar de novo um convite já cancelado é recusado, informando o
  estado — ao contrário do cancelamento do convidado, que é idempotente.
- Admin cancela convite de colaborador **desativado**.
- Equivalência do PDF painel × Admin.
- Tempo da agregação do Admin com volume realista.

**Resíduo que o teste deixa.** Um colaborador ou o Admin que cancela pelo
painel vira `ator_id` de uma linha de `palestra_auditoria` — que é
imutável por contrato (`drizzle/0001_auditoria_imutavel.sql` recusa até o
`UPDATE … SET ator_id = NULL` que o `ON DELETE SET NULL` tentaria disparar
ao apagar o usuário). Diferente dos outros scripts de integração, que
sempre auditam com `ATOR_DE_SCRIPT` (sem id) para não esbarrar nisso, este
precisa de um usuário de verdade para exercitar `canceladoPor`. Solução:
dois usuários fixos, reaproveitados entre execuções (nome constante, sem
sufixo de execução) — o resíduo fica **limitado** a um par de linhas
(mais a loja e a regional que os prendem), não cresce a cada rodada. Ainda
assim, rodar o script deixa uma meia dúzia de linhas `[TESTE-PAINEL]` no
banco, de propósito — como a própria auditoria.

**Não aponte `DATABASE_URL` para produção ao rodar a integração.**

---

## Mapa dos arquivos desta change

> As rotas abaixo vivem hoje dentro de `app/palestras/(interno)/` (grupo de
> rotas da change `redesenho-da-interface`, sem efeito no endereço: veja a
> nota no topo deste documento). A árvore a seguir mantém os caminhos como
> a change `painel-colaborador` os criou, só com o prefixo atualizado.

```
app/palestras/(interno)/painel/
  page.tsx                     início por papel (de auth-e-papeis, com os
                                atalhos "Convites" e "Equipe" desta change)
  convites/
    page.tsx                   lista, filtros, contagens, paginação
    linha.tsx                  linha de convite (cliente): copiar, WhatsApp,
                                cancelamento em duas etapas, anotação
    acoes.ts                   Server Actions: cancelar, anotar
    [codigo]/page.tsx          detalhe do confirmado: titular, acompanhante, CPF
    pdf/route.tsx               PDF do próprio colaborador
  equipe/
    page.tsx                   visão gerencial, somente leitura
  metricas/
    page.tsx                   indicadores do circuito (`redesenho-da-interface`)

lib/palestras/
  dados.ts                     +enviadoPara/checkinEm em ConviteNoEscopo,
                                definirEnviadoPara, resumoPorRegional/Loja/Colaborador
  mensagem.ts                  +montarMensagemDoConvite (montador único)
  taxas.ts                     confirmação e comparecimento, puro
  pdf/montar.ts                montarDadosDoPdf recebe o escopo do solicitante
  servicos/confirmacao.ts      +executarTransacaoDeCancelamento, cancelarPeloPainel
  auditoria.ts                 +ACOES.canceladaPeloColaborador/PeloAdmin/enviadoParaDefinido

tests/
  taxas.test.ts                 os dois cenários da spec + divisor zero
  utilitarios.test.ts           +montarMensagemDoConvite (parceria PDF/painel)

scripts/integracao-painel.ts    escopo por URL e por identificador, cancelamento
                                 operacional, equivalência do PDF, tempo da agregação
```

Nenhuma migração nova: `enviado_para`, `cancelado_por`, `motivo_cancelamento`
e `palestra_checkin` já existiam desde `fundacao`. `npm run db:generate`
confirma "No schema changes, nothing to migrate".

---

## Testes

```bash
npm test                       # puros, sem banco (235 testes)
npm run test:integracao:painel # ESCREVE no banco de DATABASE_URL
```

Como sempre, `npm run test:integracao`, `npm run test:integracao:confirmacao`
e `npm run test:acesso` (as três changes anteriores) foram reexecutados
depois das mudanças em `dados.ts`, `pdf/montar.ts` e
`servicos/confirmacao.ts`, e continuam passando sem nenhuma alteração de
comportamento.

---

## Critérios de aceite do PRD · `painel-colaborador`

### 1. Colaborador vê seus links por palestra e estado, copia, envia pelo WhatsApp e cancela

**Atendido.** `/palestras/painel/convites`, com filtro por palestra e por
estado, contagem sempre visível, e as três ações na própria linha para
convites `disponivel` (copiar, WhatsApp) e `disponivel`/`confirmado`
(cancelar). Verificado por `scripts/integracao-painel.ts`.

### 2. Confirmados mostram nome do titular, acompanhante e CPF mascarado

**Atendido.** Na lista (indiretamente, via link "Ver dados do confirmado")
e no detalhe (`/palestras/painel/convites/[codigo]`), com o CPF já
mascarado pela camada de dados (`***.456.789-**`), nunca pela tela.

### 3. Gerente de Loja e Gerente Regional veem números e listas do seu escopo, sem gerar links

**Atendido.** `/palestras/painel/equipe` é só leitura — nenhum formulário
de escrita na tela, e as consultas que a alimentam recusam (`SemAcesso`)
qualquer tentativa de sair do escopo, inclusive por URL. Não existe rota
de geração de convites fora de `/palestras/admin/gerar`, que continua
restrita ao Admin pelo middleware.

---

## O que falta

- **Validação das telas com um colaborador real e com a cliente no
  preview** (tarefa 1.6): depende de gente, não de código. A ordenação
  padrão da lista (por data da palestra, depois código) é uma decisão
  técnica provisória até essa validação acontecer.
- **Teste em celular real, do fluxo completo de distribuição** (tarefa
  9.4): idem — precisa de um colaborador e um aparelho.
- **Piloto com uma loja antes de liberar para as demais** (tarefa 9.6):
  decisão de operação, não de implementação.
- **Campo `enviado_para` como texto livre** (D4, aberto desde o design):
  continua pendente de confirmação com o DPO — texto livre com nome e
  telefone de terceiro, ou uma marcação booleana sem identificar a quem.
