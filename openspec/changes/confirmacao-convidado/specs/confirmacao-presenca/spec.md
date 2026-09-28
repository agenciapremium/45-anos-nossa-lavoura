## ADDED Requirements

### Requirement: Formulário público de confirmação
Ao abrir um convite `disponivel` dentro do prazo, o visitante SHALL ver os dados da palestra e um formulário de confirmação, sem precisar de login.

#### Scenario: Convite disponível abre o formulário
- **WHEN** um visitante acessa `/palestras/c/[codigo]` de um convite `disponivel` antes do prazo
- **THEN** vê cidade, data, horário, local, endereço e prazo da palestra, e o formulário de confirmação

#### Scenario: Campos do formulário
- **WHEN** o formulário é exibido
- **THEN** apresenta CPF, nome completo, WhatsApp, cidade, nome da propriedade e atividade como obrigatórios, e nome do acompanhante como opcional

#### Scenario: Atividade tem opções fixas
- **WHEN** o visitante escolhe a atividade
- **THEN** pode selecionar corte, leite, cria ou outra

#### Scenario: Formulário funciona no celular
- **WHEN** o visitante abre o link em um celular
- **THEN** o formulário é utilizável em tela estreita, com teclado numérico para CPF e WhatsApp

### Requirement: Validação dos dados do convidado
O sistema SHALL validar os dados enviados no servidor, com as mesmas regras aplicadas no formulário, e MUST recusar a confirmação quando qualquer regra falhar.

#### Scenario: CPF inválido é recusado
- **WHEN** o visitante informa um CPF cujo dígito verificador não confere
- **THEN** o sistema recusa com mensagem clara indicando o CPF, e nenhuma confirmação é criada

#### Scenario: CPF aceito com ou sem máscara
- **WHEN** o visitante informa `123.456.789-09` ou `12345678909`
- **THEN** ambos são aceitos e gravados apenas com dígitos

#### Scenario: Campo obrigatório vazio
- **WHEN** o visitante envia o formulário sem nome, WhatsApp, cidade, propriedade ou atividade
- **THEN** o sistema recusa e aponta cada campo faltante

#### Scenario: Validação também no servidor
- **WHEN** um envio chega ao servidor com dados inválidos, contornando a validação do navegador
- **THEN** o servidor recusa com a mesma regra e nada é gravado

### Requirement: Trava do convite no primeiro CPF
A primeira confirmação válida SHALL travar o convite no CPF informado, mudando o estado para `confirmado`; o convite MUST NOT aceitar uma segunda confirmação.

#### Scenario: Convite passa a confirmado
- **WHEN** a confirmação é aceita
- **THEN** o convite muda de `disponivel` para `confirmado` e a confirmação fica vinculada ao CPF informado

#### Scenario: Outro CPF no mesmo link é recusado
- **WHEN** outra pessoa abre o mesmo link depois da confirmação e tenta confirmar com outro CPF
- **THEN** o sistema recusa e mostra o aviso de convite já utilizado, sem nenhum dado do titular

#### Scenario: Confirmação após o prazo é recusada
- **WHEN** alguém envia o formulário depois de 23h59 da véspera da palestra
- **THEN** o sistema recusa e informa que o prazo de confirmação venceu

### Requirement: Uma única confirmação por convite sob concorrência
O sistema SHALL processar a mudança de estado do convite em transação com trava de linha, de modo que envios simultâneos resultem em no máximo uma confirmação.

#### Scenario: Dois envios simultâneos no mesmo link
- **WHEN** dois envios com CPFs diferentes chegam ao mesmo tempo para o mesmo convite
- **THEN** exatamente um é confirmado e o outro recebe o aviso de convite já utilizado, e existe uma única confirmação gravada

#### Scenario: Envio duplicado do mesmo CPF
- **WHEN** o mesmo visitante envia o formulário duas vezes por duplo toque
- **THEN** apenas uma confirmação é criada e o visitante vê o ingresso

### Requirement: CPF confirma em uma única palestra do circuito
Um CPF SHALL ter no máximo uma confirmação ativa em todo o circuito; uma segunda tentativa, na mesma palestra ou em outra, MUST ser recusada sem revelar em qual palestra o CPF já está confirmado.

#### Scenario: CPF já confirmado em outra palestra
- **WHEN** um CPF com confirmação ativa tenta confirmar em um convite de outra palestra
- **THEN** o sistema recusa informando que aquele CPF já tem presença confirmada no circuito, sem dizer qual palestra

#### Scenario: CPF liberado após cancelamento
- **WHEN** a confirmação de um CPF é cancelada e ele tenta confirmar em outro convite dentro do prazo
- **THEN** a nova confirmação é aceita

#### Scenario: Unicidade garantida pelo banco
- **WHEN** duas confirmações do mesmo CPF chegam simultaneamente em convites diferentes
- **THEN** apenas uma é gravada, e a outra recebe a mensagem de CPF já confirmado

### Requirement: Proteção das rotas públicas de confirmação
As rotas públicas de confirmação SHALL ser protegidas contra uso automatizado por limite de requisições por IP.

#### Scenario: Excesso de envios do mesmo IP
- **WHEN** um mesmo IP envia o formulário de confirmação muitas vezes em curto intervalo
- **THEN** as requisições seguintes são recusadas temporariamente com mensagem neutra

#### Scenario: Varredura de códigos inexistentes
- **WHEN** um mesmo IP acessa em sequência vários códigos de convite que não existem
- **THEN** o sistema passa a recusar novas tentativas daquele IP por um período, e a resposta para código inexistente é indistinguível da de um código cancelado
