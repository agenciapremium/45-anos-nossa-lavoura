## ADDED Requirements

### Requirement: Ingresso com QR Code após a confirmação
Confirmada a presença, o sistema SHALL exibir o ingresso com QR Code, identificação do titular e do acompanhante e os dados da palestra.

#### Scenario: Ingresso exibido logo após confirmar
- **WHEN** a confirmação é aceita
- **THEN** o visitante vê, na mesma tela, o QR Code, o nome do titular, o nome do acompanhante quando informado, e cidade, data, horário, local e endereço da palestra

#### Scenario: Ingresso informa que vale para duas pessoas
- **WHEN** o ingresso é exibido
- **THEN** deixa explícito que dá entrada para o titular e um acompanhante

#### Scenario: Ingresso continua acessível no mesmo dispositivo
- **WHEN** o titular reabre o mesmo link no mesmo dispositivo
- **THEN** vê o ingresso novamente, sem precisar informar o CPF outra vez

### Requirement: QR Code sem dados pessoais
O conteúdo do QR Code SHALL ser exclusivamente um token aleatório de 32 bytes, único por confirmação, e MUST NOT conter CPF, nome ou qualquer dado pessoal.

#### Scenario: Conteúdo do QR
- **WHEN** o QR Code é decodificado
- **THEN** contém apenas um token opaco, sem CPF, nome ou identificador de palestra legível

#### Scenario: Token é único e imprevisível
- **WHEN** duas confirmações são criadas
- **THEN** seus tokens são diferentes e não guardam relação previsível entre si

### Requirement: Salvar o ingresso e adicionar à agenda
O ingresso SHALL oferecer o salvamento como imagem e a adição da palestra à agenda do dispositivo.

#### Scenario: Salvar como imagem
- **WHEN** o titular toca em "Salvar ingresso"
- **THEN** recebe uma imagem contendo o QR Code, os nomes e os dados da palestra, utilizável offline na entrada do evento

#### Scenario: Adicionar à agenda
- **WHEN** o titular toca em "Adicionar à agenda"
- **THEN** recebe um arquivo `.ics` com título, data, horário, local e endereço da palestra no fuso America/Porto_Velho

### Requirement: Recuperação do ingresso em outro dispositivo
O titular SHALL poder recuperar o ingresso em outro dispositivo informando o CPF confirmado e o código do convite, em `/palestras/ingresso`.

#### Scenario: Recuperação com CPF e código corretos
- **WHEN** o titular informa o CPF confirmado e o código daquele convite
- **THEN** vê o mesmo ingresso, com o mesmo QR Code

#### Scenario: CPF não confere com o convite
- **WHEN** o CPF informado não é o da confirmação daquele código
- **THEN** o sistema responde com uma mensagem neutra, sem informar se o código existe ou qual CPF está vinculado

#### Scenario: Ingresso de convite cancelado não é recuperado
- **WHEN** o titular tenta recuperar o ingresso de uma confirmação cancelada
- **THEN** o sistema informa que o convite foi cancelado e não exibe QR Code

#### Scenario: Proteção contra tentativa automatizada
- **WHEN** um mesmo IP faz tentativas repetidas de recuperação sem sucesso
- **THEN** as tentativas seguintes são recusadas temporariamente
