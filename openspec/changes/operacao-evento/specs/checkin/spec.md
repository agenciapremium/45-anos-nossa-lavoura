## ADDED Requirements

### Requirement: Tela de check-in por palestra
A Recepção e o Admin SHALL acessar `/palestras/checkin`, escolher a palestra e operar o check-in pelo celular.

#### Scenario: Escolha da palestra
- **WHEN** o operador abre a tela de check-in
- **THEN** escolhe entre as palestras disponíveis, com a palestra do dia sugerida por padrão

#### Scenario: Acesso restrito
- **WHEN** um usuário que não é Recepção nem Admin acessa `/palestras/checkin`
- **THEN** o sistema responde 403

#### Scenario: Operação no celular
- **WHEN** o operador usa a tela em um celular
- **THEN** consegue alternar entre leitura de QR e busca manual sem sair da tela

### Requirement: Leitura de QR pela câmera do navegador
O sistema SHALL ler o QR Code pela câmera do navegador, sem exigir instalação de aplicativo.

#### Scenario: Leitura bem-sucedida
- **WHEN** o operador aponta a câmera para um QR válido, com boa conexão
- **THEN** o resultado aparece na tela em até 2 segundos

#### Scenario: Permissão de câmera negada
- **WHEN** o navegador não recebe permissão de uso da câmera
- **THEN** a tela explica como conceder a permissão e oferece a busca manual como alternativa

#### Scenario: QR ilegível
- **WHEN** a câmera não consegue decodificar o código
- **THEN** a tela mantém a leitura ativa, sem travar, e o operador pode recorrer à busca manual

#### Scenario: Leituras em sequência
- **WHEN** o operador lê um QR logo após o anterior
- **THEN** a tela volta ao estado de leitura sem precisar ser recarregada

### Requirement: Três resultados do check-in
A tela SHALL apresentar um resultado visualmente distinto para cada desfecho: válido, já utilizado e inválido.

#### Scenario: Resultado válido
- **WHEN** o QR corresponde a um convite `confirmado` daquela palestra, no dia da palestra
- **THEN** a tela mostra o resultado verde com nome do titular, nome do acompanhante, loja e colaborador de origem, e o convite passa a `presente`

#### Scenario: Resultado já utilizado
- **WHEN** o QR corresponde a um convite que já teve check-in
- **THEN** a tela mostra o resultado amarelo, informando a data e a hora do primeiro check-in, e nenhum novo registro é criado

#### Scenario: Resultado inválido por estado
- **WHEN** o QR corresponde a um convite `cancelado` ou `expirado`
- **THEN** a tela mostra o resultado vermelho, informando o motivo

#### Scenario: Resultado inválido por palestra
- **WHEN** o QR corresponde a uma confirmação de outra palestra
- **THEN** a tela mostra o resultado vermelho, informando que o convite é de outra palestra, sem revelar qual

#### Scenario: Token desconhecido
- **WHEN** o QR lido não corresponde a nenhuma confirmação
- **THEN** a tela mostra o resultado vermelho, informando que o código não é reconhecido

### Requirement: Check-in único e restrito ao dia da palestra
Cada convite SHALL ter no máximo um check-in, aceito somente no dia da palestra.

#### Scenario: Segunda leitura do mesmo QR
- **WHEN** o mesmo QR é lido uma segunda vez
- **THEN** o sistema não cria novo registro e mostra o horário do primeiro check-in

#### Scenario: Check-in fora do dia
- **WHEN** um QR válido é lido em um dia diferente do dia da palestra, no fuso America/Porto_Velho
- **THEN** o sistema recusa o check-in e explica que ele só é aceito no dia da palestra

#### Scenario: Leituras simultâneas do mesmo convite
- **WHEN** dois dispositivos leem o mesmo QR ao mesmo tempo
- **THEN** apenas um registro de check-in é criado, e o outro dispositivo recebe o resultado de já utilizado

#### Scenario: Registro do check-in
- **WHEN** um check-in é aceito
- **THEN** ficam gravados o convite, quem fez, a data e a hora e o método usado

### Requirement: Busca manual como contingência
O operador SHALL poder localizar um confirmado por CPF ou por nome e fazer o check-in, produzindo o mesmo registro da leitura por QR.

#### Scenario: Busca por CPF
- **WHEN** o operador informa o CPF do titular
- **THEN** o sistema mostra o confirmado daquela palestra, se existir, com o botão de check-in

#### Scenario: Busca por nome parcial
- **WHEN** o operador informa parte do nome do titular
- **THEN** o sistema lista os confirmados daquela palestra que correspondem, com nome, acompanhante e CPF mascarado

#### Scenario: Check-in manual equivale ao do QR
- **WHEN** o operador faz o check-in pela busca manual
- **THEN** o convite passa a `presente` e o registro é idêntico ao do QR, exceto pelo método, que fica marcado como manual

#### Scenario: Busca restrita à palestra escolhida
- **WHEN** o operador busca alguém que confirmou em outra palestra
- **THEN** o resultado não aparece na busca da palestra escolhida

#### Scenario: Dados mostrados na busca
- **WHEN** a Recepção vê um resultado de busca
- **THEN** vê nome do titular, nome do acompanhante e CPF mascarado, sem WhatsApp, cidade, propriedade ou atividade

### Requirement: Entrada de duas pessoas por convite
O resultado válido SHALL deixar explícito que o convite libera a entrada do titular e de um acompanhante.

#### Scenario: Indicação na tela de resultado
- **WHEN** um check-in é aceito
- **THEN** a tela informa que a entrada vale para duas pessoas e mostra o nome do acompanhante quando houver

#### Scenario: Convite sem acompanhante
- **WHEN** o titular não informou acompanhante na confirmação
- **THEN** a tela indica que a entrada é apenas do titular
