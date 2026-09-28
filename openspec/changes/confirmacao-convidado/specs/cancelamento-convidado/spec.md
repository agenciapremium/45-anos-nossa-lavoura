## ADDED Requirements

### Requirement: Cancelamento pelo convidado até a véspera
O titular SHALL poder cancelar a própria confirmação a partir do ingresso, até 23h59 da véspera da palestra.

#### Scenario: Cancelamento dentro do prazo
- **WHEN** o titular toca em "Não vou poder ir" e confirma a intenção antes do prazo
- **THEN** o convite passa a `cancelado`, a confirmação deixa de estar ativa e o ingresso deixa de ser exibido

#### Scenario: Confirmação da intenção antes de cancelar
- **WHEN** o titular toca em "Não vou poder ir"
- **THEN** o sistema pede uma confirmação explícita antes de cancelar, avisando que a ação não pode ser desfeita

#### Scenario: Botão some após o prazo
- **WHEN** o titular abre o ingresso depois de vencido o prazo
- **THEN** o botão de cancelamento não é exibido

#### Scenario: Cancelamento após o prazo é recusado no servidor
- **WHEN** um pedido de cancelamento chega ao servidor depois do prazo
- **THEN** o sistema recusa e a confirmação permanece ativa

### Requirement: Cancelamento é definitivo
Um convite cancelado SHALL permanecer cancelado; o link MUST NOT voltar ao estado `disponivel` nem aceitar nova confirmação.

#### Scenario: Link cancelado é reaberto
- **WHEN** alguém acessa o link de um convite cancelado
- **THEN** vê o aviso de convite cancelado, sem formulário e sem dados do titular

#### Scenario: Convite cancelado não aceita confirmação
- **WHEN** um envio de confirmação chega para um convite cancelado
- **THEN** o sistema recusa

#### Scenario: Cancelamento repetido é inofensivo
- **WHEN** um segundo pedido de cancelamento chega para o mesmo convite
- **THEN** o sistema responde sem erro e nada muda

### Requirement: Cancelamento libera o CPF
Ao cancelar, a confirmação SHALL deixar de ser a confirmação ativa daquele CPF, liberando-o para confirmar em outro convite do circuito.

#### Scenario: CPF volta a poder confirmar
- **WHEN** o titular cancela e, dentro do prazo, abre outro convite disponível
- **THEN** consegue confirmar com o mesmo CPF

#### Scenario: Histórico do cancelamento preservado
- **WHEN** uma confirmação é cancelada
- **THEN** o sistema registra data e hora do cancelamento, quem cancelou e o motivo quando informado, sem apagar o registro original
