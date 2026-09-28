# Acesso e papéis — change `auth-e-papeis`

Login, papéis, escopo e travas de segurança do módulo `/palestras`.
Complementa [`MODULO-PALESTRAS.md`](./MODULO-PALESTRAS.md), que documenta a
base entregue por `fundacao`.

O que esta change entrega:

- Quatro métodos de login em `/palestras/entrar`.
- A matriz de permissões do PRD aplicada no servidor, com escopo por vínculo.
- Sessões com duração por papel e desativação com efeito imediato.
- Bloqueio por tentativas, por identificador e por IP.
- E-mails transacionais pelo Resend, com templates em React Email.
- **Remoção** do guard provisório `ADMIN_PREVIEW_TOKEN` de `fundacao`.

---

## Os quatro métodos

| Método | Identificador | Quem pode usar | Validade |
| --- | --- | --- | --- |
| Senha | e-mail **ou** CPF + senha | todos com senha definida | — |
| Link mágico | e-mail | todos com e-mail | 15 min, uso único |
| Código por CPF | CPF → código de 6 dígitos no e-mail vinculado | todos com e-mail | 10 min, 5 tentativas |
| CPF + nascimento | CPF + data de nascimento | **só** colaborador e recepção | — |

Os dois primeiros são nativos do Better Auth. Os dois últimos são plugins
deste projeto (`lib/palestras/auth-plugins/`), porque em nenhum dos dois o
identificador digitado é um e-mail — é o CPF.

### Por que o CPF + nascimento existe, e por que é restrito

Parte dos colaboradores de loja no interior de Rondônia não tem e-mail
corporativo, e é esse grupo que distribui os convites. Um sistema que só
saiba autenticar por e-mail deixa de fora justamente quem opera a
distribuição.

Em troca, o método carrega três travas: vale só para `colaborador` e
`recepcao`, dura 12 horas como qualquer sessão desses papéis, e está sujeito
ao mesmo bloqueio por tentativas dos demais.

A verificação do papel acontece **depois** de resolver o usuário. Um gerente
que digite o próprio CPF e a própria data de nascimento, ambos corretos, é
recusado — e a recusa é byte a byte igual à de dados errados. Recusar antes
de resolver seria mais barato e diria ao atacante que aquele CPF é de um
gerente.

**Risco residual aceito:** quem souber o CPF e a data de nascimento de um
colaborador entra como ele. Não há como evitar isso mantendo o método. O que
limita o dano é o escopo estreito do colaborador e o CPF de convidado sempre
mascarado para ele.

---

## Respostas neutras

CPF inexistente, CPF sem e-mail, senha errada, e-mail não cadastrado, usuário
desativado, papel de gestão tentando o método fraco: **a mesma resposta**. A
base é a lista nominal de funcionários de uma empresa; confirmar a existência
de um cadastro é vazamento, não conveniência.

As frases estão em `lib/palestras/mensagens-de-acesso.ts`, num módulo puro
porque `tests/acesso.test.ts` varre cada uma delas atrás de expressões que
denunciariam um cadastro.

**A única exceção é deliberada e está na spec:** o e-mail mascarado
(`m*****@gmail.com`) exibido no fluxo de código por CPF. Sem ele a pessoa não
sabe em que caixa procurar. Só aparece depois de o CPF ser aceito, o número
de asteriscos é fixo (não denuncia o comprimento do endereço), e o par
(CPF, e-mail mascarado) viaja num cookie **assinado** entre as duas telas —
sem a assinatura, bastaria editar o cookie para transformar a tela num
verificador de cadastro.

---

## A matriz de permissões

`lib/palestras/papeis.ts` transcreve a tabela "Papéis e permissões" do PRD
célula a célula, como **dado**. `tests/papeis.test.ts` tem um caso por linha
da tabela, com o texto da linha no nome do teste: dá para ler o PRD e o teste
em paralelo.

Nenhuma célula é "sim" ou "não": toda permissão carrega um **alcance**
(`nenhum`, `proprios`, `loja`, `regional`, `palestra`, `todos`). É a
diferença entre "o gerente de loja pode ver convites" e "o gerente de loja
pode ver os convites da loja dele" — a primeira afirmação, sozinha, já é um
vazamento.

---

## Autorização em duas camadas

### 1. Middleware (`middleware.ts`)

Resolve a sessão, confirma que o usuário continua ativo e barra por papel.
Consulta o banco direto pelo transporte HTTP do Neon — é Edge Runtime, e
trazer o Better Auth para cá arrastaria o adaptador do Drizzle e o pool por
WebSocket para dentro do bundle.

| Prefixo | Papéis |
| --- | --- |
| `/palestras/painel` | todos os autenticados |
| `/palestras/painel/convites` | admin, gerentes, colaborador |
| `/palestras/painel/equipe` | admin e gerentes |
| `/palestras/admin` | admin |
| `/palestras/checkin` | admin e recepção |
| `/palestras/relatorios` | admin, gerentes, recepção |

**`/palestras/admin` responde 404 para quem não tem sessão**, herdado de
`fundacao` e mantido de propósito: um 401 ou um redirecionamento para o login
confirmariam que existe uma área administrativa ali. Quem **tem** sessão e
não é Admin recebe 403 — a essa altura a existência da rota já não é segredo,
e um 404 para quem está logado só geraria chamado de suporte.

O 403 é status HTTP de verdade, não um 200 com cara de erro: o middleware
reescreve para `/palestras/sem-acesso`, que chama `forbidden()` e renderiza
`app/forbidden.tsx`. Exige `experimental.authInterrupts` no `next.config.ts`.

### 2. Escopo na consulta (`lib/palestras/dados.ts`)

É esta que realmente protege. O middleware não sabe se o convite `K7Q2MX`
pertence ao colaborador que o pediu; a consulta sabe.

**Toda função de acesso a dados de domínio recebe o escopo como primeiro
parâmetro, sem valor padrão.** Não é convenção de revisão de código: é a
assinatura da função. Esquecer o escopo não compila.

O escopo vem do vínculo: regional para `gerente_regional`, loja para
`gerente_loja` e `colaborador`, autoria do convite para o colaborador, sem
limite para `admin`. Um gerente de loja **sem** loja vinculada não enxerga "a
loja nula" — `escopoCompleto()` o barra, e o problema aparece como cadastro
incompleto em vez de vazamento.

As consultas administrativas de `lib/palestras/consultas.ts` também recebem
escopo, e exigem o papel `admin`: alimentam telas que só existem para ele.

---

## CPF mascarado na camada de dados

O CPF completo do convidado é visível **apenas para o Admin**. A máscara é
aplicada **no SQL**, não na tela:

```sql
'***.' || substr(cpf, 4, 3) || '.' || substr(cpf, 7, 3) || '-**'
```

O `select` de quem não é Admin não traz a coluna `cpf` — traz a expressão que
já devolve `***.456.789-**`. Assim o valor completo não sai nem do Postgres,
e nenhuma tela nova pode vazá-lo por esquecer de mascarar: não há o que
esquecer, o dado não chega.

A recepção tem um tipo de retorno **próprio** (`ConfirmadoParaRecepcao`), com
titular, acompanhante e CPF mascarado — e mais nada. Não é um filtro sobre o
tipo maior: com o mesmo tipo, bastaria alguém passar o objeto inteiro para um
componente para o WhatsApp do convidado aparecer na tela da portaria.

---

## Sessões

| Papel | Duração |
| --- | --- |
| colaborador, recepção | 12 horas |
| admin, gerente regional, gerente de loja | 7 dias |

A duração é gravada na linha de `session` pelo gatilho
`databaseHooks.session.create.before`, um ponto único por onde passam os
quatro métodos. O mesmo gatilho **recusa a criação de sessão para usuário
desativado**, devolvendo `false` — é o que faz a desativação valer para todos
os métodos sem quatro cópias da regra.

A sessão **não é rolante**: `updateAge` igual a `expiresIn` desliga a
renovação por atividade. "12 horas" quer dizer 12 horas desde o login, não 12
horas desde o último clique.

O cookie é `HttpOnly`, `SameSite=Lax`, `Secure` em produção, e o teto dele é
o maior dos dois prazos. A duração de verdade é a da linha em `session`: um
cookie que sobrevive à sessão não dá acesso nenhum, e o middleware o apaga na
requisição seguinte.

**Desativação com efeito imediato:** o estado `ativo` é lido a cada
requisição autenticada — pelo middleware e de novo por `sessaoAtual()`. O
cache de sessão em cookie do Better Auth está **desligado** por causa disso:
ele evitaria uma leitura por requisição e faria a desativação demorar até o
cache vencer.

**Sair de todos os dispositivos** está no cabeçalho de toda tela autenticada,
ao lado do "Sair". Os dois são Server Actions (POST com verificação de
origem), não links: sair por `GET` é disparável por um `<img>` numa página de
terceiro.

---

## Bloqueio por tentativas

| Trava | Teto | Janela |
| --- | --- | --- |
| Login por identificador | 5 | 15 min |
| Login por IP | 20 | 15 min |
| Envio de código/link por identificador | 3 | 10 min |
| Envio por IP | 10 | 10 min |
| Intervalo mínimo entre envios | 1 | 60 s |

**O limiar por IP é maior que o por identificador**, e isso não é folga: uma
loja inteira sai pelo mesmo IP. Com o mesmo teto de 5, três colegas errando a
senha uma vez cada bloqueariam a loja toda. Vinte tentativas continuam sendo
um número que ninguém alcança digitando de boa-fé, e ainda contêm varredura —
quem tenta CPFs diferentes esgota o limite do IP antes de encostar no segundo
CPF.

O bloqueio conta 15 minutos da **última** tentativa, não da primeira. Com a
primeira como âncora, quem errasse uma vez no minuto 0 e mais quatro no
minuto 14 sairia do bloqueio 60 segundos depois.

Um login bem-sucedido zera o contador **do identificador**, e não o do IP: um
acerto não pode apagar o rastro de uma varredura que acertou uma vez em dez.

A implementação definitiva é a tabela `palestra_limite` no Neon (D7 do
design), atrás da mesma interface que `confirmacao-convidado` criou —
`verificarLimite`, `registrarTentativa`, `limparTentativas`. As rotas
públicas do convidado não mudaram uma linha. A varredura de limpeza roda na
carona da rotina diária de expiração.

**A chave do identificador não guarda o identificador.** Um CPF tem 11
dígitos: um hash simples seria quebrado por força bruta em segundos, e
guardá-lo em claro poria uma lista de CPFs numa tabela operacional. A chave é
um HMAC com o segredo da aplicação.

---

## Registro das tentativas

Toda tentativa malsucedida e todo bloqueio vão para `palestra_auditoria`
(`acesso.recusado`, `acesso.bloqueado`, `acesso.efetuado`, `acesso.envio`)
com identificador **mascarado**, método, IP, motivo e hora. Nunca a senha, o
código ou a data de nascimento informados — e `limparPayload` remove esses
campos mesmo que alguém os passe por engano daqui a seis meses.

A recusa por papel e a recusa por dados errados registram o **mesmo** motivo.
Se a trilha distinguisse, a distinção existiria — e bastaria acesso à
auditoria para transformá-la num verificador de cadastro.

---

## E-mails transacionais

Resend + React Email, remetente em `agpremium.com.br` (`EMAIL_FROM`). Três
templates: link mágico, código de acesso e definição/redefinição de senha.

- **Nenhum carrega CPF completo, senha ou dado de convidado.** A conferência
  não é só de revisão de código: `conteudoProibido()` varre o HTML já
  renderizado no ponto de envio, e um e-mail reprovado não sai.
- **Sem imagem remota.** O selo do circuito só existe em `.webp`, que o
  Outlook não abre, e o único `.png` está no pacote do PDF, sem URL pública.
  Como o selo carrega as marcas dos patrocinadores e não pode ser recortado
  nem distorcido, um selo que falha em metade das caixas de entrada é pior
  que nenhum: o cabeçalho é tipográfico.
- **Falha de envio nunca derruba a aplicação.** Sem `RESEND_API_KEY`, com a
  chave errada ou com o provedor fora do ar, a função devolve resultado
  negativo e registra o erro; o usuário vê a mesma mensagem neutra de sempre,
  e quem tem senha ou CPF + nascimento continua entrando.

`@react-email/render` e `@react-email/components` estão em
`serverExternalPackages` no `next.config.ts`. Sem isso, a condição
`react-server` que o App Router aplica resolve `react-dom/server` para um
módulo que **lança** — e nenhum e-mail sairia.

---

## O guard provisório saiu

`ADMIN_PREVIEW_TOKEN` não existe mais no código nem na validação de
configuração. Removidos: `lib/palestras/guard.ts`,
`app/palestras/admin/acesso/route.ts` e a constante `ADMIN_PROVISORIO` de
`lib/palestras/auditoria.ts` (substituída por `ATOR_DE_SCRIPT`, para os
scripts de linha de comando, e por `TENTATIVA_DE_ACESSO`, para as tentativas
de acesso sem usuário identificado).

**Falta a etapa humana:** remover a variável do painel da Vercel, em todos os
ambientes. Enquanto ela estiver lá, é só uma variável sem leitor — mas um
segredo esquecido em configuração é um segredo que alguém, um dia, tenta
reaproveitar.

---

## Mapa dos arquivos desta change

```
middleware.ts                       sessão, estado ativo e papel por rota

app/
  forbidden.tsx                     403 com status HTTP de verdade
  palestras/
    sem-acesso/                     destino da recusa por papel; chama forbidden()
    entrar/
      layout.tsx                    casca com o selo do circuito
      page.tsx                      as quatro abas
      formularios.tsx               formulários (client)
      acoes.ts                      Server Actions das telas
      codigo/                       segundo passo do código por CPF
      link/                         destino do link mágico
      senha/                        pedir redefinição
      senha/nova/                   definir a senha com o token
    painel/                         início por papel, com atalhos da matriz

lib/palestras/
  auth.ts                           instância do Better Auth
  auth-plugins/
    comum.ts                        código, impressão HMAC, comparação constante
    otp-por-cpf.ts                  plugin do código de 6 dígitos
    cpf-e-nascimento.ts             plugin da credencial fraca
  sessao.ts                         sessaoAtual, exigirPapel, exigirAcao
  papeis.ts                         matriz do PRD, métodos e duração por papel
  escopo.ts                         objeto de escopo e decisão de acesso (puro)
  dados.ts                          consultas com escopo obrigatório e máscara
  limite.ts                         implementação definitiva do limite
  limite-politicas.ts               tetos e janelas (puro)
  mensagens-de-acesso.ts            frases neutras (puro)
  mascaras.ts                       e-mail e CPF da recepção (puro)
  destino.ts                        guarda contra redirecionamento aberto (puro)
  pendencia-de-codigo.ts            cookie assinado entre as duas telas do código
  acoes-de-sessao.ts                sair e sair de todos os dispositivos
  email/
    base.tsx                        casca dos e-mails
    modelos.tsx                     os três templates
    enviar.ts                       Resend + falha neutra + registro
    conteudo-proibido.ts            guarda de CPF e senha no corpo (puro)
  servicos/autenticacao.ts          travas, respostas neutras e registro

components/palestras/barra-da-sessao.tsx   quem está logado e como sair

tests/papeis.test.ts                uma linha da matriz do PRD por teste
tests/escopo.test.ts                escopo, recusa fora do escopo, máscaras
tests/limite.test.ts                políticas e janela de bloqueio
tests/acesso.test.ts                neutralidade, código, destino pós-login

scripts/integracao-acesso.ts        os quatro métodos contra o banco real
```

---

## Testes

```bash
npm test                  # puros
npm run test:acesso       # os quatro métodos, ESCREVE no banco
npm run test:integracao   # inclui escopo, máscara e desativação
```

`npm run test:acesso` exercita o que teste puro não alcança: o adaptador do
Drizzle, os dois plugins, o gatilho de criação de sessão e a restrição de
método por papel verificada depois de resolver o usuário. Ele neutraliza a
chave do Resend antes de qualquer import, para não disparar e-mail para os
endereços `@exemplo.test`.

> **Não aponte `DATABASE_URL` para produção ao rodar qualquer um dos dois.**

---

## Critérios de aceite do PRD · `auth-e-papeis`

Conferidos em 28/09/2026 contra o banco Neon e o servidor de produção local.

### 1. Login por senha, link mágico, OTP por CPF e CPF + nascimento funcionam; e-mails saem pelo Resend

**Atendido nos quatro métodos**, por `npm run test:acesso`: senha definida
por link de uso único e login com ela; link mágico que abre sessão e recusa o
segundo uso; código de 6 dígitos com e-mail mascarado, uso único, invalidação
do anterior, recusa por expiração e por cinco erros; CPF + nascimento aceito
para colaborador.

O envio pelo Resend foi verificado pela renderização dos três templates no
servidor de produção (4.469 bytes de HTML e 590 de texto alternativo para o
código de acesso). **Pendente de etapa humana:** SPF, DKIM e DMARC no domínio
e um disparo real de conferência.

### 2. CPF + nascimento é recusado para Admin e gerentes

**Atendido.** Um gerente de loja com CPF e data de nascimento **corretos** é
recusado, e a resposta é idêntica — `{"entrou":false}` nos dois casos — à de
uma data errada. Nenhuma sessão nasce.

### 3. Cinco tentativas erradas bloqueiam por 15 minutos

**Atendido.** Quatro tentativas ainda permitem a quinta; a quinta bloqueia,
com liberação em cerca de 15 minutos; um sucesso zera o contador daquele
identificador. O bloqueio expira sozinho.

### 4. Cada papel vê apenas o escopo da matriz; acesso fora do escopo por URL retorna 403

**Atendido.** Conferido por HTTP, com sessão real de cada um dos cinco
papéis, contra o servidor de produção local:

| Rota | Admin | Ger. Regional | Ger. Loja | Colaborador | Recepção |
| --- | --- | --- | --- | --- | --- |
| `/palestras/admin` | 200 | 403 | 403 | 403 | 403 |
| `/palestras/admin/organizacao` | 200 | 403 | 403 | 403 | 403 |
| `/palestras/admin/gerar` | 200 | 403 | 403 | 403 | 403 |
| `/palestras/admin/importar/modelo` | 200 | 403 | 403 | 403 | 403 |
| `/palestras/painel` | 200 | 200 | 200 | 200 | 200 |
| `/palestras/checkin` | passa | 403 | 403 | 403 | passa |
| `/palestras/relatorios` | passa | passa | passa | **403** | passa |

("passa" = o papel atravessa a barreira e a rota ainda não existe; ela vem
com `operacao-evento`.)

Por **identificador em requisição**, e não por URL: o PDF de um colaborador
pedido com o identificador de outro na query responde 403 para todos os
papéis menos o Admin.

### 5. Usuário desativado é desconectado na próxima requisição

**Atendido.** A mesma sessão que respondia 200 em `/palestras/painel` passa a
307 para `/palestras/entrar?aviso=desativado` na requisição seguinte à
desativação, sem esperar a sessão expirar.

### Verificado além dos critérios

- Nenhuma rota administrativa responde mais ao `ADMIN_PREVIEW_TOKEN`, nem por
  cookie `palestras_admin` nem pelo header `x-admin-preview-token`: as duas
  formas devolvem a mesma 404 de endereço inexistente.
- O CPF completo do convidado não aparece em resposta nenhuma para
  colaborador, gerente de loja, gerente regional ou recepção — verificado
  serializando a resposta inteira e procurando os 11 dígitos.
- A recepção não recebe WhatsApp, cidade, propriedade nem atividade.
- `/palestras/entrar?destino=https://site-falso.com` não redireciona para
  fora: o destino é filtrado por lista de permissão.
