## ADDED Requirements

### Requirement: Números por palestra e por loja
O sistema SHALL apresentar, por palestra e por loja, a quantidade de convites gerados, confirmados, presentes, cancelados e expirados, dentro do escopo do usuário.

#### Scenario: Números de uma palestra
- **WHEN** um usuário com permissão abre os números de uma palestra
- **THEN** vê as cinco quantidades, e a soma de confirmados, presentes, cancelados, expirados e disponíveis corresponde ao total de convites gerados no seu escopo

#### Scenario: Números por loja
- **WHEN** o usuário detalha uma palestra por loja
- **THEN** vê as mesmas quantidades para cada loja do seu escopo

#### Scenario: Presentes contam como participação
- **WHEN** um convite tem check-in registrado
- **THEN** ele é contado como presente e não é contado novamente entre os confirmados sem presença

#### Scenario: Confirmado sem check-in é ausência
- **WHEN** a palestra termina e um confirmado não teve check-in
- **THEN** ele permanece `confirmado` e é tratado como ausência nos números

### Requirement: Taxas de confirmação e comparecimento
O sistema SHALL calcular a taxa de confirmação como confirmados divididos por gerados e a taxa de comparecimento como presentes divididos por confirmados.

#### Scenario: Cálculo das taxas
- **WHEN** uma palestra tem 500 convites gerados, 200 confirmados e 150 presentes
- **THEN** a taxa de confirmação exibida é 40% e a taxa de comparecimento é 75%

#### Scenario: Divisor zero
- **WHEN** não há convites gerados ou não há confirmados
- **THEN** a taxa correspondente é exibida como indisponível, sem erro

#### Scenario: Cancelados no denominador
- **WHEN** convites são cancelados
- **THEN** eles permanecem no total de gerados para o cálculo da taxa de confirmação, e a definição usada fica explícita na tela

### Requirement: Números respeitam o escopo do papel
Os números SHALL refletir apenas o escopo do usuário que os consulta.

#### Scenario: Escopo do gerente de loja
- **WHEN** um gerente de loja consulta os números
- **THEN** vê apenas os da sua loja

#### Scenario: Escopo do gerente regional
- **WHEN** um gerente regional consulta os números
- **THEN** vê os da sua regional, detalhados por loja

#### Scenario: Visão completa do Admin
- **WHEN** o Admin consulta os números
- **THEN** vê o total do circuito e pode detalhar por regional, loja e colaborador
