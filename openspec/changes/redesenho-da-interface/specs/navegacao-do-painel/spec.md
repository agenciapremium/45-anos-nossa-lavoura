## ADDED Requirements

### Requirement: Casca única para as telas autenticadas

Todas as telas autenticadas do módulo (painel, administração, relatórios e check-in) SHALL ser renderizadas dentro de uma mesma casca, composta por menu lateral fixo, barra de topo e área de conteúdo. As URLs existentes MUST permanecer inalteradas.

#### Scenario: Colaborador chega ao painel e consegue navegar

- **WHEN** um colaborador autenticado abre `/palestras/painel`
- **THEN** a tela mostra o menu lateral com os itens do papel dele
- **AND** cada item leva a uma rota que responde 200 para o papel dele

#### Scenario: Endereços antigos continuam válidos

- **WHEN** alguém abre `/palestras/admin/gerar` ou `/palestras/painel/convites`
- **THEN** a rota responde no mesmo endereço de antes, agora dentro da casca única

#### Scenario: Sessão sem escopo utilizável não passa da casca

- **WHEN** um gerente de loja sem loja vinculada abre qualquer tela da casca
- **THEN** o acesso é recusado antes de qualquer consulta de dados, como já ocorre hoje

### Requirement: Menu filtrado pelo papel

O menu SHALL renderizar apenas os itens cuja ação protegida correspondente tenha alcance diferente de `nenhum` para o papel da sessão, conforme a matriz de papéis. Esconder um item MUST NOT ser tratado como mecanismo de autorização: o middleware e a checagem de papel de cada rota continuam sendo a proteção.

#### Scenario: Colaborador não vê administração

- **WHEN** um colaborador abre qualquer tela da casca
- **THEN** o menu não mostra Palestras, Estrutura, Importar, Gerar convites, Auditoria, Equipe nem Relatórios

#### Scenario: Recepção vê check-in

- **WHEN** um usuário com papel recepção abre a casca
- **THEN** o menu mostra Check-in
- **AND** não mostra a exportação em CSV

#### Scenario: Rota protegida continua protegida sem o item de menu

- **WHEN** um colaborador digita `/palestras/admin` na barra de endereço
- **THEN** a resposta é a mesma de hoje para esse papel, sem depender da navegação

### Requirement: Palestra como contexto de navegação

A barra de topo SHALL oferecer um seletor de palestra que vale para as telas de convites, equipe, relatórios, métricas e check-in. A palestra corrente SHALL ser resolvida nesta ordem: parâmetro `palestra` da URL, valor memorizado na sessão do navegador, palestra que acontece no dia, primeira palestra ativa. O identificador vindo da URL ou da memória MUST ser validado contra as palestras ativas antes de alimentar qualquer consulta.

#### Scenario: Contexto atravessa a navegação

- **WHEN** o usuário escolhe "Ji-Paraná" na barra de topo e vai de Convites para Relatórios
- **THEN** Relatórios abre já em Ji-Paraná, sem novo filtro

#### Scenario: Link compartilhado vence a memória

- **WHEN** o usuário abre um endereço que traz `?palestra=<id de Porto Velho>` enquanto a memória guarda Ji-Paraná
- **THEN** a tela mostra Porto Velho

#### Scenario: Identificador inválido cai no padrão

- **WHEN** a URL traz uma palestra inexistente, inativa ou fora do escopo
- **THEN** a tela usa a palestra padrão e não executa consulta com o identificador recebido

#### Scenario: Dia da palestra é o padrão

- **WHEN** um usuário sem escolha anterior abre a casca no dia de uma palestra
- **THEN** o seletor já vem nessa palestra

### Requirement: Navegação no celular

Em telas estreitas o menu SHALL ficar recolhido atrás de um botão na barra de topo e abrir como gaveta sobre o conteúdo, com véu que fecha ao toque. Os itens da gaveta SHALL ter alvo de toque de no mínimo 44 px de altura.

#### Scenario: Colaborador abre o menu no celular

- **WHEN** o colaborador toca no botão de menu em uma tela de 390 px de largura
- **THEN** a gaveta abre com os mesmos itens do papel dele
- **AND** o conteúdo atrás recebe um véu que fecha a gaveta ao ser tocado

### Requirement: Identificação da sessão e saída

A casca SHALL mostrar, em todas as telas autenticadas, o primeiro nome e o papel de quem está logado, e oferecer a saída. A saída MUST continuar sendo um POST com Server Action, nunca um link GET.

#### Scenario: Sair do sistema

- **WHEN** o usuário aciona Sair
- **THEN** a sessão é encerrada por POST verificado contra a origem
- **AND** o usuário volta para a tela de acesso
