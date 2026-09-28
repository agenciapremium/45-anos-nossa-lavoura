# Confirmação do convidado — `/palestras/c/[codigo]`

Documentação da change **`confirmacao-convidado`**: a única tela do sistema
com usuário externo. Um produtor rural, no celular, a partir de um link
recebido no WhatsApp — sem login, sem treinamento e sem suporte.

O que ela entrega: a página do convite, o formulário de confirmação, a trava
do convite no primeiro CPF, o ingresso com QR Code, a recuperação em outro
dispositivo, o cancelamento pelo convidado e o registro de consentimento.

> **Fora desta change:** login, painel do colaborador e check-in. São
> `auth-e-papeis`, `painel-colaborador` e `operacao-evento`.

Pré-requisito: `fundacao` (esquema, convites, palestras, prazos e o helper
de transição de estado).

---

## Rotas

| Rota | O que faz | Acesso |
| --- | --- | --- |
| `/palestras/c/[codigo]` | Formulário, ingresso ou aviso de estado | Público |
| `/palestras/c/[codigo]/agenda.ics` | Arquivo de calendário da palestra | Só o dispositivo do titular |
| `/palestras/ingresso` | Recuperação por CPF **e** código | Público |

As três levam `noindex, nofollow` e não constam do `sitemap.xml`.

O código na URL é normalizado para maiúsculas; um link colado em minúsculas
é redirecionado para a forma canônica, que é a que casa com o `path` do
cookie do titular.

---

## O que cada estado mostra

| Estado efetivo | Quem abre | O que vê |
| --- | --- | --- |
| `disponivel`, no prazo | qualquer um | dados da palestra + formulário |
| `disponivel`, fora do prazo | qualquer um | aviso de prazo encerrado |
| `confirmado` / `presente` | o dispositivo do titular | o ingresso |
| `confirmado` / `presente` | qualquer outro | "já foi utilizado", **sem dado nenhum** |
| `cancelado` | qualquer um | "este convite não vale mais" |
| código inexistente | qualquer um | **exatamente a mesma tela do cancelado** |

O estado é sempre o **efetivo**: `estadoEfetivo()` trata como expirado todo
`disponivel` com prazo vencido, mesmo que o cron ainda não tenha rodado.

### Por que "inexistente" e "cancelado" são idênticos

Se as duas respostas diferissem — no texto, no tamanho do HTML ou no tempo —,
dava para varrer códigos e descobrir quais existem. Três medidas, todas em
`app/palestras/c/[codigo]/page.tsx`:

1. **O mesmo componente.** As duas caem em `TelaDeEstado variante="indisponivel"`.
   O texto precisa servir aos dois casos, daí "pode ter sido cancelado, ou o
   endereço pode estar incompleto".
2. **O mesmo tempo.** `aguardarPisoDeTempo` segura toda tela de estado até um
   piso fixo (260 ms), acima do pior caso de trabalho real. O piso é
   constante, não aleatório: jitter mascara a média, mas a distribuição ainda
   separa os casos com amostras suficientes.
3. **Metadados fixos.** O `<title>` é o mesmo para código válido, expirado,
   cancelado e inexistente — nada de `generateMetadata` com a cidade, que
   contaria pela aba do navegador o que a página se recusa a dizer.

### Por que as telas de estado não vazam dado

`TelaDeEstado` **não tem prop com dado pessoal**. A única entrada é o nome da
variante. Não é disciplina de quem escreve o JSX: vazar ali exigiria mudar a
assinatura do componente. Como não existe prop para serializar, não há nada
na carga de hidratação do React — que é onde um vazamento passaria
despercebido, porque não aparece na tela.

---

## Concorrência

Duas garantias, e nenhuma delas é lógica de aplicação.

### Um convite, uma confirmação — trava de linha

`confirmarPresenca()` não escreve estado à mão: chama
`transicionarConvite()` (de `fundacao`), que roda `SELECT … FOR UPDATE` sobre
a linha do convite dentro de uma transação. O segundo envio espera, relê o
estado já atualizado e é recusado por `estado-inesperado`.

A restrição única de CPF **não** cobriria este caso: os dois envios têm CPFs
diferentes, e sem a trava o segundo sobrescreveria o primeiro.

### Um CPF, uma palestra — índice único parcial

`palestra_confirmacao (cpf) WHERE ativa`. A aplicação checa antes para dar
uma mensagem boa, mas a violação de unicidade (SQLSTATE `23505`) é tratada
como **caminho esperado** e convertida na mensagem de CPF já confirmado —
nunca como erro 500.

A transação inteira é desfeita junto, então o convite perdedor continua
`disponivel`. É o comportamento certo: o CPF está ocupado em outro lugar, e
aquele convite segue valendo para outra pessoa.

### Como isso é provado

`npm run test:integracao:confirmacao`, seção 5. São três camadas:

- **5a/5b — a corrida de verdade.** Cinco rodadas de `Promise.all` para cada
  cenário, cada uma com convites novos. Invariante conferido no banco:
  exatamente uma confirmação ativa, e o perdedor com a mensagem certa.
- **5c — quem decidiu foi o banco.** Nas rodadas acima, a pré-checagem da
  aplicação pode ter chegado antes em alguma. Então o teste abre uma
  transação concorrente que escreve e **não dá commit**, espera a
  pré-checagem rodar (e passar, porque não enxerga o que não foi commitado)
  e só então libera. A recusa que chega depois só pode ter vindo da trava de
  linha e do índice único.
- **Prova da restrição.** Um `insert` direto de uma segunda confirmação ativa
  com o mesmo CPF, conferindo o código `23505` e o nome
  `palestra_confirmacao_cpf_ativa_idx`.

Duplo toque do mesmo CPF no mesmo convite é **idempotente**: devolve o mesmo
ingresso, com o mesmo token, sem criar segunda confirmação.

---

## Consentimento (LGPD)

Os textos aprovados (D9b) estão em `lib/palestras/consentimento.ts` como
**padrão**, e `lib/palestras/configuracao.ts` procura antes uma linha em
`palestra_configuracao`. Uma revisão do DPO é um `update` de uma linha, não
um deploy.

```sql
update palestra_configuracao set valor = '…' where chave = 'consentimento.aceite';
-- ou, se ainda não existir a linha:
insert into palestra_configuracao (chave, valor) values ('consentimento.aceite', '…');
```

| Chave | Conteúdo |
| --- | --- |
| `politica.versao` | versão gravada na confirmação (padrão `3.0`) |
| `politica.url` | link da política, aberto em nova aba |
| `encarregado.email` | canal do titular (padrão `dpo@axiaagro.com.br`) |
| `consentimento.aceite` | checkbox obrigatório |
| `consentimento.opt_in` | checkbox opcional |
| `consentimento.apoio` | texto de apoio, em corpo menor |

Dois marcadores viram link na renderização: `{politica}` e `{dpo}`. Eles
existem para o link ficar **dentro** da frase sem partir o texto em três
pedaços de JSX — uma frase partida não é editável por quem revisa. O valor
vindo do banco nunca vira HTML: `partirTexto` devolve trechos, e cada trecho
entra como texto.

**Evidência gravada em cada confirmação:** data e hora do aceite, versão da
política, o texto exibido, IP, agente de usuário e o opt-in de comunicações.
A versão é gravada como valor, não como referência: se a política mudar, as
confirmações antigas continuam apontando a que a pessoa de fato aceitou.

**Retenção:** indeterminada, sem rotina de expurgo (D9c, decisão da cliente).
O texto de apoio amarra a guarda à **finalidade**, não a um prazo. A
eliminação a pedido do titular é operação manual do Admin — e continua
pendente de tela própria (ver "O que falta").

---

## Ingresso

- **Token:** 32 bytes de `randomBytes`, em base64 URL-safe. É o conteúdo
  inteiro do QR: não é URL, não carrega CPF, nome nem identificador de
  palestra. Apontar a câmera para o ingresso alheio não abre página nenhuma.
- **QR:** gerado no servidor e embutido como `data:` URI. Na porta do evento,
  sem sinal, uma imagem por URL não carregaria — e a imagem salva depende de
  o QR já estar desenhado.
- **Salvar como imagem:** desenhado em `canvas` (`desenho.ts`), não capturado
  do HTML. D6 permite as duas; o canvas foi escolhido porque a captura de
  HTML depende de o navegador rasterizar webfont e sombra do mesmo jeito, e o
  Safari do iPhone — o navegador desta audiência — é onde ela falha mais. O
  módulo do desenho é carregado só no toque do botão: quem abre o link para
  *confirmar* nunca baixa esse código.
- **Agenda:** `.ics` montado no pedido, com `VTIMEZONE` de
  `America/Porto_Velho` e `DTSTART;TZID=…`, para o compromisso cair no
  horário certo mesmo num aplicativo que não conheça o fuso. Sem `ORGANIZER`
  e sem `ATTENDEE`: é um arquivo, não um convite de calendário. Duração
  adotada: 3 horas (o cadastro da palestra não tem campo de duração).

### Cookie do dispositivo do titular

```
ingresso_<CODIGO> = sha256(confirmacaoId + ':' + ingressoToken)
HttpOnly · Secure · SameSite=Lax · path=/palestras/c/<CODIGO> · 60 dias
```

O valor é derivado dos dois, e não é nenhum dos dois: se vazar, não serve de
ingresso no check-in; e não há como forjá-lo sem o token, que nunca sai do
servidor a não ser desenhado dentro do QR do próprio titular. A comparação é
em tempo constante.

`Secure` é liberado **apenas** em `NODE_ENV=development`, onde o servidor
local é `http://` e o navegador descartaria o cookie. Preview e produção
exigem HTTPS.

Perder o cookie (aba anônima, limpar dados, trocar de celular) é previsto: o
caminho de volta é `/palestras/ingresso`, e a própria tela de "já utilizado"
aponta para lá.

---

## Recuperação de ingresso

**CPF e código**, dois fatores (D4). Só CPF permitiria enumerar confirmações
a partir de um CPF conhecido — e CPF não é segredo; o código prova que a
pessoa recebeu aquele convite.

Qualquer falha responde a **mesma** mensagem, no mesmo tempo: código mal
formado, código inexistente, convite nunca confirmado e CPF que não confere
são indistinguíveis. A única exceção é a confirmação cancelada, que tem
mensagem própria — ali os dois fatores já bateram, então quem está na tela é
o titular.

Acerto grava o cookie do dispositivo e leva ao ingresso.

---

## Cancelamento pelo convidado

Até 23h59 da véspera, em duas etapas, com aviso explícito de que não pode ser
desfeito. Na mesma transação: o convite vai a `cancelado` e a confirmação
perde `ativa` — o que libera o CPF para outro convite do circuito **sem
apagar histórico**, porque o índice único é parcial.

- Depois do prazo o botão some, e o servidor recusa de novo (a decisão que
  vale é a de dentro da transação).
- Cancelamento repetido é inofensivo: responde sem erro e nada muda.
- O convite **nunca** volta a `disponivel`. Reposição é manual, pelo Admin.
- Cancelar exige o cookie do titular. Sem ele, a resposta não diz sequer se
  existe confirmação.

---

## Limites das rotas públicas

`lib/palestras/limite.ts` (módulo compartilhado; a implementação definitiva é
de `auth-e-papeis`, atrás do mesmo contrato). Os tetos desta change estão em
`lib/palestras/limites-do-convidado.ts`:

| Finalidade | Teto | Janela |
| --- | --- | --- |
| envio do formulário, por IP | 20 | 10 min |
| recuperação de ingresso, por IP | 8 | 15 min |
| códigos inexistentes abertos, por IP | 25 | 15 min |

Os números são generosos de propósito. O público é rural e móvel: uma
operadora pode pôr uma cidade inteira atrás do mesmo endereço (CGNAT), e
barrar o produtor legítimo custa uma presença real. A defesa contra varredura
é o espaço de códigos (31⁶ ≈ 887 milhões); o limite só encarece o ruído.

O bloqueio por varredura vale para o IP inteiro, **inclusive para códigos
válidos** — bloquear só os inexistentes devolveria o oráculo que o bloqueio
existe para fechar.

---

## Testes

```bash
npm test                              # puros: esquema, consentimento, token, QR, .ics
npm run test:integracao:confirmacao   # ESCREVE no banco de DATABASE_URL
```

Com o servidor no ar, a integração também confere o HTML das telas:

```bash
npm run build && npm start &
BASE=http://localhost:3000 npm run test:integracao:confirmacao
```

O que a parte de HTTP prova: nenhum dado do titular no código-fonte da tela
de "já utilizado" (nome, CPF em dígitos e mascarado, WhatsApp, acompanhante,
propriedade, token, QR), HTML idêntico entre código inexistente e convite
cancelado — com um **controle** comparando dois códigos inexistentes entre si,
para a comparação significar algo —, medianas de tempo equivalentes, `.ics`
respondendo 404 sem o cookie, `noindex` nas duas rotas e as rotas fora do
`sitemap.xml`.

Tudo que o teste cria leva o prefixo `[TESTE-CONF]` e é removido no fim —
menos a auditoria, imutável por contrato.

> **Não aponte `DATABASE_URL` para produção ao rodar a integração.**

---

## Mapa dos arquivos

```
app/palestras/
  c/[codigo]/
    page.tsx              roteamento por estado, piso de tempo, bloqueio de varredura
    formulario.tsx        formulário (cliente): máscaras, teclado numérico, checkboxes
    ingresso.tsx          ingresso (cliente): QR, ações, cancelamento em duas etapas
    desenho.ts            canvas da imagem do ingresso, carregado sob demanda
    acoes.ts              Server Actions: confirmar e cancelar
    titular.ts            cookie do dispositivo do titular
    agenda.ics/route.ts   arquivo de calendário
  ingresso/
    page.tsx formulario.tsx acoes.ts    recuperação por CPF + código

components/palestras/
  publico.tsx             topo, coluna, rodapé público (política + encarregado)
  estados.tsx             telas de estado — SEM prop de dado pessoal

lib/palestras/
  confirmacao.ts          vocabulário puro: atividades, máscaras, mensagens
  confirmacao-esquema.ts  esquema Zod (só servidor: mantém o Zod fora do navegador)
  consentimento.ts        textos aprovados (D9b) + marcadores
  configuracao.ts         leitura de `palestra_configuracao`, com padrão em código
  ingresso.ts             token, QR, impressão do dispositivo
  ingresso-agenda.ts      montagem do `.ics`
  limites-do-convidado.ts tetos das rotas públicas
  requisicao.ts           IP, agente de usuário, piso de tempo
  servicos/confirmacao.ts domínio: confirmar, cancelar, recuperar, montar ingresso
```

Migrações desta change: `0003_limite_e_configuracao.sql` (tabelas
`palestra_limite` e `palestra_configuracao`) e
`0004_evidencia_de_consentimento.sql` (colunas `aceite_politica_texto` e
`aceite_comunicacoes` em `palestra_confirmacao`).

---

## Critérios de aceite do PRD · `confirmacao-convidado`

Os sete critérios da seção `confirmacao-convidado` do PRD, conferidos um a um
contra o banco Neon e contra o servidor rodando localmente.

### 1. Link disponível abre o formulário; CPF inválido é recusado com mensagem clara

**Atendido.** Convite `disponivel` no prazo abre os dados da palestra e o
formulário com os sete campos. CPF com dígito verificador errado é recusado
apontando o campo, com "CPF inválido: confira os números digitados", e
**nada é gravado** — conferido no banco: nenhuma confirmação criada e o
convite ainda `disponivel`. A mesma regra roda no servidor quando o
navegador é contornado.

### 2. Após confirmar, o mesmo link em outro dispositivo mostra "convite já utilizado" sem dados do titular

**Atendido**, e verificado no **código-fonte** da página, não só na tela: o
HTML servido a quem não tem o cookie do titular não contém o nome, o CPF (em
dígitos nem mascarado), o WhatsApp, a propriedade, o nome do acompanhante, o
`ingresso_token` nem qualquer `data:image` de QR. O componente da tela não
tem prop por onde esses dados passariam.

### 3. Dois envios simultâneos no mesmo link resultam em uma só confirmação

**Atendido.** Cinco rodadas de envio simultâneo com CPFs diferentes: em todas,
exatamente uma confirmação ativa no banco e o perdedor com "convite já
utilizado". E, com a escrita concorrente segurada sem commit — para a
pré-checagem da aplicação passar —, quem recusa é a trava de linha.

### 4. CPF já confirmado em qualquer palestra é recusado em outro link; depois de um cancelamento, o mesmo CPF volta a poder confirmar

**Atendido.** A recusa não diz em qual palestra o CPF está confirmado. Sob
concorrência (cinco rodadas do mesmo CPF em convites diferentes), sempre uma
única confirmação ativa; com a escrita segurada sem commit, quem recusa é o
índice `palestra_confirmacao_cpf_ativa_idx`, com `23505`. Depois de cancelar,
o mesmo CPF confirma em outro convite.

### 5. Ingresso mostra QR, titular, acompanhante e dados da palestra; pode ser salvo como imagem e adicionado à agenda

**Atendido**, com uma ressalva. O ingresso traz QR (`data:` URI), titular,
acompanhante, cidade, data, horário, local, endereço e o aviso de que vale
para duas pessoas. O `.ics` responde `text/calendar` com
`DTSTART;TZID=America/Porto_Velho`, local e endereço, e sem dado pessoal.
**Ressalva:** o salvamento como imagem está implementado e tem plano B na
tela, mas não foi exercitado em iPhone e Android reais.

### 6. Convidado cancela até a véspera; depois do prazo o botão some e a confirmação fica bloqueada

**Atendido.** Dentro do prazo, o cancelamento em duas etapas leva o convite a
`cancelado` e a confirmação a `ativa = false`, com data, hora e autoria
gravadas e o registro original preservado. Depois do prazo o botão não é
exibido **e** o servidor recusa, deixando a confirmação ativa. Cancelamento
repetido responde sem erro e não muda nada; convite cancelado não aceita nova
confirmação e nunca volta a `disponivel`.

### 7. Aceite da política é obrigatório e fica registrado com versão, data e IP

**Atendido.** Caixa desmarcada por padrão; envio sem aceite é recusado no
servidor, mesmo contornando o navegador. A confirmação grava data e hora do
aceite, versão `3.0`, o texto exibido, IP, agente de usuário e o opt-in de
comunicações — este último independente do obrigatório, conferido nos dois
sentidos.

### Fora dos sete, mas verificado porque a spec pede

- Código inexistente e convite cancelado devolvem HTML **idêntico**, mesmo
  status e medianas de tempo a 4 ms de distância.
- O `.ics` responde 404 sem o cookie do titular, exista o código ou não, para
  não virar detector de códigos válidos.
- A recuperação exige CPF **e** código, com resposta neutra em qualquer falha,
  e recusa ingresso de confirmação cancelada com mensagem própria.
- A auditoria registra a confirmação sem CPF completo (só mascarado) e sem
  token.
- `noindex` nas duas rotas públicas novas, e nenhuma delas no `sitemap.xml`.
- Convite `presente` continua mostrando o ingresso ao titular, marcado como
  utilizado e sem oferecer cancelamento.

---

## O que falta

- **Validação das telas com a cliente no preview** (tarefa 1.6) e o ensaio
  com uma palestra de teste (10.5): dependem de gente, não de código.
- **Salvar como imagem em iOS e Android reais** (6.5): implementado e com
  plano B na tela (a imagem gerada aparece para salvar com toque longo, e há
  aviso se o navegador recusar), mas não exercitado em aparelho.
- **Eliminação a pedido do titular** (spec `consentimento-lgpd`): a regra está
  escrita, a tela do Admin é de `painel-colaborador`.
- **Prazo de retenção com o DPO** (D9c): recomendado antes da primeira
  palestra. Enquanto não houver definição, vale o indeterminado.
- **Rodapé jurídico da promoção**: continua em aberto no design — se as
  páginas públicas precisam do mesmo rodapé exigido nas artes do Acelera no
  Campo 3.0, além do rodapé de privacidade.
