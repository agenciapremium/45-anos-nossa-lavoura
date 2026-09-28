## ADDED Requirements

### Requirement: Hierarquia Regional, Loja e Colaborador
O sistema SHALL representar a estrutura da Nossa Lavoura em três níveis: uma Regional contém Lojas e uma Loja contém Usuários, com nome de regional único e código de loja único.

#### Scenario: Regional com nome repetido é recusada
- **WHEN** o Admin cria uma regional com um nome que já existe
- **THEN** o sistema recusa a criação e indica a regional existente

#### Scenario: Loja com código repetido é recusada
- **WHEN** o Admin cria uma loja com um `loja_codigo` já cadastrado
- **THEN** o sistema recusa a criação e indica a loja existente

#### Scenario: Loja pertence a uma regional
- **WHEN** o Admin cria uma loja
- **THEN** é obrigatório informar a regional à qual ela pertence

### Requirement: Cadastro de usuários com papel e escopo
O Admin SHALL cadastrar, editar e desativar usuários, atribuindo a cada um exatamente um papel entre `admin`, `gerente_regional`, `gerente_loja`, `colaborador` e `recepcao`, com o vínculo de escopo exigido por esse papel.

#### Scenario: Gerente regional exige regional
- **WHEN** o Admin salva um usuário com papel `gerente_regional` sem informar a regional
- **THEN** o sistema recusa o salvamento e aponta o campo obrigatório

#### Scenario: Colaborador e gerente de loja exigem loja
- **WHEN** o Admin salva um usuário com papel `colaborador` ou `gerente_loja` sem informar a loja
- **THEN** o sistema recusa o salvamento e aponta o campo obrigatório

#### Scenario: Um usuário tem um único papel
- **WHEN** o Admin altera o papel de um usuário
- **THEN** o papel anterior é substituído, e o usuário nunca acumula dois papéis

#### Scenario: CPF único entre usuários
- **WHEN** o Admin tenta cadastrar um usuário com um CPF já existente
- **THEN** o sistema recusa a criação e oferece abrir o cadastro existente

#### Scenario: E-mail é opcional e único quando informado
- **WHEN** o Admin cadastra um usuário sem e-mail
- **THEN** o cadastro é aceito; e **WHEN** informa um e-mail já usado por outro usuário, **THEN** o sistema recusa

### Requirement: Validação e armazenamento de CPF e data de nascimento
O sistema SHALL validar o CPF pelo dígito verificador, aceitar o valor com ou sem máscara e armazená-lo somente com dígitos; a data de nascimento SHALL ser informada no formato DD/MM/AAAA.

#### Scenario: CPF com máscara é normalizado
- **WHEN** o Admin informa `123.456.789-09`
- **THEN** o sistema grava `12345678909`

#### Scenario: CPF com dígito verificador inválido é recusado
- **WHEN** o Admin informa um CPF cujo dígito verificador não confere
- **THEN** o sistema recusa com mensagem clara e não grava nada

#### Scenario: Data de nascimento em formato inválido é recusada
- **WHEN** o Admin informa uma data fora do formato DD/MM/AAAA ou inexistente no calendário
- **THEN** o sistema recusa com mensagem clara

### Requirement: Desativação de usuário, loja e regional
O Admin SHALL poder desativar usuários, lojas e regionais em vez de excluí-los, preservando o histórico já registrado.

#### Scenario: Usuário desativado perde acesso
- **WHEN** o Admin desativa um usuário
- **THEN** o usuário passa a ser recusado no login e a não figurar nas listas de seleção

#### Scenario: Convites do usuário desativado continuam válidos
- **WHEN** um colaborador com convites disponíveis e confirmados é desativado
- **THEN** os convites dele permanecem nos mesmos estados e passam a ser geridos pelo Admin

#### Scenario: Loja desativada não recebe novos usuários
- **WHEN** o Admin tenta vincular um novo usuário a uma loja desativada
- **THEN** o sistema recusa e explica que a loja está inativa
