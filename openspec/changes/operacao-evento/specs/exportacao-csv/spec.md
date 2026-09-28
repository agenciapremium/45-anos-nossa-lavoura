## ADDED Requirements

### Requirement: Exportação CSV por palestra
O sistema SHALL exportar, por palestra, um arquivo CSV com os convites e as confirmações do escopo de quem exporta.

#### Scenario: Colunas do arquivo
- **WHEN** o arquivo é gerado
- **THEN** traz as colunas palestra, codigo_convite, estado, regional, loja, colaborador, titular_nome, titular_cpf, titular_whatsapp, cidade, propriedade, atividade, acompanhante_nome, confirmado_em, checkin_em e cancelado_em

#### Scenario: Todos os estados são exportados
- **WHEN** o arquivo é gerado
- **THEN** inclui convites em todos os estados, com o estado indicado em cada linha

#### Scenario: Campos vazios quando não se aplicam
- **WHEN** um convite `disponivel` é exportado
- **THEN** as colunas de dados do titular e de datas de confirmação e check-in ficam vazias, sem quebrar o formato

### Requirement: Arquivo compatível com Excel em português
O CSV SHALL abrir corretamente no Excel em pt-BR, com acentuação íntegra e colunas separadas.

#### Scenario: Codificação e separador
- **WHEN** o arquivo é aberto no Excel em português
- **THEN** o texto aparece com acentuação correta e cada coluna em sua célula, sem etapa de importação manual

#### Scenario: Valores com separador no conteúdo
- **WHEN** um campo de texto contém o caractere separador, aspas ou quebra de linha
- **THEN** o valor é escapado corretamente e não desloca as colunas

#### Scenario: CPF preservado como texto
- **WHEN** a coluna de CPF é aberta na planilha
- **THEN** mantém todos os dígitos, inclusive zeros à esquerda

#### Scenario: Datas legíveis
- **WHEN** as colunas de data e hora são abertas
- **THEN** aparecem no formato brasileiro, no fuso America/Porto_Velho

### Requirement: Conteúdo da exportação conforme o papel
A exportação SHALL respeitar o escopo e o nível de acesso a dados pessoais de quem a solicita.

#### Scenario: CPF completo apenas para o Admin
- **WHEN** o Admin exporta
- **THEN** a coluna titular_cpf traz o CPF completo

#### Scenario: CPF mascarado para os demais papéis
- **WHEN** um gerente exporta
- **THEN** a coluna titular_cpf traz o CPF mascarado

#### Scenario: Escopo do gerente
- **WHEN** um gerente regional exporta
- **THEN** o arquivo contém apenas convites de lojas da sua regional

#### Scenario: Papéis sem permissão
- **WHEN** um colaborador ou a Recepção tenta exportar
- **THEN** o sistema responde 403

### Requirement: Registro das exportações
Toda exportação SHALL ser registrada na auditoria com autor, palestra e data e hora.

#### Scenario: Exportação registrada
- **WHEN** um usuário exporta o CSV de uma palestra
- **THEN** a auditoria registra quem exportou, qual palestra e quando

#### Scenario: Exportação recusada também é registrada
- **WHEN** uma tentativa de exportação é recusada por falta de permissão
- **THEN** a tentativa é registrada para apuração
