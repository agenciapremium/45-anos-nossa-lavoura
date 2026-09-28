## ADDED Requirements

### Requirement: Login por senha
O sistema SHALL permitir o login com e-mail ou CPF e senha, para usuários que já tenham senha definida.

#### Scenario: Login com e-mail e senha corretos
- **WHEN** o usuário informa e-mail e senha corretos
- **THEN** a sessão é criada e ele é levado ao painel correspondente ao seu papel

#### Scenario: Login com CPF e senha corretos
- **WHEN** o usuário informa o CPF, com ou sem máscara, e a senha correta
- **THEN** a sessão é criada da mesma forma

#### Scenario: Credencial incorreta
- **WHEN** a senha não confere
- **THEN** o sistema responde com mensagem genérica de credencial inválida, sem informar se o identificador existe

#### Scenario: Usuário sem senha definida
- **WHEN** um usuário que nunca definiu senha tenta entrar por senha
- **THEN** o sistema orienta a usar outro método ou a definir a senha por e-mail, sem confirmar se o identificador existe

### Requirement: Definição e redefinição de senha por e-mail
O sistema SHALL permitir definir a senha no primeiro acesso e redefini-la por link enviado ao e-mail cadastrado.

#### Scenario: Pedido de redefinição
- **WHEN** o usuário pede a redefinição informando o e-mail
- **THEN** o sistema responde sempre com a mesma mensagem, informando que, se o e-mail existir, um link foi enviado

#### Scenario: Link de redefinição é de uso único
- **WHEN** o usuário usa o link de redefinição uma segunda vez
- **THEN** o link é recusado como já utilizado

#### Scenario: Usuário sem e-mail cadastrado
- **WHEN** um usuário sem e-mail tenta redefinir senha
- **THEN** o sistema orienta a procurar o Admin, sem revelar dados do cadastro

### Requirement: Login por link mágico
O sistema SHALL permitir o login por link enviado ao e-mail cadastrado, válido por 15 minutos e de uso único.

#### Scenario: Link válido cria a sessão
- **WHEN** o usuário abre o link mágico dentro de 15 minutos
- **THEN** a sessão é criada e ele é levado ao painel

#### Scenario: Link expirado
- **WHEN** o usuário abre o link mágico depois de 15 minutos
- **THEN** o sistema recusa e oferece o envio de um novo link

#### Scenario: Link já utilizado
- **WHEN** o usuário abre pela segunda vez um link mágico já usado
- **THEN** o sistema recusa

#### Scenario: Resposta neutra ao pedir o link
- **WHEN** alguém pede o link mágico para um e-mail qualquer
- **THEN** a resposta é sempre a mesma, exista ou não o cadastro

### Requirement: Login por código enviado ao e-mail a partir do CPF
O sistema SHALL permitir que o usuário informe o CPF e receba um código de 6 dígitos no e-mail vinculado a esse CPF, válido por 10 minutos, com no máximo 5 tentativas de verificação.

#### Scenario: Código enviado e e-mail mascarado na tela
- **WHEN** o usuário informa um CPF que tem e-mail cadastrado
- **THEN** o código é enviado a esse e-mail e a tela mostra o endereço mascarado, no formato `m*****@gmail.com`

#### Scenario: Código correto cria a sessão
- **WHEN** o usuário informa o código correto dentro de 10 minutos
- **THEN** a sessão é criada

#### Scenario: Código expirado
- **WHEN** o usuário informa o código depois de 10 minutos
- **THEN** o sistema recusa e oferece o envio de um novo código

#### Scenario: Excesso de tentativas no mesmo código
- **WHEN** o usuário erra o código 5 vezes
- **THEN** o código é invalidado e um novo precisa ser solicitado

#### Scenario: CPF sem e-mail cadastrado
- **WHEN** o usuário informa um CPF que não tem e-mail vinculado
- **THEN** a tela orienta a entrar por CPF e data de nascimento, sem confirmar se o CPF existe no sistema

#### Scenario: CPF inexistente
- **WHEN** o usuário informa um CPF que não está cadastrado
- **THEN** a resposta é indistinguível da de um CPF sem e-mail vinculado

### Requirement: Login por CPF e data de nascimento
O sistema SHALL permitir o login por CPF e data de nascimento, exclusivamente para usuários com papel `colaborador` ou `recepcao`.

#### Scenario: Colaborador sem e-mail entra
- **WHEN** um colaborador informa CPF e data de nascimento corretos
- **THEN** a sessão é criada

#### Scenario: Admin e gerentes são recusados
- **WHEN** um usuário com papel `admin`, `gerente_regional` ou `gerente_loja` informa CPF e data de nascimento corretos
- **THEN** o sistema recusa o login e orienta a usar um método baseado em e-mail, sem confirmar que o CPF existe

#### Scenario: Data de nascimento incorreta
- **WHEN** a data de nascimento não confere com o CPF informado
- **THEN** o sistema responde com mensagem genérica, sem informar qual campo está errado

#### Scenario: Usuário desativado é recusado
- **WHEN** um colaborador desativado informa CPF e data de nascimento corretos
- **THEN** o login é recusado com mensagem genérica

### Requirement: E-mails transacionais pelo Resend
Os e-mails de link mágico, código de acesso e redefinição de senha SHALL ser enviados pelo Resend, a partir de um remetente no domínio `agpremium.com.br`.

#### Scenario: E-mail entregue com identidade do remetente
- **WHEN** um e-mail transacional é enviado
- **THEN** parte do endereço configurado em `EMAIL_FROM`, no domínio `agpremium.com.br`, com assunto e conteúdo em português

#### Scenario: Falha no envio é tratada
- **WHEN** o provedor de e-mail retorna erro
- **THEN** o usuário vê uma mensagem orientando a tentar novamente, a falha é registrada, e a resposta não revela se o destinatário existe

#### Scenario: E-mail não expõe dados sensíveis
- **WHEN** um e-mail transacional é aberto
- **THEN** não contém CPF completo, senha nem dados de convidados

### Requirement: Encerramento de sessão
O usuário SHALL poder encerrar a sessão atual e, também, encerrar as sessões em todos os dispositivos.

#### Scenario: Sair do dispositivo atual
- **WHEN** o usuário escolhe sair
- **THEN** a sessão atual é encerrada e o acesso a rotas protegidas passa a exigir novo login

#### Scenario: Sair de todos os dispositivos
- **WHEN** o usuário escolhe sair de todos os dispositivos
- **THEN** todas as sessões dele são encerradas, inclusive em outros navegadores
