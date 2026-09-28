## ADDED Requirements

### Requirement: Cada estado tem uma tela própria
A página do convite SHALL apresentar um conteúdo distinto para cada estado do convite, sempre com a identidade do Acelera no Campo 3.0 e com orientação sobre o que fazer.

#### Scenario: Convite disponível
- **WHEN** o convite está `disponivel` e dentro do prazo
- **THEN** a página exibe os dados da palestra e o formulário de confirmação

#### Scenario: Convite confirmado, acesso pelo titular
- **WHEN** o convite está `confirmado` e o acesso vem do dispositivo que confirmou
- **THEN** a página exibe o ingresso com QR Code e o botão de cancelamento, conforme o prazo

#### Scenario: Convite confirmado, acesso de outro dispositivo
- **WHEN** o convite está `confirmado` e o acesso vem de outro dispositivo ou navegador
- **THEN** a página informa que o convite já foi utilizado e orienta a recuperar o ingresso em `/palestras/ingresso`, sem exibir nome, CPF ou QR Code

#### Scenario: Convite expirado
- **WHEN** o convite está `disponivel` e o prazo da palestra já venceu
- **THEN** a página informa que o prazo de confirmação encerrou e orienta a procurar o colaborador que enviou o convite

#### Scenario: Convite cancelado
- **WHEN** o convite está `cancelado`
- **THEN** a página informa que o convite foi cancelado e orienta a procurar o colaborador que enviou o convite

#### Scenario: Convite já utilizado no evento
- **WHEN** o convite está `presente`
- **THEN** a página exibe o ingresso marcado como utilizado, sem oferecer cancelamento

### Requirement: Estados inválidos não vazam dados pessoais
As telas de estado inválido MUST NOT exibir nome, CPF, ainda que mascarado, WhatsApp, acompanhante ou QR Code.

#### Scenario: Nenhum dado do titular em convite já utilizado
- **WHEN** um visitante que não é o titular abre um convite confirmado
- **THEN** não vê nenhum dado pessoal do titular, nem na página nem no código-fonte dela

#### Scenario: Resposta idêntica para código inexistente e cancelado
- **WHEN** um visitante acessa um código de convite que não existe
- **THEN** recebe uma resposta indistinguível da de um convite cancelado, para não permitir descobrir códigos válidos por tentativa

### Requirement: Páginas de convite fora dos buscadores
As páginas de convite SHALL instruir os buscadores a não indexá-las.

#### Scenario: Metadados de indexação
- **WHEN** um rastreador acessa `/palestras/c/[codigo]` ou `/palestras/ingresso`
- **THEN** encontra a instrução `noindex`, e essas rotas não constam do `sitemap.xml`
