## ADDED Requirements

### Requirement: Duas superfícies, os mesmos tokens

A interface SHALL usar exclusivamente os tokens de `tokens.css`, sem valor literal de cor, raio, tipografia ou sombra. Ela SHALL distinguir duas superfícies: a **interna** (painel, administração, relatórios), com cartão branco sobre creme e borda hairline de 1px; e a **de marca** (telas públicas, ingresso, login, PDF e lista impressa), com borda de 2px em terra e elevação por laje de cor. Blur de fundo MUST NOT ser usado em nenhuma das duas.

#### Scenario: Tela interna usa a superfície interna

- **WHEN** qualquer tela autenticada de trabalho é renderizada
- **THEN** seus cartões têm fundo branco, borda de 1px e raio de cartão, sem laje de cor

#### Scenario: Tela do convidado mantém a linguagem de marca

- **WHEN** a página de confirmação ou o ingresso é renderizado
- **THEN** os blocos usam borda de 2px em terra e laje de cor

### Requirement: Estado do convite com ponto, cor e palavra

Todo lugar que mostrar estado de convite SHALL usar o mesmo selo, com ponto colorido, cor de fundo e a palavra do estado. A cor MUST NOT ser o único sinal do estado.

#### Scenario: Estado legível sem depender de cor

- **WHEN** um convite confirmado aparece na lista, no detalhe, nos relatórios ou na porta do evento
- **THEN** em todos eles aparece a palavra "Confirmado" junto do ponto e da cor

### Requirement: Alvo de toque e foco visível

Controles acionáveis SHALL ter no mínimo 44 px de altura, e no mínimo 48 px nas telas do convidado e na porta do evento. Todo controle SHALL ter foco visível com anel em lima e afastamento de 2 px.

#### Scenario: Recepção opera de pé, com uma mão

- **WHEN** a tela de check-in é usada em um celular
- **THEN** os botões de alternar modo, buscar e confirmar entrada têm ao menos 48 px de altura

#### Scenario: Navegação por teclado

- **WHEN** o usuário percorre a tela com Tab
- **THEN** cada controle recebe anel de foco visível, inclusive os itens do menu lateral

### Requirement: Lista densa no desktop, cartão no celular

Listas longas de trabalho SHALL ser apresentadas como tabela em telas largas e como cartões em telas estreitas, a partir da mesma fonte de dados. O dado sensível que hoje não viaja para o navegador MUST continuar não viajando em nenhuma das duas apresentações.

#### Scenario: Convites em tabela no desktop

- **WHEN** a lista de convites é aberta em uma tela de 1.440 px
- **THEN** ela aparece como tabela com código, palestra, colaborador, convidado ou anotação, estado e ações

#### Scenario: Convites em cartão no celular

- **WHEN** a mesma lista é aberta em 390 px
- **THEN** cada convite aparece como cartão, com copiar e WhatsApp como botões grandes

#### Scenario: Link do convite não vaza para quem só lê

- **WHEN** um gerente abre a lista de convites da loja dele
- **THEN** o endereço do convite e a mensagem de WhatsApp não estão no documento recebido pelo navegador, nas duas apresentações

### Requirement: Abas segmentadas com estado na URL

Grupos de opções mutuamente exclusivas que trocam o conteúdo da tela SHALL usar o controle de abas segmentadas: trilho em creme, aba ativa elevada em branco, e cada aba sendo um link cujo destino carrega o estado. O estado MUST NOT depender de JavaScript para a primeira renderização.

#### Scenario: Método de acesso escolhido pela URL

- **WHEN** alguém abre a tela de acesso com o método "CPF e nascimento" no endereço
- **THEN** a aba correspondente aparece ativa e o formulário certo é renderizado, mesmo antes de o script carregar

#### Scenario: Voltar funciona

- **WHEN** o usuário troca de aba e aciona o botão voltar do navegador
- **THEN** a aba anterior volta a ficar ativa

### Requirement: Copy sem travessão

Nenhum texto de interface SHALL conter os caracteres `—` ou `–`. Para separar fatos na mesma linha usa-se ` · `; para explicar, dois-pontos; para apor, vírgula; para definir, parênteses; para intervalos, "de X a Y".

#### Scenario: Interface entregue sem travessão

- **WHEN** a suíte de testes roda sobre `app/`, `components/` e os textos de `lib/palestras/`
- **THEN** o teste de copy passa, e nenhum literal de interface contém travessão ou meia-risca

#### Scenario: Teste nomeia o ponto exato quando falha

- **WHEN** alguém introduz um travessão em um texto de interface
- **THEN** o teste falha indicando o arquivo e o trecho
