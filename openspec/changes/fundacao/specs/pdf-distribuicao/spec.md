## ADDED Requirements

### Requirement: PDF de distribuição por colaborador
O sistema SHALL gerar, sob demanda, um PDF com os convites de um colaborador em uma ou mais palestras, para distribuição pelo WhatsApp.

#### Scenario: Admin gera o PDF de um colaborador
- **WHEN** o Admin escolhe um colaborador e uma palestra e pede o PDF
- **THEN** recebe um arquivo PDF com os convites daquele colaborador naquela palestra

#### Scenario: Várias palestras no mesmo arquivo
- **WHEN** o Admin escolhe duas palestras para o mesmo colaborador
- **THEN** o PDF traz um bloco por palestra, cada um com cidade, data, horário, local e prazo de confirmação

#### Scenario: Somente convites disponíveis
- **WHEN** o colaborador tem convites `disponivel`, `confirmado`, `cancelado` e `expirado`
- **THEN** o PDF lista apenas os `disponivel` no momento da geração

#### Scenario: Colaborador sem convites disponíveis
- **WHEN** todos os convites do colaborador já foram usados ou cancelados
- **THEN** o sistema informa que não há convites disponíveis e não gera um PDF vazio

### Requirement: Conteúdo e identidade do PDF
O PDF SHALL trazer a identidade do Acelera no Campo 3.0, a identificação do colaborador e o carimbo de geração.

#### Scenario: Cabeçalho do documento
- **WHEN** o PDF é aberto
- **THEN** o cabeçalho traz a identidade visual do Acelera no Campo 3.0, o nome do colaborador e o nome da loja

#### Scenario: Carimbo de geração
- **WHEN** o PDF é aberto
- **THEN** informa a data e a hora em que foi gerado, no fuso America/Porto_Velho

#### Scenario: Linha de convite
- **WHEN** o PDF lista um convite
- **THEN** a linha traz o número sequencial do convite no documento, a URL completa em texto puro selecionável e, à frente, o botão "Enviar via WhatsApp"

### Requirement: Botão de WhatsApp clicável no PDF
Cada linha de convite SHALL conter um link clicável para `https://wa.me/?text=` com a mensagem padrão da palestra já preenchida com aquele convite.

#### Scenario: Botão abre a mensagem preenchida
- **WHEN** o leitor clica no botão "Enviar via WhatsApp" de um convite
- **THEN** o WhatsApp abre com a mensagem padrão daquela palestra, com os marcadores substituídos e o link daquele convite específico

#### Scenario: Link em texto puro é copiável
- **WHEN** o leitor seleciona a URL impressa na linha
- **THEN** copia exatamente o endereço do convite, sem quebras de linha nem caracteres extras

#### Scenario: Mensagem codificada corretamente
- **WHEN** a mensagem contém acentos, quebras de linha e o caractere `&`
- **THEN** o texto chega íntegro ao WhatsApp, com a codificação de URL aplicada

### Requirement: Geração em lote compactada
O Admin SHALL poder gerar os PDFs de vários colaboradores numa só operação, recebendo um arquivo `.zip` com um PDF por colaborador.

#### Scenario: Lote por loja
- **WHEN** o Admin seleciona uma loja com dez colaboradores e pede os PDFs em lote
- **THEN** recebe um `.zip` com um PDF por colaborador que tenha convites disponíveis, cada arquivo nomeado com loja e colaborador

#### Scenario: Colaboradores sem convites são pulados
- **WHEN** parte dos colaboradores selecionados não tem convites disponíveis
- **THEN** o `.zip` traz apenas os PDFs dos demais, e a tela informa quem foi pulado e por quê
