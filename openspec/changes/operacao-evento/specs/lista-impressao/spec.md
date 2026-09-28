## ADDED Requirements

### Requirement: Lista de confirmados para impressão
O sistema SHALL oferecer, por palestra, uma página de impressão em A4 retrato com os confirmados, para uso da recepção como contingência.

#### Scenario: Geração da lista
- **WHEN** um usuário com permissão pede a lista de uma palestra
- **THEN** recebe uma página preparada para impressão em A4 retrato, com os confirmados daquela palestra

#### Scenario: Ordem alfabética
- **WHEN** a lista é gerada
- **THEN** os confirmados aparecem em ordem alfabética pelo nome do titular

#### Scenario: Colunas da lista
- **WHEN** a lista é impressa
- **THEN** cada linha traz número sequencial, titular, CPF mascarado, acompanhante, loja, colaborador de origem e uma caixa para marcar presença à mão

#### Scenario: Cabeçalho da lista
- **WHEN** a lista é impressa
- **THEN** o cabeçalho traz palestra, cidade, data, horário, local, total de confirmados e total de pessoas, somando titulares e acompanhantes

#### Scenario: Rodapé da lista
- **WHEN** a lista tem mais de uma página
- **THEN** cada página traz, no rodapé, a data e a hora da geração e a numeração de página

#### Scenario: Cancelados fora da lista
- **WHEN** um convite é cancelado antes da geração
- **THEN** ele não aparece na lista impressa

### Requirement: Escopo da lista impressa
A lista SHALL conter apenas os confirmados do escopo de quem a gerou.

#### Scenario: Gerente de loja imprime
- **WHEN** um gerente de loja gera a lista
- **THEN** ela contém apenas confirmados originados de convites da sua loja

#### Scenario: Recepção imprime por palestra
- **WHEN** a Recepção gera a lista
- **THEN** ela contém todos os confirmados da palestra escolhida

#### Scenario: CPF sempre mascarado na impressão
- **WHEN** qualquer papel gera a lista
- **THEN** o CPF aparece mascarado, inclusive para o Admin

#### Scenario: Colaborador não gera lista
- **WHEN** um colaborador tenta acessar a lista impressa
- **THEN** o sistema responde 403
