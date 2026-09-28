## ADDED Requirements

### Requirement: Modelo de CSV baixável
O sistema SHALL oferecer, em `/palestras/admin/importar`, o download de um arquivo `colaboradores.csv` modelo, em UTF-8, com os cabeçalhos exatos e ao menos uma linha de exemplo por papel que exige escopo.

#### Scenario: Admin baixa o modelo
- **WHEN** o Admin clica em "Baixar modelo"
- **THEN** recebe `colaboradores.csv` cuja primeira linha é `regional,loja_codigo,loja_nome,loja_cidade,nome,cpf,data_nascimento,email,whatsapp,papel`

#### Scenario: Modelo preenchido é aceito sem edição de cabeçalho
- **WHEN** o Admin preenche o modelo baixado e o envia sem alterar a linha de cabeçalho
- **THEN** o arquivo é aceito para pré-visualização

### Requirement: Validação linha a linha da importação
O sistema SHALL validar cada linha do CSV e MUST reportar, para cada linha rejeitada, o número da linha e o motivo da rejeição.

#### Scenario: Cabeçalho divergente
- **WHEN** o arquivo enviado não tem exatamente os cabeçalhos do modelo
- **THEN** o sistema recusa o arquivo inteiro, nomeia as colunas faltantes ou inesperadas e não processa nenhuma linha

#### Scenario: Campo obrigatório ausente
- **WHEN** uma linha não traz `regional`, `nome`, `cpf`, `data_nascimento` ou `papel`
- **THEN** a linha é marcada com erro indicando o campo faltante

#### Scenario: Loja obrigatória por papel
- **WHEN** uma linha tem papel `colaborador` ou `gerente_loja` sem `loja_codigo`
- **THEN** a linha é marcada com erro indicando que `loja_codigo` é obrigatório para esse papel

#### Scenario: Papel fora da lista
- **WHEN** uma linha traz um papel diferente de `admin`, `gerente_regional`, `gerente_loja`, `colaborador` ou `recepcao`
- **THEN** a linha é marcada com erro listando os valores aceitos

#### Scenario: CPF inválido na planilha
- **WHEN** uma linha traz um CPF com dígito verificador inválido
- **THEN** a linha é marcada com erro; e **WHEN** o CPF vem com máscara e é válido, **THEN** é aceito e normalizado para dígitos

#### Scenario: CPF repetido dentro do mesmo arquivo
- **WHEN** duas linhas do mesmo arquivo trazem o mesmo CPF
- **THEN** a segunda ocorrência é marcada com erro apontando a linha anterior

#### Scenario: E-mail repetido dentro do mesmo arquivo
- **WHEN** duas linhas do mesmo arquivo trazem o mesmo e-mail para CPFs diferentes
- **THEN** a segunda ocorrência é marcada com erro

### Requirement: Importação em duas etapas com pré-visualização
A importação SHALL ocorrer em duas etapas: pré-visualização e confirmação; nada MUST ser gravado na etapa de pré-visualização.

#### Scenario: Pré-visualização mostra o resumo
- **WHEN** o Admin envia o arquivo
- **THEN** vê a contagem de registros novos, atualizados e com erro, além da lista de erros com linha e motivo, sem que nada tenha sido gravado

#### Scenario: Admin confirma a importação
- **WHEN** o Admin confirma a pré-visualização sem erros
- **THEN** os registros são gravados em uma única transação e o resumo final repete as contagens

#### Scenario: Admin importa apenas as linhas válidas
- **WHEN** o arquivo tem linhas com erro e o Admin escolhe importar somente as válidas
- **THEN** as linhas válidas são gravadas e as com erro são ignoradas e permanecem no relatório

#### Scenario: Admin recusa importar com erros pendentes
- **WHEN** o arquivo tem linhas com erro e o Admin não escolhe importar só as válidas
- **THEN** nada é gravado

#### Scenario: Relatório de erros baixável
- **WHEN** a pré-visualização ou a importação apresenta linhas com erro
- **THEN** o Admin pode baixar um CSV com linha, motivo e o conteúdo original de cada linha rejeitada

### Requirement: Importação idempotente por upsert
A importação SHALL reaproveitar regionais pelo nome e lojas pelo `loja_codigo`, criar as que não existirem e atualizar usuários existentes pelo CPF, sem duplicar registros.

#### Scenario: Reimportar o mesmo arquivo não duplica
- **WHEN** o Admin importa o mesmo CSV uma segunda vez sem alterações
- **THEN** o resumo mostra zero criados, todos os usuários como atualizados, e as contagens de regionais, lojas e usuários no banco permanecem iguais

#### Scenario: Regional e loja novas são criadas
- **WHEN** uma linha referencia uma regional e uma loja inexistentes
- **THEN** ambas são criadas com os dados da linha e reaproveitadas pelas linhas seguintes do mesmo arquivo

#### Scenario: Usuário existente é atualizado
- **WHEN** uma linha traz um CPF já cadastrado com nome, e-mail, WhatsApp, papel ou loja diferentes
- **THEN** o usuário existente é atualizado com os novos valores, mantendo o mesmo identificador

#### Scenario: Loja existente com nome divergente
- **WHEN** uma linha traz um `loja_codigo` existente com `loja_nome` ou `loja_cidade` diferentes
- **THEN** a loja existente é atualizada com os novos valores e a alteração é registrada na auditoria

### Requirement: Histórico de importações
Cada importação confirmada SHALL ser registrada com nome do arquivo, totais, erros, autor e data e hora.

#### Scenario: Admin consulta o histórico
- **WHEN** o Admin abre o histórico de importações
- **THEN** vê cada carga com arquivo, total, criados, atualizados, quantidade de erros, quem importou e quando
