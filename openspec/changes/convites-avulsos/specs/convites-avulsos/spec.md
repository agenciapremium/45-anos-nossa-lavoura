## ADDED Requirements

### Requirement: Geração de convites sem vínculo

O Admin SHALL poder gerar uma quantidade de convites para uma palestra sem informar colaborador, loja ou regional. Os convites gerados SHALL seguir todas as regras do convite comum: código único de 6 caracteres, estado inicial `disponivel`, prazo da palestra e validade para o titular e um acompanhante. A operação SHALL ser atômica: ou os N convites nascem, ou nenhum nasce.

#### Scenario: Admin gera um lote avulso

- **WHEN** o Admin escolhe a palestra de Ji-Paraná, informa 20 e confirma
- **THEN** 20 convites são criados para essa palestra, sem colaborador
- **AND** todos nascem disponíveis, com códigos distintos entre si e de qualquer convite existente

#### Scenario: Prazo vencido recusa a geração

- **WHEN** o Admin tenta gerar um lote avulso para uma palestra cujo prazo de confirmação já venceu
- **THEN** a operação é recusada com a mesma mensagem da geração por colaborador
- **AND** nenhum convite é criado

#### Scenario: Quantidade inválida recusa a operação inteira

- **WHEN** a quantidade informada é zero, negativa ou acima do limite por operação
- **THEN** a operação é recusada antes de gravar qualquer convite
- **AND** a mensagem diz qual é o limite

#### Scenario: Só o Admin gera

- **WHEN** um gerente regional, um gerente de loja, um colaborador ou a recepção tenta acionar a geração avulsa
- **THEN** o servidor recusa, independentemente de a tela ter oferecido o caminho

### Requirement: Rótulo do lote avulso

A geração avulsa SHALL aceitar um rótulo opcional de até 80 caracteres, que identifica para onde aquele lote foi. Onde a interface mostraria o colaborador de origem, o convite avulso SHALL mostrar o rótulo do lote; na ausência de rótulo, SHALL mostrar "Avulso".

#### Scenario: Lote com rótulo

- **WHEN** o Admin gera 10 convites com o rótulo "Imprensa"
- **THEN** na lista de convites esses 10 aparecem com "Imprensa" na coluna de origem

#### Scenario: Lote sem rótulo

- **WHEN** o Admin gera 10 convites sem preencher o rótulo
- **THEN** os convites aparecem com "Avulso" na coluna de origem, nunca com a coluna vazia

### Requirement: Entrega dos links do lote

Depois de gerar, o sistema SHALL apresentar os convites do lote com o código e o endereço completo em texto, com ação de copiar um convite, copiar todos de uma vez, e baixar o lote em PDF e em CSV. O lote SHALL continuar acessível depois, a partir da palestra. A interface do lote avulso MUST NOT oferecer envio por WhatsApp, porque não há colaborador remetente.

#### Scenario: Admin copia os links recém-gerados

- **WHEN** a geração termina
- **THEN** a tela do lote lista os convites com código e endereço
- **AND** oferece copiar um a um e copiar todos

#### Scenario: Admin volta ao lote depois

- **WHEN** o Admin abre a palestra e procura os lotes avulsos dela
- **THEN** encontra o lote pela data, pelo rótulo e pela quantidade, e reabre os mesmos links

#### Scenario: Sem envio por WhatsApp

- **WHEN** a tela do lote avulso é exibida
- **THEN** não há ação de enviar por WhatsApp em nenhum dos convites

### Requirement: Convite avulso pertence ao Admin

Convite sem colaborador SHALL ser visível apenas para o Admin, em qualquer tela ou consulta. Colaborador, gerente de loja, gerente regional e recepção MUST NOT vê-lo em lista, contagem, exportação ou detalhe.

#### Scenario: Colaborador não vê avulso

- **WHEN** um colaborador abre a lista de convites
- **THEN** nenhum convite avulso aparece, nem entra nas contagens por estado que a tela mostra

#### Scenario: Gerente regional não vê avulso

- **WHEN** um gerente regional abre convites, equipe, relatórios ou métricas
- **THEN** nenhum convite avulso entra em nenhum desses números

#### Scenario: Admin vê o avulso em todas as leituras

- **WHEN** o Admin abre a lista de convites, o resumo por estado e o detalhe de um convite avulso
- **THEN** o convite aparece nas três, com origem "Administração" e o rótulo do lote

#### Scenario: Filtro por origem avulsa

- **WHEN** o Admin filtra a lista de convites por origem avulsa
- **THEN** só aparecem convites sem colaborador

### Requirement: Convites avulsos nos números do circuito

Convites avulsos SHALL entrar nos totais por palestra, no funil e na série diária. Eles MUST NOT entrar nos recortes por regional, por loja e por colaborador. Cada recorte por origem SHALL apresentar uma linha "Avulsos" com o total correspondente, para que a soma do recorte reconcilie com o total da palestra.

#### Scenario: Total da palestra inclui o avulso

- **WHEN** uma palestra tem 1.100 convites de colaboradores e 40 avulsos
- **THEN** o total de gerados dessa palestra é 1.140 para o Admin

#### Scenario: Recorte por loja não inclui o avulso, e diz isso

- **WHEN** o Admin abre o desempenho por loja da mesma palestra
- **THEN** a soma das lojas é 1.100
- **AND** existe uma linha "Avulsos" com 40

#### Scenario: Confirmação de avulso conta no funil

- **WHEN** alguém confirma presença por um convite avulso
- **THEN** a confirmação entra no total de confirmados e na série diária da palestra

### Requirement: Origem visível na operação do evento

Onde a interface identifica a origem de um confirmado, o convite avulso SHALL ser apresentado como "Administração", acompanhado do rótulo do lote quando existir, tanto na lista impressa quanto no resultado do check-in e na busca manual. O campo MUST NOT ficar vazio.

#### Scenario: Lista impressa com convidado avulso

- **WHEN** a lista de confirmados de uma palestra com avulsos é gerada
- **THEN** a linha do convidado avulso traz "Administração" nas colunas de loja e de colaborador

#### Scenario: Check-in de convidado avulso

- **WHEN** a recepção registra a entrada de alguém que confirmou por convite avulso
- **THEN** o resultado mostra a entrada liberada com a origem "Administração"
- **AND** o comportamento do check-in é idêntico ao de qualquer outro convite

### Requirement: Rastro da geração avulsa

Toda geração de lote avulso SHALL ser registrada na auditoria com ação própria, identificando quem gerou, a palestra, a quantidade e o rótulo. O registro MUST NOT depender de interpretar campo nulo para distinguir a origem.

#### Scenario: Geração aparece no rastro

- **WHEN** o Admin gera um lote avulso de 20 convites com rótulo "Imprensa"
- **THEN** a auditoria registra a ação, o ator, a palestra, a quantidade e o rótulo

#### Scenario: Cancelamento de convite avulso

- **WHEN** o Admin cancela um convite avulso
- **THEN** o cancelamento é registrado como qualquer outro cancelamento de convite
- **AND** o convite não volta a ficar disponível
