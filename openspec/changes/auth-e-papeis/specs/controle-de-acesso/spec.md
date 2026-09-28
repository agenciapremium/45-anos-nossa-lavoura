## ADDED Requirements

### Requirement: Papel único e escopo por vínculo
Cada usuário SHALL ter exatamente um papel, e o escopo de visão SHALL ser determinado pelo vínculo: regional para `gerente_regional`, loja para `gerente_loja` e `colaborador`, e nenhum limite para `admin`.

#### Scenario: Escopo do gerente regional
- **WHEN** um gerente regional consulta convites e confirmações
- **THEN** vê apenas os de lojas da sua regional

#### Scenario: Escopo do gerente de loja
- **WHEN** um gerente de loja consulta convites e confirmações
- **THEN** vê apenas os da sua loja

#### Scenario: Escopo do colaborador
- **WHEN** um colaborador consulta convites
- **THEN** vê apenas os convites gerados para ele

#### Scenario: Admin vê tudo
- **WHEN** o Admin consulta convites e confirmações
- **THEN** vê os de todas as regionais e lojas

### Requirement: Aplicação da matriz de permissões
O sistema SHALL aplicar a matriz de permissões do PRD em toda rota autenticada, verificando a permissão no servidor e não apenas escondendo elementos da interface.

#### Scenario: Somente Admin cadastra palestras e usuários
- **WHEN** um usuário que não é Admin tenta acessar o cadastro de palestras, de usuários ou a importação
- **THEN** o sistema responde 403

#### Scenario: Somente Admin gera convites
- **WHEN** um gerente regional ou de loja tenta acessar a geração de lotes
- **THEN** o sistema responde 403

#### Scenario: Gerentes não enviam nem cancelam convites
- **WHEN** um gerente regional ou de loja tenta enviar um convite pelo WhatsApp ou cancelá-lo
- **THEN** a ação é recusada com 403

#### Scenario: Check-in restrito
- **WHEN** um usuário que não é Admin nem Recepção tenta acessar a tela de check-in
- **THEN** o sistema responde 403

#### Scenario: Interface reflete as permissões
- **WHEN** um usuário abre o painel
- **THEN** vê apenas os atalhos e ações permitidos ao seu papel

### Requirement: Acesso fora do escopo é recusado
Uma tentativa de acessar um recurso fora do escopo do usuário, por URL direta ou por identificador em requisição, SHALL ser recusada com 403 e MUST NOT revelar nenhum dado do recurso.

#### Scenario: Gerente acessa loja de outra regional por URL
- **WHEN** um gerente regional acessa a URL de uma loja de outra regional
- **THEN** recebe 403 e nenhum dado daquela loja

#### Scenario: Colaborador acessa convite de outro colaborador
- **WHEN** um colaborador acessa por URL um convite gerado para outra pessoa
- **THEN** recebe 403

#### Scenario: Identificador fora do escopo em requisição
- **WHEN** um usuário envia uma requisição com o identificador de um recurso fora do seu escopo
- **THEN** o servidor recusa com 403, mesmo que a interface não ofereça essa ação

### Requirement: Recepção vê apenas o mínimo necessário
O papel `recepcao` SHALL ver, dos confirmados, apenas nome do titular, nome do acompanhante e CPF mascarado.

#### Scenario: Recepção consulta um confirmado
- **WHEN** a Recepção localiza um confirmado por busca ou leitura de QR
- **THEN** vê nome do titular, nome do acompanhante e CPF no formato `***.456.789-**`

#### Scenario: Recepção não vê contato nem dados de propriedade
- **WHEN** a Recepção consulta um confirmado
- **THEN** não vê WhatsApp, cidade, propriedade nem atividade

### Requirement: CPF mascarado fora do papel de Admin
O CPF completo de convidados SHALL ser visível apenas para o Admin; os demais papéis MUST ver o valor mascarado, tanto na interface quanto nas respostas do servidor.

#### Scenario: Colaborador vê o CPF do seu confirmado
- **WHEN** um colaborador abre a lista dos convites que confirmaram
- **THEN** vê o CPF mascarado

#### Scenario: CPF completo não trafega para papéis sem permissão
- **WHEN** a resposta do servidor a um papel que não é Admin é inspecionada
- **THEN** o CPF completo não está presente em nenhum campo

### Requirement: Desativação com efeito imediato
Um usuário desativado SHALL perder o acesso na requisição seguinte, sem depender da expiração da sessão.

#### Scenario: Sessão ativa é invalidada
- **WHEN** o Admin desativa um usuário que está com sessão aberta
- **THEN** a próxima requisição desse usuário é recusada e ele é levado à tela de login

#### Scenario: Login recusado após desativação
- **WHEN** um usuário desativado tenta entrar por qualquer método
- **THEN** o login é recusado com mensagem genérica
