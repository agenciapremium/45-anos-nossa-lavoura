## Context

Esta é a tela que o produtor rural vê, no celular, a partir de um link recebido no WhatsApp de um colaborador da loja. É o único ponto do sistema com usuário externo, sem login, sem treinamento e sem suporte.

Restrições que moldam o desenho:

- Conectividade irregular no interior de Rondônia. O ingresso precisa funcionar offline na porta do evento.
- O convite é **aberto**: não nasce nominal. A identidade do titular só existe depois da confirmação.
- Uma regra de unicidade global — um CPF, uma palestra em todo o circuito — que precisa valer sob concorrência.
- `fundacao` já criou `palestra_confirmacao` e o índice único parcial `(cpf) WHERE ativa`. Esta change escreve nessas estruturas.
- `auth-e-papeis` ainda pode não estar no ar quando esta change entrar; as duas são independentes e partem de `fundacao`.

## Goals / Non-Goals

**Goals:**

- Confirmar presença em um celular ruim, com internet ruim, sem instruções.
- Garantir que um link nunca gere duas confirmações e que um CPF nunca ocupe duas vagas.
- Entregar um ingresso que funcione mesmo sem internet na entrada do evento.
- Registrar consentimento com evidência suficiente para responder a uma solicitação de titular.

**Non-Goals:**

- Lembretes ao convidado por qualquer canal.
- Validar o convidado contra a base de clientes da Nossa Lavoura.
- Reposição automática de convite após cancelamento: decidido que o Admin repõe manualmente, gerando um novo lote quando julgar necessário.
- Controle de capacidade do local e lista de espera.
- Cancelamento pelo colaborador ou pelo Admin — isso é `painel-colaborador`.

## Decisions

### D1. Unicidade de CPF garantida pelo banco, não pela aplicação

A regra "um CPF, uma confirmação ativa no circuito" é imposta pelo índice único parcial `palestra_confirmacao (cpf) WHERE ativa`. A aplicação verifica antes, para dar mensagem boa, mas trata a violação de unicidade como caminho esperado e a converte na mesma mensagem.

**Alternativa:** checar com `SELECT` e depois inserir. Rejeitada: há janela entre a leitura e a escrita, e duas confirmações simultâneas do mesmo CPF passariam.

O cancelamento marca `ativa = false`, o que libera o CPF sem apagar o histórico. Consequência: um mesmo CPF pode ter várias linhas em `palestra_confirmacao`, no máximo uma com `ativa = true`.

### D2. Confirmação em transação única com trava de linha

```
BEGIN
  SELECT … FROM palestra_convite WHERE codigo = $1 FOR UPDATE
  -- valida estado, prazo da palestra
  INSERT INTO palestra_confirmacao (…)   -- pode violar o índice único de CPF
  UPDATE palestra_convite SET estado = 'confirmado'
COMMIT
```

A trava serializa os envios concorrentes no mesmo convite; o índice único serializa os envios concorrentes do mesmo CPF em convites diferentes. Os dois cenários de concorrência do PRD ficam cobertos por mecanismos do banco, não por lógica de aplicação.

### D3. Identificação do titular no dispositivo por cookie, não por sessão

O PRD diz que "o ingresso fica acessível no mesmo link a partir desse dispositivo". Ao confirmar, o sistema grava um cookie `HttpOnly`, `Secure`, `SameSite=Lax`, com escopo daquele convite, contendo um identificador opaco da confirmação. Em outro dispositivo, o caminho é a recuperação por CPF.

**Alternativa:** exigir CPF sempre, inclusive no mesmo dispositivo. Rejeitada por atrito desnecessário para quem acabou de confirmar.

**Alternativa:** sessão do Better Auth para o convidado. Rejeitada: cria conta para quem não é usuário do sistema e acopla esta change a `auth-e-papeis`.

**Ponto de atenção:** cookie some em navegação anônima ou ao limpar dados. Por isso a recuperação por CPF existe e é indicada na própria tela de "já utilizado".

### D4. Recuperação exige CPF **e** código do convite

O PRD descreve a recuperação "informando o CPF confirmado" na rota, e a rota `/palestras/ingresso` foi especificada como "CPF + código do link". Adotamos os dois fatores: só CPF permitiria enumerar confirmações a partir de um CPF conhecido — e CPF não é segredo. Exigir o código faz da recuperação uma prova de que a pessoa recebeu aquele convite.

Resposta neutra em qualquer falha, sem distinguir "código não existe" de "CPF não confere", mais limite por IP.

### D5. QR carrega apenas o `ingresso_token`

32 bytes aleatórios, codificados em URL-safe base64, gerados por fonte criptográfica. O QR contém o token puro, não uma URL — o leitor de check-in é nosso e sabe o que fazer com ele. Isso evita que alguém aponte a câmera do celular e caia em uma página que exponha dados.

### D6. Ingresso salvo como imagem renderizada no cliente

Captura do bloco do ingresso via `html-to-image` (ou canvas equivalente), com o QR desenhado como `data:` URI para não depender de rede no momento da captura. Alternativa considerada: gerar a imagem no servidor, o que garantiria resultado idêntico entre navegadores, ao custo de mais uma rota e de latência. Fica como plano B se a captura no cliente se mostrar instável no MOCKUP.

### D7. Arquivo `.ics` gerado no servidor

Rota que devolve `text/calendar` montado a partir dos dados da palestra, com `DTSTART` em UTC e `TZID` de `America/Porto_Velho`, `LOCATION` com nome e endereço do local. Sem convite por e-mail, sem organizador — é um arquivo, não um convite de calendário.

### D8. Proteção mínima de rotas públicas já nesta change

`auth-e-papeis` define a infraestrutura de rate limit do projeto. Como esta change pode entrar antes e expõe as rotas mais visadas, ela implementa a proteção mínima com uma **interface de limite** e uma implementação inicial apoiada em tabela no Neon. Quando `auth-e-papeis` escolher a implementação definitiva, troca-se a implementação atrás da mesma interface, sem mexer nas rotas.

### D9. Versão da política gravada como valor, não como referência

A versão da política aceita (`3.0`, de 29/10/2025) é gravada como texto na linha da confirmação. Se a política mudar, as confirmações antigas continuam registrando a versão que a pessoa de fato aceitou. A versão vigente fica em configuração, não em código, para poder ser atualizada sem deploy.

### D9b. Textos de consentimento aprovados

**Checkbox obrigatório** (desmarcado por padrão, com "Política de Privacidade" como link para nova aba):

> Autorizo a Nossa Lavoura (Grupo Axia Agro) a tratar meus dados para confirmar e controlar minha presença no Circuito de Palestras Acelera no Campo 3.0, conforme a Política de Privacidade. Se eu informar um acompanhante, declaro que ele está ciente e de acordo.

**Checkbox opcional** (desmarcado por padrão):

> Quero receber novidades, convites e ofertas da Nossa Lavoura. Opcional — sua presença está confirmada do mesmo jeito.

**Texto de apoio**, abaixo dos checkboxes, em corpo menor:

> Seus dados ficam guardados enquanto essa finalidade existir. Você pode pedir acesso, correção ou exclusão, e revogar esta autorização a qualquer momento, pelo e-mail dpo@axiaagro.com.br.

Três decisões de redação: a declaração sobre o acompanhante está no aceite obrigatório porque é o titular quem informa o nome de um terceiro que nunca viu o formulário; o opcional diz explicitamente que não é condição, para que ninguém marque por medo de perder a vaga; e o canal de revogação aparece junto do aceite, não só no rodapé, porque é ali que a pessoa está decidindo.

Os textos ficam em configuração, não embutidos no JSX, para que a revisão do DPO entre sem deploy. A versão da política gravada na confirmação continua sendo `3.0`.

### D9c. Retenção indeterminada, sem rotina de expurgo

Decisão da cliente: os dados dos convidados ficam guardados por prazo indeterminado. Não há rotina de eliminação automática, e a change não implementa expurgo.

O PRD propunha 12 meses após a última palestra, alinhado à revisão de base prevista na política. A LGPD pede eliminação quando a finalidade se encerra (art. 15 e 16), então "para sempre, sem critério" é frágil se questionado. O desenho adotado para tornar isso defensável, sem criar rotina de descarte:

1. O texto de apoio amarra a guarda à **finalidade**, não a um prazo — é o que sustenta a retenção longa.
2. O canal de revogação fica visível no formulário e no rodapé.
3. A eliminação a pedido do titular é operada manualmente pelo Admin, com registro em auditoria.

Fica a recomendação de levar o prazo ao DPO antes da primeira palestra: definir um horizonte, ainda que longo, custa uma linha de configuração agora e é muito mais barato que responder a um pedido de titular sem critério de descarte. Enquanto não houver definição, vale o indeterminado.

### D10. Tela de "já utilizado" é a mesma para todos os casos de não-titular

Código inexistente, convite cancelado e convite confirmado acessado por outra pessoa produzem respostas do mesmo formato e do mesmo tempo de resposta aproximado, para não permitir descobrir códigos válidos por tentativa e erro. A diferença de texto entre "cancelado" e "já utilizado" é mantida porque ajuda o convidado legítimo — mas nenhuma delas confirma a existência de um titular.

## Risks / Trade-offs

- **Produtor sem internet na porta do evento** → ingresso salvável como imagem, com QR embutido; a recepção também tem busca manual por CPF ou nome (em `operacao-evento`).
- **Cookie perdido e CPF esquecido** → a tela de estado orienta a procurar o colaborador de origem, que vê a confirmação no painel.
- **Regra de um CPF por circuito surpreender o produtor** → deixar explícito no texto do formulário, antes do envio, que a confirmação vale para uma única palestra do circuito.
- **Convite cancelado vira vaga perdida para o colaborador** → decisão da cliente: sem reposição automática. O Admin gera um novo lote quando quiser repor. A interface do colaborador deve deixar claro que cancelar não devolve o convite.
- **Digitação de CPF errada trava o convite no CPF errado** → o convite fica preso a um CPF que não é o do convidado, sem autoatendimento para corrigir. Mitigação: confirmar o CPF digitado em uma etapa de revisão antes do envio; correção só pelo Admin, por cancelamento e novo convite.
- **Acompanhante sem CPF** → é decisão do PRD (minimização de dados); a recepção libera duas pessoas pelo mesmo QR, sem conferir a identidade do acompanhante.

## Migration Plan

Não há migração de dados. A change publica rotas novas e passa a escrever em tabelas criadas em `fundacao`.

Sequência de publicação: MOCKUP validado → implementação → teste de ponta a ponta em preview com convites reais de uma palestra de teste → publicação. A palestra de teste deve ser desativada antes da produção valer.

**Rollback:** despublicar as rotas `/palestras/c/[codigo]` e `/palestras/ingresso` deixa os convites em `disponivel`, sem perda de dados. Confirmações já feitas permanecem gravadas.

## Open Questions

**Resolvidas nesta rodada:**

- ~~Reposição após cancelamento~~: manual. Nenhuma geração automática; o Admin repõe gerando um novo lote.
- ~~Etapa de mockup~~: as telas são implementadas em Next e validadas pela cliente no preview.
- ~~Texto do aceite e do opt-in~~: aprovados, em D9b. Revisão do DPO ainda é recomendada, mas não bloqueia.
- ~~Retenção~~: indeterminada, sem expurgo automático. Ver D9c.
- ~~Identidade visual~~: design system dos 45 anos com o selo do circuito (`assets/img/selo_circuito_acelera_no_campo.webp`) nas páginas públicas e no ingresso.

**Em aberto:**

- **Prazo de retenção com o DPO** (recomendado, não bloqueia): ver D9c.
- **Rodapé jurídico da promoção**: as páginas públicas precisam do mesmo rodapé exigido nas artes do Acelera no Campo 3.0, além do rodapé de privacidade?
- **Revisão do CPF antes do envio**: incluir uma etapa de revisão dos dados antes de confirmar, dado que o CPF digitado errado trava o convite?
