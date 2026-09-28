## ADDED Requirements

### Requirement: Visão de equipe por escopo
Gerentes e Admin SHALL ver, em `/palestras/painel/equipe`, os números de convites do seu escopo, agrupados por loja e por colaborador.

#### Scenario: Gerente de loja vê a própria loja
- **WHEN** um gerente de loja abre a visão de equipe
- **THEN** vê, por colaborador da sua loja, quantos convites foram gerados, confirmados, cancelados, expirados e presentes

#### Scenario: Gerente regional vê as lojas da regional
- **WHEN** um gerente regional abre a visão de equipe
- **THEN** vê os números por loja da sua regional e pode abrir uma loja para ver por colaborador

#### Scenario: Admin vê todas as regionais
- **WHEN** o Admin abre a visão de equipe
- **THEN** vê os números por regional e pode descer até loja e colaborador

#### Scenario: Escopo não vaza por URL
- **WHEN** um gerente de loja acessa por URL a visão de outra loja
- **THEN** o sistema responde 403

#### Scenario: Filtro por palestra
- **WHEN** o usuário filtra a visão de equipe por palestra
- **THEN** todos os números passam a refletir apenas aquela palestra

### Requirement: Taxas de confirmação e comparecimento
A visão de equipe SHALL apresentar, por palestra e por loja, a taxa de confirmação e a taxa de comparecimento.

#### Scenario: Taxa de confirmação
- **WHEN** uma loja tem 100 convites gerados e 40 confirmados
- **THEN** a taxa de confirmação exibida é 40%

#### Scenario: Taxa de comparecimento
- **WHEN** uma loja tem 40 confirmados e 30 com check-in
- **THEN** a taxa de comparecimento exibida é 75%

#### Scenario: Divisão por zero
- **WHEN** uma loja ainda não tem convites gerados ou confirmados
- **THEN** a taxa correspondente é exibida como indisponível, sem erro

### Requirement: Visão gerencial é somente leitura
Gerentes SHALL apenas consultar; as ações de gerar, enviar e cancelar convites MUST NOT ser oferecidas nem aceitas para esses papéis.

#### Scenario: Sem ações na interface
- **WHEN** um gerente abre a visão de equipe ou a lista de convites do seu escopo
- **THEN** não encontra botões de gerar, enviar ou cancelar

#### Scenario: Ação recusada no servidor
- **WHEN** um gerente envia diretamente uma requisição de geração, envio ou cancelamento
- **THEN** o sistema responde 403 e nada é alterado

### Requirement: Dados de convidados na visão gerencial
Gerentes SHALL ver, dos confirmados do seu escopo, nome do titular, nome do acompanhante e CPF mascarado.

#### Scenario: Lista de confirmados do escopo
- **WHEN** um gerente abre a lista de confirmados da sua loja ou regional
- **THEN** vê nome do titular, nome do acompanhante, CPF mascarado, loja e colaborador de origem

#### Scenario: CPF completo não é exposto a gerentes
- **WHEN** a resposta do servidor a um gerente é inspecionada
- **THEN** o CPF completo não está presente
