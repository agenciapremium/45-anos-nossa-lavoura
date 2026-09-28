## ADDED Requirements

### Requirement: Bloqueio por tentativas de login
O sistema SHALL bloquear novas tentativas de login por 15 minutos após 5 tentativas incorretas para o mesmo CPF ou a partir do mesmo IP, em qualquer método.

#### Scenario: Bloqueio por CPF
- **WHEN** ocorrem 5 tentativas incorretas para o mesmo CPF
- **THEN** as tentativas seguintes para aquele CPF são recusadas por 15 minutos, mesmo com a credencial correta

#### Scenario: Bloqueio por IP
- **WHEN** ocorrem 5 tentativas incorretas a partir do mesmo IP, para CPFs diferentes
- **THEN** as tentativas seguintes daquele IP são recusadas por 15 minutos

#### Scenario: Contador zera após sucesso
- **WHEN** um login é bem-sucedido antes de atingir o limite
- **THEN** o contador de tentativas daquele CPF é zerado

#### Scenario: Bloqueio expira sozinho
- **WHEN** passam 15 minutos desde o bloqueio
- **THEN** as tentativas voltam a ser aceitas, sem intervenção do Admin

#### Scenario: Mensagem de bloqueio é neutra
- **WHEN** uma tentativa é recusada por bloqueio
- **THEN** a mensagem informa que houve excesso de tentativas e indica o tempo de espera, sem revelar se o identificador existe

### Requirement: Limite de envio de códigos e links
O sistema SHALL limitar a frequência de envio de links mágicos, códigos por CPF e pedidos de redefinição de senha.

#### Scenario: Pedidos repetidos em sequência
- **WHEN** o mesmo identificador pede um novo código ou link antes do intervalo mínimo
- **THEN** o sistema recusa o novo envio e informa quanto tempo falta, sem revelar se o cadastro existe

#### Scenario: Código anterior é invalidado
- **WHEN** um novo código é enviado com sucesso para o mesmo usuário
- **THEN** o código anterior deixa de valer

### Requirement: Duração da sessão por papel
As sessões SHALL durar 12 horas para `colaborador` e `recepcao` e 7 dias para `admin`, `gerente_regional` e `gerente_loja`.

#### Scenario: Sessão de colaborador expira em 12 horas
- **WHEN** passam mais de 12 horas desde o login de um colaborador
- **THEN** a sessão é recusada e um novo login é exigido

#### Scenario: Sessão de gerente dura 7 dias
- **WHEN** um gerente volta ao sistema no terceiro dia após o login
- **THEN** a sessão continua válida

#### Scenario: Sessão criada por CPF e nascimento não é estendida
- **WHEN** um colaborador entra por CPF e data de nascimento
- **THEN** a sessão dura no máximo 12 horas, como nos demais métodos daquele papel

### Requirement: Restrição de método por papel
Usuários com papel `admin`, `gerente_regional` ou `gerente_loja` SHALL entrar somente por métodos baseados em e-mail; o método CPF e data de nascimento MUST estar indisponível para eles.

#### Scenario: Método indisponível para papel de gestão
- **WHEN** um usuário com papel de gestão tenta autenticar por CPF e data de nascimento
- **THEN** o sistema recusa, independentemente de os dados estarem corretos

#### Scenario: Mudança de papel altera os métodos permitidos
- **WHEN** o Admin promove um colaborador a gerente de loja
- **THEN** o novo papel passa a exigir métodos baseados em e-mail no próximo login

### Requirement: Proteção contra varredura de convites
O sistema SHALL bloquear temporariamente o IP que fizer tentativas seguidas de acesso a códigos de convite inexistentes.

#### Scenario: Sequência de códigos inválidos
- **WHEN** um mesmo IP acessa em sequência vários códigos de convite que não existem
- **THEN** as tentativas seguintes daquele IP são recusadas por um período

#### Scenario: Acesso legítimo não é penalizado
- **WHEN** um convidado abre o próprio convite válido algumas vezes seguidas
- **THEN** nenhum bloqueio é aplicado

### Requirement: Registro das tentativas e bloqueios
Tentativas de login malsucedidas e bloqueios SHALL ser registrados para apuração, sem gravar a credencial informada.

#### Scenario: Registro sem credencial
- **WHEN** uma tentativa de login falha
- **THEN** o registro guarda identificador, método, IP, data e hora e o motivo, mas não a senha, o código nem a data de nascimento informados
