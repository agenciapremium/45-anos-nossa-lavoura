## ADDED Requirements

### Requirement: Colaborador baixa o próprio PDF
O colaborador autenticado SHALL poder baixar, pelo painel, o PDF com os próprios convites disponíveis, com o mesmo conteúdo e formato do PDF gerado pelo Admin.

#### Scenario: Download a partir do painel
- **WHEN** o colaborador escolhe uma ou mais palestras e pede o PDF
- **THEN** recebe o documento com os próprios convites `disponivel` daquelas palestras

#### Scenario: Conteúdo idêntico ao do Admin
- **WHEN** o mesmo colaborador tem o PDF gerado pelo Admin e pelo próprio painel, no mesmo instante
- **THEN** os dois documentos trazem os mesmos convites, o mesmo cabeçalho e o mesmo formato

#### Scenario: Colaborador sem convites disponíveis
- **WHEN** o colaborador não tem nenhum convite `disponivel`
- **THEN** o sistema informa que não há convites disponíveis e não gera um PDF vazio

### Requirement: PDF restrito ao escopo do solicitante
O PDF gerado a partir do painel SHALL conter apenas convites do próprio colaborador autenticado.

#### Scenario: O pedido não admite alvo diferente do solicitante
- **WHEN** um colaborador envia um pedido de PDF acrescentando o identificador de outro colaborador
- **THEN** o parâmetro não tem efeito algum, e o documento gerado contém apenas os convites do próprio solicitante

#### Scenario: Não existe caminho que produza o PDF de terceiro
- **WHEN** a rota de PDF do painel é examinada
- **THEN** ela não lê nenhum identificador de colaborador da requisição, de modo que o alvo do documento só pode ser o usuário da sessão

#### Scenario: Gerentes não baixam PDF de convites
- **WHEN** um gerente de loja ou regional tenta baixar o PDF de um colaborador do seu escopo
- **THEN** o sistema responde 403

#### Scenario: Geração registrada na auditoria
- **WHEN** um colaborador baixa o próprio PDF
- **THEN** a geração é registrada com o autor, a data e a hora e as palestras incluídas
