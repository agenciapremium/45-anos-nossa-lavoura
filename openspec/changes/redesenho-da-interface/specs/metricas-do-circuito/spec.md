## ADDED Requirements

### Requirement: Tela de métricas dentro do escopo

O sistema SHALL oferecer a tela `/palestras/painel/metricas` para os papéis com alcance em `verConvitesEConfirmacoes` acima de `proprios`. Todos os números SHALL ser calculados dentro do escopo de quem consulta, pelas mesmas regras de `lib/palestras/escopo.ts`. A tela MUST NOT expor nome, CPF ou telefone de convidado.

#### Scenario: Gerente regional vê apenas a própria regional

- **WHEN** um gerente regional abre a tela de métricas
- **THEN** os totais, o funil e os rankings consideram apenas as lojas da regional dele

#### Scenario: Admin vê o circuito inteiro

- **WHEN** o Admin abre a tela com o contexto em "todas as palestras"
- **THEN** os números somam as quatro palestras

#### Scenario: Colaborador não acessa

- **WHEN** um colaborador tenta abrir a tela de métricas
- **THEN** o acesso é recusado pelo servidor, e o item não aparece no menu dele

### Requirement: Indicadores do circuito

A tela SHALL apresentar, para a palestra em contexto ou para todas, os totais de convites gerados, disponíveis, confirmados, presentes, cancelados e expirados, e a taxa de confirmação sobre os gerados.

#### Scenario: Totais batem com a lista de convites

- **WHEN** o usuário compara os indicadores com a contagem por estado da tela de convites, no mesmo contexto
- **THEN** os números são idênticos

#### Scenario: Palestra ainda não realizada

- **WHEN** a palestra em contexto ainda não aconteceu
- **THEN** presentes aparece como zero e a taxa de comparecimento é apresentada como ainda não medida, nunca como 0%

### Requirement: Funil do convite

A tela SHALL apresentar o funil em quatro etapas: gerados, com anotação de envio, confirmados e presentes. Cada etapa SHALL mostrar o valor absoluto e o percentual em relação à etapa anterior.

#### Scenario: Funil com etapas comparáveis

- **WHEN** existem 3.900 gerados e 1.898 confirmados no escopo
- **THEN** a etapa de confirmados mostra 1.898 e o percentual sobre a etapa anterior

### Requirement: Confirmações por dia

A tela SHALL apresentar a série diária de confirmações dos últimos 14 dias, agregada no fuso America/Porto_Velho, com o total do período.

#### Scenario: Dia sem confirmação aparece na série

- **WHEN** um dia do período não teve nenhuma confirmação
- **THEN** o dia aparece na série com valor zero, e não é omitido

#### Scenario: Corte de dia segue o fuso do evento

- **WHEN** uma confirmação acontece às 23h30 de 12/10 em Porto Velho
- **THEN** ela é contada no dia 12/10

### Requirement: Desempenho por regional e por loja

A tela SHALL apresentar confirmados e taxa de confirmação por regional e a relação das lojas com melhor conversão, sempre dentro do escopo. Cancelados MUST continuar contando em "gerados", e a tela SHALL dizer isso.

#### Scenario: Gerente de loja não vê ranking de outras lojas

- **WHEN** um gerente de loja abre a tela
- **THEN** o desempenho apresentado é o da loja dele e dos colaboradores dela

### Requirement: Definições de taxa visíveis na tela

Cada taxa apresentada SHALL trazer, na própria tela, o que entra no numerador e no denominador.

#### Scenario: Leitor confere o cálculo sem sair da tela

- **WHEN** a tela mostra a taxa de confirmação
- **THEN** ao lado dela está escrito que é confirmados dividido por gerados, com cancelados incluídos em gerados

### Requirement: Alertas acionáveis

A tela SHALL destacar situações que pedem ação no escopo de quem consulta: prazo de confirmação vencendo no dia, convites disponíveis que vão expirar com o prazo, e colaboradores sem nenhum convite distribuído. Cada alerta SHALL levar à tela onde a ação acontece.

#### Scenario: Prazo vencendo hoje

- **WHEN** uma palestra do escopo tem prazo de confirmação no dia corrente e ainda há convites disponíveis
- **THEN** a tela mostra o alerta com a quantidade que vai expirar e um caminho para a lista de convites

#### Scenario: Nada a destacar

- **WHEN** não há prazo vencendo nem colaborador parado no escopo
- **THEN** a área de alertas informa que não há nada a destacar, em vez de ficar vazia
