## ADDED Requirements

### Requirement: Painel inicial por papel
O sistema SHALL apresentar, em `/palestras/painel`, um início adequado ao papel do usuário, com os números da palestra no seu escopo e atalhos para as ações que ele pode executar.

#### Scenario: Colaborador entra no painel
- **WHEN** um colaborador acessa o painel
- **THEN** vê, por palestra, quantos convites tem disponíveis, confirmados, cancelados e expirados, e o atalho para a lista de convites

#### Scenario: Gerente entra no painel
- **WHEN** um gerente de loja ou regional acessa o painel
- **THEN** vê os números agregados do seu escopo e o atalho para a visão de equipe, sem atalho para geração de convites

#### Scenario: Atalhos respeitam o papel
- **WHEN** qualquer usuário acessa o painel
- **THEN** só vê atalhos para ações permitidas ao seu papel

### Requirement: Lista de convites com filtros
O colaborador SHALL ver seus convites em `/palestras/painel/convites`, com filtro por palestra e por estado e contagem por estado.

#### Scenario: Filtro por palestra
- **WHEN** o colaborador filtra por uma palestra
- **THEN** a lista mostra apenas os convites daquela palestra, e as contagens refletem o filtro

#### Scenario: Filtro por estado
- **WHEN** o colaborador filtra por `disponivel`, `confirmado`, `cancelado`, `expirado` ou `presente`
- **THEN** a lista mostra apenas convites naquele estado

#### Scenario: Convite expirado aparece como expirado
- **WHEN** um convite `disponivel` tem o prazo vencido e a rotina de consolidação ainda não rodou
- **THEN** a lista já o apresenta como expirado

#### Scenario: Colaborador vê apenas os próprios convites
- **WHEN** um colaborador abre a lista
- **THEN** vê somente os convites gerados para ele, mesmo que a loja tenha outros colaboradores

#### Scenario: Lista utilizável no celular
- **WHEN** o colaborador abre a lista em um celular
- **THEN** consegue filtrar, copiar e enviar convites sem rolagem horizontal

### Requirement: Copiar o link do convite
Cada convite `disponivel` SHALL oferecer a cópia da URL completa para a área de transferência.

#### Scenario: Cópia com confirmação visual
- **WHEN** o colaborador toca em "Copiar link"
- **THEN** a URL completa do convite vai para a área de transferência e a interface confirma a cópia

#### Scenario: Cópia indisponível para convite não disponível
- **WHEN** o convite está `confirmado`, `cancelado`, `expirado` ou `presente`
- **THEN** a ação de copiar não é oferecida

### Requirement: Envio pelo WhatsApp a partir do painel
Cada convite `disponivel` SHALL oferecer o envio pelo WhatsApp, com a mensagem padrão da palestra já preenchida.

#### Scenario: Abertura do WhatsApp com a mensagem pronta
- **WHEN** o colaborador toca em "Enviar via WhatsApp"
- **THEN** o WhatsApp abre com a mensagem padrão daquela palestra, com os marcadores substituídos e o link daquele convite, e o colaborador escolhe o contato no próprio aplicativo

#### Scenario: Mesma mensagem do PDF
- **WHEN** o mesmo convite é enviado pelo painel e pelo PDF
- **THEN** o texto da mensagem é idêntico nos dois caminhos

#### Scenario: Gerentes não enviam convites
- **WHEN** um gerente de loja ou regional visualiza um convite
- **THEN** a ação de envio não é oferecida, e uma tentativa direta é recusada com 403

### Requirement: Marcação opcional de envio
O colaborador SHALL poder anotar para quem enviou um convite, como controle pessoal, sem que isso altere o estado do convite nem restrinja quem pode confirmar.

#### Scenario: Anotação registrada
- **WHEN** o colaborador marca um convite como enviado e informa um nome ou telefone
- **THEN** a anotação fica visível na lista dele

#### Scenario: Anotação não trava a confirmação
- **WHEN** um convite com anotação é confirmado por outra pessoa
- **THEN** a confirmação é aceita normalmente

#### Scenario: Anotação é editável e removível
- **WHEN** o colaborador altera ou apaga a anotação
- **THEN** a mudança é gravada, sem efeito sobre o convite

#### Scenario: Anotação restrita ao escopo
- **WHEN** um gerente consulta os convites da sua loja ou regional
- **THEN** vê a anotação apenas como informação de apoio, sem poder editá-la

### Requirement: Visão dos convites confirmados
O colaborador SHALL ver, nos seus convites confirmados, o nome do titular, o nome do acompanhante quando houver e o CPF mascarado.

#### Scenario: Dados do confirmado
- **WHEN** o colaborador abre um convite confirmado
- **THEN** vê nome do titular, nome do acompanhante e CPF no formato `***.456.789-**`

#### Scenario: CPF completo não é exposto
- **WHEN** a resposta do servidor ao colaborador é inspecionada
- **THEN** o CPF completo não está presente

#### Scenario: Convite com presença registrada
- **WHEN** o convite está `presente`
- **THEN** a lista indica que o convidado compareceu, com a data e a hora do check-in
