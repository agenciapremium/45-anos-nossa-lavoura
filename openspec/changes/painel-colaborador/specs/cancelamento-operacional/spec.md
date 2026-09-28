## ADDED Requirements

### Requirement: Cancelamento de convite pelo colaborador e pelo Admin
O colaborador SHALL poder cancelar os próprios convites e o Admin SHALL poder cancelar qualquer convite, nos estados `disponivel` ou `confirmado`, até 23h59 da véspera da palestra.

#### Scenario: Colaborador cancela um convite disponível
- **WHEN** o colaborador cancela um convite `disponivel` dentro do prazo
- **THEN** o convite passa a `cancelado` e deixa de aparecer entre os disponíveis e no PDF

#### Scenario: Colaborador cancela um convite confirmado
- **WHEN** o colaborador cancela um convite `confirmado` dentro do prazo
- **THEN** o convite passa a `cancelado`, a confirmação deixa de estar ativa e o ingresso do convidado deixa de valer

#### Scenario: Motivo opcional
- **WHEN** o cancelamento é feito pelo painel
- **THEN** o autor pode informar um motivo, e o cancelamento é aceito mesmo sem motivo

#### Scenario: Confirmação explícita antes de cancelar
- **WHEN** o autor aciona o cancelamento
- **THEN** o sistema pede confirmação explícita, avisando que a ação não pode ser desfeita e, no caso de convite confirmado, que o convidado perderá o ingresso

#### Scenario: Cancelamento após o prazo é recusado
- **WHEN** alguém tenta cancelar depois de 23h59 da véspera
- **THEN** o sistema recusa e explica que o prazo venceu

#### Scenario: Convite já cancelado ou expirado
- **WHEN** alguém tenta cancelar um convite `cancelado`, `expirado` ou `presente`
- **THEN** o sistema recusa e informa o estado atual

### Requirement: Escopo do cancelamento
O cancelamento SHALL respeitar o escopo do papel: colaborador cancela apenas os próprios convites, Admin cancela qualquer um, e gerentes não cancelam.

#### Scenario: Colaborador tenta cancelar convite de outra pessoa
- **WHEN** um colaborador envia um pedido de cancelamento para um convite que não é dele
- **THEN** o sistema responde 403 e o convite não é alterado

#### Scenario: Gerente não pode cancelar
- **WHEN** um gerente de loja ou regional tenta cancelar um convite do seu escopo
- **THEN** o sistema responde 403

#### Scenario: Admin cancela convite de qualquer loja
- **WHEN** o Admin cancela um convite de qualquer colaborador
- **THEN** o cancelamento é aceito

#### Scenario: Convites de colaborador desativado
- **WHEN** o colaborador de origem de um convite foi desativado
- **THEN** o Admin consegue cancelar esse convite

### Requirement: Cancelamento é definitivo e rastreável
O cancelamento SHALL ser irreversível, e o convite MUST NOT voltar a ficar `disponivel`; o sistema SHALL registrar autor, data e hora e motivo quando informado.

#### Scenario: Convite não retorna a disponível
- **WHEN** um convite é cancelado
- **THEN** não existe nenhuma ação no sistema que o devolva ao estado `disponivel`

#### Scenario: Registro do cancelamento
- **WHEN** um convite é cancelado
- **THEN** ficam gravados quem cancelou, quando e o motivo informado, e o evento é registrado na auditoria

#### Scenario: Cancelamento de confirmado libera o CPF
- **WHEN** um convite `confirmado` é cancelado pelo painel
- **THEN** o CPF daquela confirmação volta a poder confirmar em outro convite do circuito

#### Scenario: Convidado percebe o cancelamento
- **WHEN** o titular reabre o link de um convite cancelado pelo painel
- **THEN** vê o aviso de convite cancelado, sem o ingresso
