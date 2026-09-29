## Why

Hoje todo convite nasce preso a um colaborador: a geração pede quantidade por pessoa, o PDF sai por pessoa e a lista de convites é lida por loja e regional. Isso serve à operação principal do circuito, que é a rede de lojas distribuindo convite pelo WhatsApp, e que o PRD descreve.

Fora dessa rede existe um punhado de convites que a administração precisa entregar por conta própria: patrocinador, imprensa, autoridade local, parceiro, convidado do Grupo. Hoje o Admin só consegue isso escolhendo um colaborador qualquer para carregar esses convites, o que suja o número dele nas métricas, empurra o link para a lista de outra pessoa e mente sobre a origem da confirmação.

A cliente pediu o caminho direto: escolher a palestra, dizer quantos links quer e receber os links, sem colaborador, sem loja e sem regional no meio.

## What Changes

- **Geração avulsa**: na tela de geração de convites, um segundo modo em que o Admin informa a palestra e uma quantidade, e recebe N convites sem vínculo com pessoa nenhuma. As regras de convite continuam as mesmas: código de 6 caracteres, nascem disponíveis, respeitam o prazo da palestra e valem para titular mais um acompanhante.
- **Rótulo do lote**, opcional: um texto curto que diz para onde aquele lote foi ("Imprensa", "Patrocinador Virbac", "Prefeitura"). É o que devolve ao Admin a noção de origem que o vínculo com o colaborador dava. Sem rótulo, o lote aparece como "Avulso".
- **Entrega dos links**: a tela do lote lista os convites gerados com o link em texto, copiar um a um, copiar todos, e um PDF e um CSV do lote. Não existe envio por WhatsApp a partir daqui, porque não há dono para enviar.
- **BREAKING (dado)**: `palestra_convite.colaborador_id` e `palestra_lote.colaborador_id` passam a aceitar nulo. Nenhuma linha existente muda.
- **Visibilidade**: convite avulso é do Admin. Colaborador, gerente de loja e gerente regional não o enxergam em lugar nenhum, porque não pertence ao escopo de nenhum deles.
- **Números**: convites avulsos entram nos totais da palestra e no funil, e ficam fora dos recortes por regional, por loja e por colaborador, onde não teriam onde cair. Onde o recorte é por origem, ganham a linha "Avulsos".
- **Na porta e no impresso**: o confirmado por convite avulso aparece com "Administração" no lugar da loja e do colaborador de origem, em vez de campo vazio.

## Capabilities

### New Capabilities

- `convites-avulsos`: geração de convites sem vínculo com colaborador, o rótulo e a entrega dos links do lote, e o comportamento desses convites no escopo, nos números e na operação do evento.

### Modified Capabilities

<!-- Nenhuma. `openspec/specs/` está vazio: as capabilities de `fundacao`,
     `painel-colaborador` e `operacao-evento` seguem nas próprias changes, e
     nenhum requisito delas muda. O que muda é o que passa a ser possível
     quando o convite não tem colaborador, coberto pela capability nova. -->

## Impact

**Banco**

- Migração que remove `NOT NULL` de `palestra_convite.colaborador_id` e `palestra_lote.colaborador_id`, e acrescenta `palestra_lote.rotulo`. Sem alteração de dado existente e sem reescrita de tabela.

**Consultas** (`lib/palestras/dados.ts`)

- `convitesNoEscopo` e `confirmacoesNoEscopo` fazem `innerJoin` em `user` pelo colaborador. Com colaborador nulo, esse join descartaria o convite avulso silenciosamente, inclusive para o Admin. Vira `leftJoin`. É a mudança mais sensível desta change, e a que os testes precisam cobrir.
- Os recortes por regional, loja e colaborador continuam com `innerJoin`, que é o que mantém o avulso fora deles por construção.

**Serviço e telas**

- `lib/palestras/servicos/geracao.ts`: um caminho novo de geração por quantidade, ao lado do caminho por colaborador, na mesma transação e com a mesma checagem de prazo.
- `app/palestras/(interno)/admin/gerar`: o segundo modo e a tela do lote gerado.
- `app/palestras/(interno)/painel/convites`: coluna de origem mostra o rótulo do lote quando não há colaborador; filtro ganha a opção "avulsos".
- `app/palestras/(interno)/painel/metricas` e `relatorios`: linha "Avulsos" onde o recorte é por origem.
- `app/palestras/(interno)/relatorios/lista` e `checkin`: rótulo "Administração" no lugar de loja e colaborador.
- PDF e CSV do lote avulso, reaproveitando `lib/palestras/pdf` e `lib/palestras/csv`.

**Fora do escopo**

- Envio por WhatsApp a partir do lote avulso: não há dono, e a mensagem pronta é do colaborador.
- Reposição automática de convite avulso cancelado, que segue a regra do circuito: o Admin gera outro.
- Qualquer mudança no fluxo do convidado. Quem recebe um link avulso confirma pela mesma tela, com o mesmo consentimento e o mesmo ingresso.
