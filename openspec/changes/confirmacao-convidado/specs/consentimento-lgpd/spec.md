## ADDED Requirements

### Requirement: Aceite obrigatório da política de privacidade
A confirmação SHALL exigir o aceite explícito da política de privacidade da Nossa Lavoura, por caixa de seleção desmarcada por padrão.

#### Scenario: Caixa desmarcada por padrão
- **WHEN** o formulário de confirmação é exibido
- **THEN** a caixa de aceite aparece desmarcada

#### Scenario: Envio sem aceite é recusado
- **WHEN** o visitante envia o formulário sem marcar o aceite
- **THEN** o sistema recusa, aponta a caixa de aceite e nada é gravado

#### Scenario: Recusa também no servidor
- **WHEN** um envio chega ao servidor sem o aceite, contornando o navegador
- **THEN** o servidor recusa a confirmação

#### Scenario: Política abre em nova aba
- **WHEN** o visitante toca no link da política dentro do texto de aceite
- **THEN** a política da Nossa Lavoura abre em nova aba, sem perder o que já foi preenchido no formulário

### Requirement: Opt-in separado para comunicações
O formulário SHALL oferecer uma segunda caixa, opcional e desmarcada por padrão, para receber comunicações da Nossa Lavoura, independente do aceite obrigatório.

#### Scenario: Confirmação sem o opt-in
- **WHEN** o visitante marca apenas o aceite obrigatório e confirma
- **THEN** a confirmação é aceita e o registro indica que o convidado não autorizou comunicações

#### Scenario: Confirmação com o opt-in
- **WHEN** o visitante marca as duas caixas e confirma
- **THEN** o registro indica que o convidado autorizou comunicações

#### Scenario: Opt-in não é condição para confirmar
- **WHEN** o visitante deixa a segunda caixa desmarcada
- **THEN** a confirmação prossegue normalmente

### Requirement: Registro da evidência de consentimento
O sistema SHALL registrar, junto com cada confirmação, a data e a hora do aceite, a versão da política aceita, o endereço IP e o agente de usuário do navegador.

#### Scenario: Evidência gravada na confirmação
- **WHEN** uma confirmação é aceita
- **THEN** o registro contém data e hora do aceite, versão da política, IP e agente de usuário

#### Scenario: Versão da política é a vigente
- **WHEN** uma confirmação é aceita
- **THEN** a versão gravada é a configurada no sistema como vigente naquele momento, e não é alterada por mudanças posteriores

### Requirement: Canal do titular nas páginas públicas
As páginas públicas do módulo SHALL exibir, no rodapé, o link da política de privacidade e o canal de contato do encarregado de dados.

#### Scenario: Rodapé das páginas públicas
- **WHEN** um visitante abre `/palestras`, `/palestras/c/[codigo]` ou `/palestras/ingresso`
- **THEN** vê no rodapé o link da política de privacidade da Nossa Lavoura e o e-mail do encarregado de dados

### Requirement: Informação sobre guarda e revogação no formulário
O formulário de confirmação SHALL informar, junto dos checkboxes, que os dados são guardados enquanto durar a finalidade e que o titular pode pedir acesso, correção ou exclusão e revogar a autorização pelo canal do encarregado.

#### Scenario: Texto de apoio visível antes de confirmar
- **WHEN** o formulário de confirmação é exibido
- **THEN** o visitante vê, junto dos checkboxes, a informação sobre a guarda dos dados e o e-mail para revogação, sem precisar abrir a política

#### Scenario: Sem promessa de prazo determinado
- **WHEN** o texto de apoio é exibido
- **THEN** ele vincula a guarda à finalidade do circuito, sem anunciar um prazo fixo de eliminação

### Requirement: Textos de consentimento configuráveis
Os textos do aceite obrigatório, do opt-in e do apoio SHALL vir de configuração, de modo que uma revisão jurídica possa alterá-los sem alteração de código.

#### Scenario: Ajuste de texto sem deploy
- **WHEN** o texto do aceite é alterado na configuração
- **THEN** as novas confirmações passam a exibir e registrar o texto atualizado, sem necessidade de nova publicação da aplicação

#### Scenario: Confirmações anteriores preservam o que foi aceito
- **WHEN** o texto do aceite muda depois de confirmações já registradas
- **THEN** os registros anteriores continuam apontando a versão da política que foi de fato aceita

### Requirement: Eliminação a pedido do titular
O Admin SHALL poder atender a um pedido de exclusão ou revogação de consentimento, eliminando ou anonimizando os dados pessoais daquele titular, com registro em auditoria.

#### Scenario: Pedido de exclusão atendido
- **WHEN** o Admin executa a eliminação dos dados de um titular que pediu exclusão
- **THEN** nome, CPF, WhatsApp, cidade, propriedade, atividade e acompanhante deixam de ser recuperáveis, e o convite permanece com o histórico de estado, sem dados pessoais

#### Scenario: Eliminação registrada
- **WHEN** uma eliminação a pedido do titular é executada
- **THEN** a auditoria registra quem executou e quando, sem gravar os dados eliminados
