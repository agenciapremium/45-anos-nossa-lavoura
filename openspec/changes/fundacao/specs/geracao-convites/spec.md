## ADDED Requirements

### Requirement: Geração de lotes de convites pelo Admin
Somente o Admin SHALL gerar convites, escolhendo uma palestra, filtrando colaboradores por regional ou loja e informando a quantidade de links por colaborador.

#### Scenario: Quantidades diferentes numa só operação
- **WHEN** o Admin seleciona três colaboradores da mesma palestra e informa 10, 20 e 5 links
- **THEN** uma única operação cria 35 convites, distribuídos conforme as quantidades informadas

#### Scenario: Filtro por regional e loja
- **WHEN** o Admin filtra por uma regional e depois por uma loja
- **THEN** a lista de seleção mostra apenas colaboradores ativos daquele escopo

#### Scenario: Lote registrado para rastreio
- **WHEN** um lote é gerado
- **THEN** o sistema registra palestra, colaborador, quantidade, quem gerou e quando

#### Scenario: Convites aparecem imediatamente
- **WHEN** o lote é concluído
- **THEN** os convites ficam visíveis no painel do colaborador e disponíveis para o PDF sem nenhuma etapa adicional

#### Scenario: Novos lotes antes do prazo
- **WHEN** o Admin gera um novo lote para um colaborador que já tem convites na mesma palestra
- **THEN** os novos convites são somados aos existentes, sem substituir nem invalidar os anteriores

#### Scenario: Geração após o prazo é recusada
- **WHEN** o Admin tenta gerar convites para uma palestra cujo prazo de confirmação já venceu
- **THEN** o sistema recusa a operação e explica que o prazo venceu

#### Scenario: Quantidade inválida
- **WHEN** o Admin informa quantidade zero, negativa ou não inteira para um colaborador
- **THEN** o sistema recusa a operação inteira e aponta o colaborador com o valor inválido

#### Scenario: Papel sem permissão tenta gerar
- **WHEN** um gerente regional, gerente de loja, colaborador ou recepção acessa `/palestras/admin/gerar`
- **THEN** o sistema responde 403

### Requirement: Código curto do convite
Cada convite SHALL receber um código de 6 caracteres sorteado de um alfabeto sem símbolos ambíguos, único em todo o sistema, usado na URL pública `/palestras/c/[codigo]`.

#### Scenario: Alfabeto sem ambiguidade
- **WHEN** um convite é criado
- **THEN** seu código tem 6 caracteres e não contém `0`, `O`, `1`, `I` nem `L`

#### Scenario: Colisão de código é resolvida
- **WHEN** o código sorteado já existe
- **THEN** o sistema sorteia outro até obter um inédito, e nenhum convite compartilha código com outro

#### Scenario: Código não é sequencial
- **WHEN** dois convites são criados em sequência no mesmo lote
- **THEN** seus códigos não guardam relação previsível entre si

### Requirement: Estados do convite
Cada convite SHALL estar em exatamente um dos estados `disponivel`, `confirmado`, `presente`, `expirado` ou `cancelado`, nascendo como `disponivel`.

#### Scenario: Convite nasce disponível
- **WHEN** um convite é gerado
- **THEN** seu estado é `disponivel`

#### Scenario: Transição inválida é recusada
- **WHEN** uma operação tenta mover um convite de `cancelado` ou `expirado` de volta para `disponivel`
- **THEN** o sistema recusa a transição e o estado permanece inalterado

### Requirement: Expiração de convites pelo prazo
Convites em `disponivel` SHALL ser tratados como `expirado` a partir do prazo de confirmação da palestra, tanto na leitura quanto por consolidação periódica.

#### Scenario: Expiração avaliada na leitura
- **WHEN** alguém abre um convite `disponivel` depois de vencido o prazo da palestra, antes de qualquer rotina rodar
- **THEN** o sistema o trata como expirado e mostra o aviso de convite expirado

#### Scenario: Consolidação diária
- **WHEN** a rotina diária da Vercel executa
- **THEN** todos os convites `disponivel` com prazo vencido passam a ter o estado `expirado` gravado, e o número de convites atualizados é registrado

#### Scenario: Rotina protegida por segredo
- **WHEN** a rota da rotina é chamada sem o `CRON_SECRET` correto
- **THEN** o sistema responde 401 e nada é alterado

#### Scenario: Rotina é idempotente
- **WHEN** a rotina executa duas vezes no mesmo dia
- **THEN** a segunda execução não altera nenhum convite já expirado

#### Scenario: Confirmados não expiram
- **WHEN** o prazo vence e existem convites `confirmado` que não passaram por check-in
- **THEN** eles permanecem `confirmado`
