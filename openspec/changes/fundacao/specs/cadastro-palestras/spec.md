## ADDED Requirements

### Requirement: Cadastro de palestras pelo Admin
O Admin SHALL cadastrar, editar, listar e desativar palestras pela interface em `/palestras/admin/palestras`, sem que nenhuma palestra fique fixa no código.

#### Scenario: Admin cadastra uma palestra
- **WHEN** o Admin informa cidade, data, horário, nome do local e endereço e salva
- **THEN** a palestra é criada com um slug único e passa a aparecer na listagem e na página pública

#### Scenario: Admin cadastra as quatro palestras do circuito
- **WHEN** o Admin cadastra Vilhena (13/10/2026 19h), Espigão d'Oeste (14/10/2026 19h), Ji-Paraná (15/10/2026 19h) e Porto Velho (17/10/2026 10h30)
- **THEN** as quatro aparecem na listagem ordenadas por data, cada uma com seu prazo preenchido

#### Scenario: Papel sem permissão tenta cadastrar
- **WHEN** um usuário que não é Admin acessa `/palestras/admin/palestras`
- **THEN** o sistema responde 403 e não exibe nenhum dado de palestra

#### Scenario: Palestra com convites não pode ser excluída
- **WHEN** o Admin tenta excluir uma palestra que já tem convites gerados
- **THEN** o sistema recusa a exclusão e oferece a desativação como alternativa

### Requirement: Prazo de confirmação calculado e ajustável
Ao cadastrar uma palestra, o sistema SHALL preencher o prazo de confirmação como 23h59 do dia anterior à palestra, no fuso `America/Porto_Velho`, e MUST permitir que o Admin ajuste esse valor manualmente.

#### Scenario: Prazo preenchido automaticamente
- **WHEN** o Admin informa a data 13/10/2026 e salva a palestra
- **THEN** o campo de prazo é preenchido com 12/10/2026 23h59 (America/Porto_Velho)

#### Scenario: Admin ajusta o prazo manualmente
- **WHEN** o Admin edita o prazo de uma palestra para 11/10/2026 18h00 e salva
- **THEN** o valor ajustado é gravado e passa a valer para confirmações, cancelamentos e expiração

#### Scenario: Prazo posterior à palestra é recusado
- **WHEN** o Admin informa um prazo igual ou posterior à data e hora da palestra
- **THEN** o sistema recusa o salvamento com mensagem explicando que o prazo deve ser anterior à palestra

#### Scenario: Mudança de data recalcula o prazo não ajustado
- **WHEN** o Admin altera a data de uma palestra cujo prazo nunca foi ajustado manualmente
- **THEN** o prazo é recalculado para a véspera às 23h59 da nova data

### Requirement: Mensagem padrão de WhatsApp por palestra
Cada palestra SHALL ter uma mensagem padrão de convite, editável pelo Admin, com marcadores substituídos pelos dados reais no momento do envio.

#### Scenario: Mensagem inicializada com o texto padrão
- **WHEN** uma palestra é criada
- **THEN** sua mensagem vem preenchida com o texto padrão do circuito, contendo os marcadores `{cidade}`, `{data}`, `{horario}`, `{local}`, `{prazo}` e `{link}`

#### Scenario: Marcadores substituídos na geração do link wa.me
- **WHEN** o sistema monta o link `wa.me` de um convite
- **THEN** cada marcador é substituído pelos dados da palestra e pela URL daquele convite, e o texto final é codificado para URL

#### Scenario: Mensagem sem o marcador de link é recusada
- **WHEN** o Admin salva uma mensagem que não contém `{link}`
- **THEN** o sistema recusa a alteração e explica que o marcador `{link}` é obrigatório

#### Scenario: Marcador desconhecido é sinalizado
- **WHEN** o Admin salva uma mensagem contendo um marcador que o sistema não reconhece
- **THEN** o sistema avisa quais marcadores são válidos e recusa o salvamento
