# PRD · Confirmação de Presença · Circuito de Palestras Acelera no Campo 3.0

Sep 28, 2026 · @Premium

## Visão geral

O sistema controla os convites do Circuito de Palestras Acelera no Campo 3.0: cada convite é um link único, vinculado a uma palestra, que trava no CPF do primeiro convidado que confirmar e gera um QR Code de entrada para duas pessoas (titular e acompanhante).

**Contexto.** O circuito é uma extensão da promoção Acelera no Campo 3.0 da Nossa Lavoura: quatro palestras técnicas gratuitas em Rondônia, em outubro de 2026, para produtores. Palestrantes: Giovani Pastre, da Virbac, e Ricardo Arantes.

**Problema.** Todas as peças de convite dependem de um link de confirmação que ainda não existe. O convite é pessoal e intransferível, a confirmação é obrigatória e a distribuição acontece pelo WhatsApp dos colaboradores das lojas.

**Objetivo.** Permitir que o Admin gere lotes de links por colaborador e por palestra, que o colaborador distribua pelo WhatsApp, que o produtor confirme com CPF e que a equipe valide a entrada no evento.

**Premissas.**

- Convite aberto: o link não nasce nominal; o CPF é travado na confirmação.
- Sem cotas formais: o Admin define a quantidade de links a cada geração (colaborador X recebe 10, Y recebe 20).
- Convidado não precisa ser cliente das lojas.
- Sem lembretes manuais ou automáticos, sem lista de espera, sem controle de capacidade do local.
- Público usuário na casa de 390 colaboradores (cerca de 39 lojas com 10 colaboradores cada).

## Escopo

**Entra nesta versão**

- Cadastro de palestras (local, cidade, data, horário, prazo de confirmação).
- Estrutura organizacional Regional, Loja e Colaborador, com importação em massa por CSV a partir de um modelo baixável.
- Controle de acesso por papéis, com login por senha, link mágico, OTP por e-mail e CPF + data de nascimento.
- Geração de lotes de links pelo Admin (colaborador + palestra + quantidade).
- PDF por colaborador com os links em texto e botão "Enviar via WhatsApp" clicável.
- Painel do colaborador: links disponíveis, confirmados, cancelados e expirados, botão de envio pelo WhatsApp e cancelamento.
- Página pública de confirmação: CPF, dados do convidado, nome do acompanhante, aceite da política de privacidade, QR Code de entrada.
- Cancelamento pelo convidado e pelo colaborador, até a véspera do evento.
- Check-in por leitura de QR no celular da equipe, com busca manual por CPF ou nome como contingência.
- Lista de confirmados para impressão e exportação CSV.

**Fica fora**

- Lembretes e notificações ao convidado (WhatsApp API, SMS ou e-mail).
- Cotas persistentes por colaborador ou por loja.
- Controle de capacidade dos locais e lista de espera.
- Convite nominal (CPF definido pelo colaborador antes do envio).
- Validação do convidado contra a base de clientes da Nossa Lavoura.
- Geração de links por gerentes (somente o Admin gera).

## Palestras

Quatro palestras, cada uma com prazo de confirmação e cancelamento até 23h59 da véspera, no fuso America/Porto\_Velho (UTC-4). Depois do prazo, links não usados expiram.

| Cidade | Data | Horário | Local | Prazo de confirmação |
| --- | --- | --- | --- | --- |
| Vilhena | 13/10/2026 (terça) | 19h | Degustare Restaurante, Av. Major Amarante, 4360 | 12/10, 23h59 |
| Espigão d'Oeste | 14/10/2026 (quarta) | 19h | Casarão Eventos e Reuniões, Av. 7 de Setembro, 145 | 13/10, 23h59 |
| Ji-Paraná | 15/10/2026 (quinta) | 19h | Espaço Imagem Eventos, Av. JK, 1711, Casa Preta | 14/10, 23h59 |
| Porto Velho | 17/10/2026 (sábado) | 10h30 | Restaurante O Compadre, BR 364, Km 04 | 16/10, 23h59 |

As palestras são cadastradas pelo Admin, não ficam fixas no código. O prazo é calculado automaticamente a partir da data, com possibilidade de ajuste manual por palestra.

## Papéis e permissões

Cinco papéis, todos criados e atribuídos pelo Admin. Só o Admin gera links; os gerentes enxergam, mas não produzem convites.

| Ação | Admin | Gerente Regional | Gerente de Loja | Colaborador | Recepção |
| --- | --- | --- | --- | --- | --- |
| Cadastrar palestras | Sim | Não | Não | Não | Não |
| Cadastrar e importar usuários, regionais e lojas | Sim | Não | Não | Não | Não |
| Atribuir papéis | Sim | Não | Não | Não | Não |
| Gerar lotes de links | Sim | Não | Não | Não | Não |
| Baixar PDF de links de um colaborador | Sim | Não | Não | Só os próprios | Não |
| Ver links e confirmações | Todos | Da regional | Da loja | Só os próprios | Não |
| Enviar convite pelo WhatsApp | Sim | Não | Não | Só os próprios | Não |
| Cancelar convite | Todos | Não | Não | Só os próprios | Não |
| Fazer check-in | Sim | Não | Não | Não | Sim |
| Lista de impressão e CSV | Todos | Da regional | Da loja | Não | Por palestra |

**Regras**

- Um usuário tem um papel. O escopo vem do vínculo: Gerente Regional ligado a uma regional, Gerente de Loja e Colaborador ligados a uma loja.
- Recepção vê apenas nome do titular, nome do acompanhante e CPF mascarado (\***.456.789-**).
- Usuário desativado perde o acesso imediatamente; os links dele continuam válidos e passam a ser geridos pelo Admin.

## Autenticação

Quatro métodos de login, com Better Auth sobre o Neon. Os três primeiros dependem de e-mail; o quarto existe para colaboradores sem e-mail.

| Método | Identificador | Quem pode usar | Observação |
| --- | --- | --- | --- |
| Senha | E-mail ou CPF + senha | Todos com senha definida | Senha definida no primeiro acesso ou por redefinição via e-mail |
| Link mágico | E-mail | Todos com e-mail | Link válido por 15 minutos, uso único |
| OTP por CPF | CPF → código de 6 dígitos no e-mail cadastrado | Todos com e-mail | Código válido por 10 minutos, máximo de 5 tentativas |
| CPF + data de nascimento | CPF + data de nascimento | Somente Colaborador e Recepção | Fallback para quem não tem e-mail |

**Por que o CPF + nascimento fica restrito.** CPF e data de nascimento circulam com facilidade e não são segredo. Como o colaborador acessa dados pessoais de convidados, o método ganha travas extras e não vale para papéis com visão ampla.

**Regras de segurança**

- Admin e gerentes entram só por métodos baseados em e-mail (senha, link mágico, OTP).
- Bloqueio de 15 minutos após 5 tentativas erradas por CPF ou por IP.
- Sessão de 12 horas para Colaborador e Recepção; 7 dias para Admin e gerentes, com opção de sair de todos os dispositivos.
- No painel do colaborador, o CPF do convidado aparece mascarado.
- E-mails transacionais (link mágico, OTP, redefinição) saem pelo Resend, no domínio agpremium.com.br.
- O OTP por CPF é uma camada própria: busca o usuário pelo CPF, dispara o código para o e-mail vinculado e exibe o e-mail mascarado na tela (m\*\*\*\*\*@gmail.com).
- Se o CPF informado não tiver e-mail cadastrado, a tela orienta a entrar por CPF + data de nascimento, sem confirmar se o CPF existe para quem não passou nas travas.

## Estrutura organizacional e importação

A hierarquia segue a da Nossa Lavoura: Regional contém Lojas, Loja contém Colaboradores. A carga inicial é feita por um único CSV, baixado como modelo dentro do sistema, preenchido e importado pelo Admin.

**Modelo de CSV (colaboradores.csv)**

```csv
regional,loja_codigo,loja_nome,loja_cidade,nome,cpf,data_nascimento,email,whatsapp,papel
Regional Centro,JPR01,Nossa Lavoura 2 de Abril,Ji-Paraná,João da Silva,123.456.789-09,15/03/1985,joao@email.com,(69) 99999-0000,colaborador
Regional Centro,JPR01,Nossa Lavoura 2 de Abril,Ji-Paraná,Maria Souza,987.654.321-00,02/11/1990,,(69) 98888-1111,gerente_loja
Regional Centro,,,,Carlos Lima,111.444.777-35,20/07/1978,carlos@email.com,(69) 97777-2222,gerente_regional
```

**Regras de importação**

- Separador vírgula, UTF-8, primeira linha com os cabeçalhos exatamente como no modelo.
- Campos obrigatórios: regional, nome, cpf, data\_nascimento, papel. loja\_codigo é obrigatório para gerente\_loja e colaborador.
- Valores aceitos em papel: admin, gerente\_regional, gerente\_loja, colaborador, recepcao.
- CPF validado pelo dígito verificador e aceito com ou sem máscara; data no formato DD/MM/AAAA.
- Regional e loja inexistentes são criadas na hora; existentes são reaproveitadas pelo nome da regional e pelo loja\_codigo.
- CPF já cadastrado atualiza o usuário (upsert), sem duplicar.
- Importação em duas etapas: pré-visualização com contagem de novos, atualizados e linhas com erro (linha e motivo), depois confirmação. Nada é gravado com erro pendente, ou o Admin opta por importar só as linhas válidas.
- Relatório de erros baixável em CSV para correção e reimportação.

Além do CSV, o Admin pode criar, editar e desativar regionais, lojas e usuários pela interface.

## Ciclo de vida do convite

Cada link pertence a uma palestra e a um colaborador, e passa por cinco estados. Presente é o único desfecho que conta como participação; Expirado e Cancelado invalidam o link de vez.

&#91;embedded content: ciclo de vida do convite · 5 estados\]

| Estado | Como chega | O que quem abre o link vê |
| --- | --- | --- |
| Disponível | Admin gera o lote | Formulário de confirmação |
| Confirmado | Convidado informa CPF e dados antes do prazo | Ingresso com QR, dados da palestra, botão de cancelar |
| Presente | Recepção lê o QR no dia da palestra | Ingresso marcado como utilizado |
| Expirado | Prazo da palestra vence com o link ainda disponível | Aviso de convite expirado |
| Cancelado | Convidado, colaborador ou Admin cancela | Aviso de convite cancelado |

**Regras de negócio**

- Um link = uma palestra = um titular + um acompanhante (só o nome). O QR libera as duas pessoas.
- O CPF trava na primeira confirmação. Quem abrir o link depois, com outro dispositivo ou CPF, vê "convite já utilizado" e nenhum dado do titular.
- Cada CPF confirma em uma única palestra do circuito. Um segundo link, da mesma ou de outra palestra, é recusado com o aviso de que aquele CPF já tem presença confirmada no circuito (sem revelar qual palestra). Se o convite for cancelado, o CPF fica livre para confirmar outro.
- Confirmação e cancelamento aceitos até 23h59 da véspera. Depois disso o link disponível expira e o confirmado não pode mais ser cancelado.
- Cancelamento é definitivo: o link não volta a ficar disponível. Para repor o convite, o Admin gera um novo link (ver Pontos em aberto).
- Confirmado sem check-in continua Confirmado após a palestra; o relatório o trata como ausência.
- Check-in só é aceito no dia da palestra e uma única vez; segunda leitura mostra "já utilizado" com o horário do primeiro check-in.

## Fluxos

### 1. Geração de links (Admin)

1. Admin escolhe a palestra, filtra por regional ou loja e seleciona um ou mais colaboradores.
2. Informa a quantidade de links por colaborador (pode variar por pessoa na mesma tela).
3. Sistema gera os links em lote, cada um com código curto e aleatório (ex.: `/palestras/c/K7Q2MX`, 6 caracteres sem ambiguidade como 0/O e 1/I).
4. Links novos aparecem na hora no painel do colaborador e ficam disponíveis para PDF.
5. Admin pode gerar novos lotes a qualquer momento antes do prazo da palestra.

### 2. PDF de distribuição (Admin ou o próprio colaborador)

1. Admin escolhe o colaborador e uma ou mais palestras; colaborador baixa o próprio PDF pelo painel.
2. O PDF traz cabeçalho com a identidade do Acelera no Campo 3.0, nome do colaborador e loja, e um bloco por palestra (cidade, data, horário, local, prazo de confirmação).
3. Cada linha tem o número do convite, o link em texto puro (fácil de copiar) e, à frente, o botão "Enviar via WhatsApp" clicável.
4. O botão abre `https://wa.me/?text=` com a mensagem padrão já preenchida com o link daquele convite.
5. O PDF lista só links Disponíveis no momento da geração e informa a data e hora em que foi gerado.

### 3. Envio pelo WhatsApp (colaborador)

1. No painel, cada link disponível tem os botões "Copiar link" e "Enviar via WhatsApp".
2. O botão usa o mesmo `wa.me` com mensagem padrão; o colaborador escolhe o contato no próprio WhatsApp.
3. Opcionalmente o colaborador marca o link como "enviado" e anota para quem, só para controle dele (não trava nada).

**Mensagem padrão (editável pelo Admin por palestra)**

```markdown
Olá! Você está convidado para o Circuito de Palestras Acelera no Campo 3.0 da Nossa Lavoura.

{cidade} · {data} às {horario}
{local}

Palestras com Giovani Pastre, da Virbac, e Ricardo Arantes.

Convite pessoal e intransferível, válido para você e 1 acompanhante.
Confirme sua presença até {prazo}: {link}

Acelere conhecimento. Acelere resultados. Acelere no Campo.
```

### 4. Confirmação (convidado)

1. Convidado abre o link. Se estiver Disponível, vê os dados da palestra e o formulário.
2. Informa CPF, nome completo, WhatsApp, cidade, nome da propriedade, atividade (corte, leite, cria, outra) e, se quiser, o nome do acompanhante.
3. Marca o aceite da política de privacidade da Nossa Lavoura (obrigatório) e confirma.
4. Sistema valida CPF e prazo, trava o link no CPF e mostra o ingresso: QR Code, nome do titular e do acompanhante, dados da palestra, botão "Salvar ingresso" (imagem) e botão "Adicionar à agenda" (arquivo .ics).
5. O ingresso fica acessível no mesmo link a partir desse dispositivo. Em outro dispositivo, o convidado recupera o ingresso informando o CPF confirmado.

### 5. Cancelamento

1. Convidado: no ingresso, toca em "Não vou poder ir", confirma e o convite passa a Cancelado.
2. Colaborador ou Admin: no painel, cancela um link Disponível ou Confirmado, com motivo opcional.
3. Ambos respeitam o prazo de 23h59 da véspera. O link cancelado nunca volta a valer.

### 6. Check-in (Recepção)

1. Recepção entra no sistema pelo celular e escolhe a palestra do dia.
2. Abre o leitor pela câmera do navegador e aponta para o QR do convidado.
3. Tela mostra verde (válido: nome do titular, do acompanhante, loja e colaborador de origem), amarelo (já utilizado, com horário) ou vermelho (cancelado, expirado ou de outra palestra).
4. Contingência: busca por CPF ou nome, com o mesmo botão de check-in, e lista impressa de confirmados.

## Telas e rotas

Tudo vive sob `/palestras` no domínio 45anosnossalavoura.agpremium.com.br, no mesmo projeto Next.js da landing page. Páginas públicas são mobile first; painéis funcionam no celular e no desktop.

| Rota | Tela | Acesso |
| --- | --- | --- |
| `/palestras` | Apresentação do circuito com as 4 palestras (sem formulário) | Público |
| `/palestras/c/[codigo]` | Confirmação, ingresso ou aviso de estado do link | Público |
| `/palestras/ingresso` | Recuperar ingresso informando CPF + código do link | Público |
| `/palestras/entrar` | Login com abas: senha, link mágico, código por CPF, CPF + nascimento | Público |
| `/palestras/painel` | Início conforme o papel: números da palestra e atalhos | Autenticado |
| `/palestras/painel/convites` | Lista de links com filtros (palestra, estado), copiar, WhatsApp, cancelar, baixar PDF | Colaborador e acima |
| `/palestras/painel/equipe` | Visão por regional e loja: links gerados, confirmados, cancelados, presentes | Gerentes e Admin |
| `/palestras/admin/palestras` | CRUD de palestras, prazo, mensagem padrão do WhatsApp | Admin |
| `/palestras/admin/usuarios` | CRUD de regionais, lojas e usuários, papéis, desativação | Admin |
| `/palestras/admin/importar` | Baixar modelo CSV, enviar arquivo, pré-visualizar, confirmar | Admin |
| `/palestras/admin/gerar` | Geração de lotes por palestra e colaborador | Admin |
| `/palestras/admin/pdf` | PDF por colaborador (ou em lote, um arquivo por colaborador em .zip) | Admin |
| `/palestras/checkin` | Leitor de QR e busca manual | Recepção e Admin |
| `/palestras/relatorios` | Lista para impressão e exportação CSV | Conforme a matriz de papéis |

**Mockups esperados na etapa MOCKUP:** confirmação (formulário e ingresso), estados inválidos do link, login, painel do colaborador, geração de lotes, check-in (três resultados) e o PDF.

## Modelo de dados

Postgres no Neon com Drizzle ORM. As tabelas de autenticação (user, session, account, verification) seguem o esquema do Better Auth; as demais usam o prefixo `palestra_` para não colidir com o que já existe no projeto da landing.

| Tabela | Campos principais | Observações |
| --- | --- | --- |
| `palestra_regional` | id, nome, ativo | Nome único |
| `palestra_loja` | id, regional\_id, codigo, nome, cidade, ativo | codigo único |
| `user` (Better Auth, estendida) | id, nome, email?, cpf, data\_nascimento, whatsapp, papel, regional\_id?, loja\_id?, ativo | cpf único; email opcional e único quando presente |
| `palestra_evento` | id, slug, cidade, data\_hora, local\_nome, local\_endereco, prazo\_confirmacao, mensagem\_whatsapp, ativo | prazo calculado (véspera 23h59) e editável |
| `palestra_lote` | id, evento\_id, colaborador\_id, quantidade, criado\_por, criado\_em | Rastro de cada geração |
| `palestra_convite` | id, codigo, evento\_id, colaborador\_id, lote\_id, estado, enviado\_para?, criado\_em, cancelado\_em?, cancelado\_por?, motivo\_cancelamento? | codigo único; estado: disponivel, confirmado, presente, expirado, cancelado |
| `palestra_confirmacao` | id, convite\_id, cpf, nome, whatsapp, cidade, propriedade, atividade, acompanhante\_nome?, ativa, aceite\_politica\_em, aceite\_politica\_versao, ip, user\_agent, ingresso\_token, confirmado\_em | Uma por convite; uma ativa por CPF |
| `palestra_checkin` | id, convite\_id, feito\_por, feito\_em, metodo (qr ou manual) | Um por convite |
| `palestra_importacao` | id, arquivo\_nome, total, criados, atualizados, erros\_json, feito\_por, feito\_em | Histórico de cargas CSV |
| `palestra_auditoria` | id, ator\_id?, acao, entidade, entidade\_id, dados\_json, criado\_em | Toda ação sensível |

**Restrições importantes**

- Índice único parcial em `palestra_confirmacao (cpf) WHERE ativa` para que cada CPF tenha uma única confirmação ativa no circuito inteiro. A coluna booleana ativa passa a falso quando o convite é cancelado, liberando o CPF.
- Mudança de estado do convite sempre em transação com trava de linha (`SELECT ... FOR UPDATE`), para que dois cliques simultâneos no mesmo link não confirmem dois CPFs.
- Expiração calculada na leitura (disponível + prazo vencido = expirado) e consolidada por um cron diário da Vercel, sem depender só do job.
- `ingresso_token` é aleatório de 32 bytes, é o conteúdo do QR e nunca expõe CPF.
- CPF armazenado só com dígitos.

## Relatórios

Dois formatos por palestra, respeitando o escopo de cada papel: lista impressa para a recepção e CSV para análise.

**Lista para impressão** (página própria com CSS de impressão, A4 retrato)

- Cabeçalho com palestra, cidade, data, horário, local e total de confirmados e de pessoas (titulares + acompanhantes).
- Ordem alfabética pelo nome do titular.
- Colunas: nº, titular, CPF mascarado, acompanhante, loja, colaborador, caixa para marcar presença à mão.
- Rodapé com data e hora da geração e numeração de página.

**Exportação CSV** (UTF-8 com BOM, separador ponto e vírgula para abrir direto no Excel em pt-BR)

| Coluna | Conteúdo |
| --- | --- |
| palestra | Cidade e data |
| codigo\_convite | Código curto do link |
| estado | disponivel, confirmado, presente, expirado ou cancelado |
| regional, loja, colaborador | Origem do convite |
| titular\_nome, titular\_cpf, titular\_whatsapp | CPF completo só para Admin |
| cidade, propriedade, atividade | Dados do convidado |
| acompanhante\_nome | Quando houver |
| confirmado\_em, checkin\_em, cancelado\_em | Datas e horas |

**Números no painel:** por palestra e por loja, links gerados, confirmados, presentes, cancelados e expirados, com taxa de confirmação (confirmados ÷ gerados) e taxa de comparecimento (presentes ÷ confirmados).

## LGPD e segurança

O sistema adota a [Política de Privacidade da Nossa Lavoura](https://nossalavoura.com.br/politica-de-privacidade/) (versão 3.0, de 29/10/2025). Nela, o controlador é o Grupo Axia Agro e o encarregado (DPO) é a GEP Soluções em Compliance, pelo e-mail dpo@axiaagro.com.br. A Agência Premium atua como operadora.

**Base legal e aceite**

- A política não lista uma finalidade específica para eventos e palestras. A proposta é usar consentimento, com finalidade descrita no próprio aceite.
- Texto do aceite (checkbox obrigatório, desmarcado por padrão): "Autorizo a Nossa Lavoura (Grupo Axia Agro) a tratar meus dados para confirmar e controlar minha presença no Circuito de Palestras Acelera no Campo 3.0, conforme a Política de Privacidade." O link abre a política em nova aba.
- Um segundo checkbox, opcional, para receber comunicações da Nossa Lavoura. Só com ele marcado os dados podem ser usados depois em campanhas.
- Guardar data e hora do aceite, versão da política, IP e navegador.
- Rodapé das páginas públicas com link da política e o canal do titular (dpo@axiaagro.com.br).

**Minimização e acesso**

- Acompanhante: só o nome, sem CPF.
- CPF completo visível apenas para o Admin; demais papéis veem mascarado.
- QR Code carrega só um token aleatório, nunca CPF ou nome.
- Quem abre um link já confirmado sem ser o titular não vê nenhum dado.
- Exportações CSV registradas na auditoria (quem, quando, qual palestra).

**Retenção.** A política prevê revisão da base a cada 12 meses. Proposta: manter os dados de convidados até 12 meses após a última palestra e depois eliminar ou anonimizar, salvo decisão da cliente de migrar os consentidos para o CRM dela.

**Segurança técnica**

- HTTPS em tudo (padrão da Vercel); banco Neon com conexão TLS e acesso só pelo servidor.
- Rate limit nas rotas públicas: confirmação, recuperação de ingresso, login e OTP.
- Códigos de convite com entropia suficiente para não serem adivinhados (6 caracteres de um alfabeto de 31 símbolos: cerca de 887 milhões de combinações) e bloqueio por IP após tentativas seguidas com códigos inexistentes.
- Toda ação sensível gravada em `palestra_auditoria`.
- Dados hospedados em infraestrutura fora do Brasil (Vercel e Neon), caso previsto na política como transferência internacional para backup e armazenamento em nuvem. Escolher a região do Neon mais próxima disponível (São Paulo, se houver).

## Stack e arquitetura

O sistema entra como um módulo do projeto Next.js que já publica a landing do Acelera no Campo na Vercel, sem serviço separado. Neon guarda os dados, Resend envia os e-mails de acesso e o WhatsApp é acionado só por links `wa.me`.

&#91;embedded content: arquitetura · app único e 3 serviços\]

| Camada | Escolha | Motivo |
| --- | --- | --- |
| Framework | Next.js (App Router), TypeScript | Já é o stack da landing |
| Hospedagem | Vercel, projeto existente | Deploy junto com a landing, rota `/palestras` |
| Banco | Neon Postgres + Drizzle ORM | Driver serverless do Neon, migrações versionadas no repo |
| Autenticação | Better Auth | Senha, link mágico e OTP por e-mail nativos; plugin próprio para CPF + nascimento e OTP por CPF |
| E-mail | Resend + React Email | Templates de link mágico, OTP e redefinição |
| UI | Tailwind + shadcn/ui | Identidade Acelera no Campo 3.0 aplicada por tokens |
| Validação | Zod | Mesmos esquemas no formulário e no servidor |
| QR Code | `qrcode` (geração) e `@zxing/browser` ou `html5-qrcode` (leitura pela câmera) | Leitura no navegador, sem app |
| PDF | `@react-pdf/renderer` em Route Handler | Links clicáveis e botões wa.me no PDF |
| CSV | `papaparse` | Importação e exportação |
| Rate limit | Upstash Redis (integração Vercel) ou tabela no Neon | Proteção de login, OTP e confirmação |
| Agendamento | Vercel Cron | Consolidar expirações |

**Variáveis de ambiente:** `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `RESEND_API_KEY`, `EMAIL_FROM` (ex.: palestras@agpremium.com.br), `APP_BASE_URL`, `CRON_SECRET`.

**Fluxo de desenvolvimento:** OpenSpec com Claude Code, ciclo PROPOSE, MOCKUP e APPLY por change. Na etapa MOCKUP, as telas são validadas antes de qualquer código de domínio.

## Changes OpenSpec e critérios de aceite

Cinco changes, cada uma passando por PROPOSE, MOCKUP e APPLY. A ordem abaixo respeita as dependências: a 2 precisa dos links da 1, e a 4 precisa do login da 3.

| Change | Entrega | Depende de |
| --- | --- | --- |
| `fundacao` | Schema, palestras, hierarquia, importação CSV, geração de lotes, PDF, acesso Admin | Nenhuma |
| `confirmacao-convidado` | Página do link, confirmação por CPF, ingresso com QR, cancelamento pelo convidado, recuperação de ingresso | fundacao |
| `auth-e-papeis` | Quatro métodos de login, papéis, escopos, travas de segurança | fundacao |
| `painel-colaborador` | Painel de convites, WhatsApp, cancelamento, PDF próprio, visão dos gerentes | auth-e-papeis |
| `operacao-evento` | Check-in por QR e manual, lista impressa, CSV, números por palestra | confirmacao-convidado, auth-e-papeis |

### fundacao

- [ ] Admin cadastra as 4 palestras e o prazo é preenchido como véspera às 23h59.
- [ ] Modelo CSV baixável; importação mostra pré-visualização com novos, atualizados e erros por linha.
- [ ] Reimportar o mesmo CSV não duplica regionais, lojas nem usuários.
- [ ] Admin gera, numa só operação, quantidades diferentes para colaboradores diferentes na mesma palestra.
- [ ] PDF de um colaborador lista só links disponíveis, com link em texto e botão WhatsApp que abre a mensagem preenchida.

### confirmacao-convidado

- [ ] Link disponível abre o formulário; CPF inválido é recusado com mensagem clara.
- [ ] Após confirmar, o mesmo link em outro dispositivo mostra "convite já utilizado" sem dados do titular.
- [ ] Dois envios simultâneos no mesmo link resultam em uma só confirmação.
- [ ] CPF já confirmado em qualquer palestra é recusado em outro link; depois de um cancelamento, o mesmo CPF volta a poder confirmar.
- [ ] Ingresso mostra QR, titular, acompanhante e dados da palestra; pode ser salvo como imagem e adicionado à agenda.
- [ ] Convidado cancela até a véspera; depois do prazo o botão some e a confirmação fica bloqueada.
- [ ] Aceite da política é obrigatório e fica registrado com versão, data e IP.

### auth-e-papeis

- [ ] Login por senha, link mágico, OTP por CPF e CPF + nascimento funcionam; e-mails saem pelo Resend.
- [ ] CPF + nascimento é recusado para Admin e gerentes.
- [ ] Cinco tentativas erradas bloqueiam por 15 minutos.
- [ ] Cada papel vê apenas o escopo da matriz; acesso fora do escopo por URL retorna 403.
- [ ] Usuário desativado é desconectado na próxima requisição.

### painel-colaborador

- [ ] Colaborador vê seus links por palestra e estado, copia, envia pelo WhatsApp e cancela.
- [ ] Confirmados mostram nome do titular, acompanhante e CPF mascarado.
- [ ] Gerente de Loja e Gerente Regional veem números e listas do seu escopo, sem gerar links.

### operacao-evento

- [ ] Leitura de QR no celular retorna verde, amarelo ou vermelho em até 2 segundos com boa conexão.
- [ ] Segunda leitura do mesmo QR mostra o horário do primeiro check-in.
- [ ] Check-in manual por CPF ou nome produz o mesmo registro do QR.
- [ ] Lista impressa sai em A4 ordenada por nome, com total de pessoas.
- [ ] CSV abre corretamente no Excel em português, com acentos.

## Pontos em aberto

Cada item indica, entre parênteses, a change que precisa da resposta antes do APPLY.

- [ ] **Reposição após cancelamento** (confirmacao-convidado): quando um convite é cancelado, o sistema gera automaticamente um link novo para o mesmo colaborador e palestra, ou o Admin repõe manualmente?
- [ ] **PDF pelo colaborador** (painel-colaborador): confirmar que o colaborador também pode baixar o próprio PDF, além do Admin.
- [ ] **Texto do aceite** (confirmacao-convidado): validar com o DPO do Grupo Axia Agro o texto do consentimento e o opt-in de comunicações.
- [ ] **Rodapé jurídico da promoção** (confirmacao-convidado): as páginas públicas precisam do mesmo rodapé exigido nas artes do Acelera no Campo 3.0?
- [ ] **Mensagem padrão do WhatsApp** (fundacao): aprovação da copy pela cliente.
- [ ] **Banco** (fundacao): usar o mesmo banco Neon da landing (com prefixo `palestra_`) ou um banco novo no mesmo projeto Neon?
- [ ] **Identidade visual** (MOCKUP de confirmacao-convidado): tokens, fontes e logos do Acelera no Campo 3.0 a aplicar.
- [ ] **Recepção** (operacao-evento): quem terá o papel em cada uma das 4 praças.
- [ ] **Retenção** (fundacao): confirmar os 12 meses após a última palestra e se os consentidos migram para o CRM da Nossa Lavoura.
