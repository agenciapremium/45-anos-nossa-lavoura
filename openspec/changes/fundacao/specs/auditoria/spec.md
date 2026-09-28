## ADDED Requirements

### Requirement: Registro de ações sensíveis
O sistema SHALL registrar toda ação sensível com ator, ação, entidade afetada, identificador da entidade, dados relevantes e data e hora.

#### Scenario: Ações cobertas nesta change
- **WHEN** ocorre criação, edição ou desativação de palestra, regional, loja ou usuário, importação de CSV, geração de lote de convites ou geração de PDF
- **THEN** um registro de auditoria é gravado com o ator, a ação e a entidade correspondentes

#### Scenario: Ação do sistema sem ator humano
- **WHEN** a rotina diária de expiração altera convites
- **THEN** o registro é gravado sem ator, identificando a origem como rotina automática

#### Scenario: Registro é imutável
- **WHEN** qualquer parte do sistema tenta alterar ou apagar um registro de auditoria existente
- **THEN** a operação é recusada

### Requirement: Auditoria não expõe dados pessoais desnecessários
Os dados gravados na auditoria SHALL ser limitados ao necessário para rastrear a ação e MUST NOT incluir CPF completo, senha, código OTP ou token de ingresso.

#### Scenario: Payload sem dados sensíveis
- **WHEN** uma ação envolvendo um convidado é registrada
- **THEN** o registro contém o identificador do convite e do convidado, mas não o CPF completo nem o token do ingresso

### Requirement: Consulta da auditoria pelo Admin
O Admin SHALL poder consultar os registros de auditoria filtrando por ator, ação, entidade e período.

#### Scenario: Admin filtra por período e ação
- **WHEN** o Admin filtra por uma ação e um intervalo de datas
- **THEN** vê os registros correspondentes em ordem cronológica decrescente

#### Scenario: Papel sem permissão tenta consultar
- **WHEN** um usuário que não é Admin tenta acessar a auditoria
- **THEN** o sistema responde 403
