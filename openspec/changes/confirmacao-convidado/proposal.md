## Why

Os convites já existem depois de `fundacao`, mas o link ainda não leva a lugar nenhum. Esta é a única tela que o produtor rural vê, e é ela que transforma um link distribuído no WhatsApp em presença confirmada. Precisa funcionar de primeira, no celular, para quem não vai pedir ajuda se travar.

A regra que sustenta todo o controle do circuito nasce aqui: o convite é aberto até alguém confirmar, e é o CPF do primeiro que confirmar que trava o link.

## What Changes

- Página pública `/palestras/c/[codigo]`, que exibe o formulário, o ingresso ou um aviso de estado, conforme a situação do convite.
- Formulário de confirmação com CPF, nome completo, WhatsApp, cidade, nome da propriedade, atividade (corte, leite, cria, outra) e nome do acompanhante (opcional).
- Trava do convite no CPF da primeira confirmação, com transação e trava de linha, de modo que dois envios simultâneos no mesmo link produzam uma única confirmação.
- Regra de CPF único no circuito: cada CPF confirma em uma única palestra; um cancelamento libera o CPF para confirmar em outra.
- Ingresso digital com QR Code, dados do titular, do acompanhante e da palestra, botão para salvar o ingresso como imagem e botão para adicionar à agenda (`.ics`).
- Recuperação do ingresso em outro dispositivo por CPF, em `/palestras/ingresso`.
- Cancelamento pelo convidado até 23h59 da véspera, definitivo.
- Aceite obrigatório da política de privacidade e opt-in opcional de comunicações, com registro de versão, data e hora, IP e navegador.
- Telas de estado inválido (já utilizado, expirado, cancelado) que não revelam nenhum dado do titular.

## Capabilities

### New Capabilities

- `confirmacao-presenca`: formulário público, validação dos dados, trava do convite no CPF, unicidade de confirmação por CPF no circuito e controle de concorrência.
- `ingresso-digital`: geração do ingresso com QR Code por token aleatório, exibição, salvamento como imagem, arquivo `.ics` e recuperação por CPF em outro dispositivo.
- `cancelamento-convidado`: cancelamento pelo próprio convidado até o prazo, com liberação do CPF e impossibilidade de reversão.
- `consentimento-lgpd`: aceite obrigatório da política, opt-in opcional de comunicações e registro completo da evidência de consentimento.
- `estados-do-link`: apresentação de cada estado do convite ao visitante, sem vazamento de dados pessoais.

### Modified Capabilities

Nenhuma. As capacidades de `fundacao` são consumidas, não alteradas.

## Impact

- **Rotas novas**: `/palestras/c/[codigo]` e `/palestras/ingresso`, ambas públicas e mobile first.
- **Escrita** nas tabelas `palestra_confirmacao` (criada em `fundacao`) e transição de `palestra_convite` para `confirmado` e `cancelado`.
- **Novas dependências**: `qrcode` para gerar o QR, biblioteca de captura de imagem do ingresso, gerador de `.ics`.
- **Rate limit** obrigatório nas rotas públicas de confirmação e de recuperação de ingresso; a infraestrutura de limite é definida em `auth-e-papeis`, então esta change precisa de uma proteção mínima já no lançamento (ver design).
- **LGPD**: é aqui que o sistema passa a tratar dados pessoais de titulares externos. O texto do aceite depende de validação com o DPO do Grupo Axia Agro.
- **Dependência**: `fundacao` (esquema, convites, palestras e prazos).
