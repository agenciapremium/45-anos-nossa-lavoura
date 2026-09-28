## Why

Os convites existem e o login funciona, mas o colaborador ainda não tem por onde trabalhar. Hoje ele dependeria do PDF gerado pelo Admin e não teria como saber quem já confirmou, nem como cancelar um convite enviado por engano.

São cerca de 390 colaboradores distribuindo convites pelo WhatsApp em quatro praças, em poucos dias. O painel é a ferramenta de trabalho deles — e é também a primeira vez que gerentes de loja e regionais enxergam como a distribuição está indo no seu escopo.

## What Changes

- Painel inicial por papel em `/palestras/painel`, com os números da palestra e os atalhos pertinentes.
- Lista de convites em `/palestras/painel/convites`, com filtros por palestra e estado, e contagem por estado.
- Ações por convite disponível: copiar link e enviar pelo WhatsApp, usando a mensagem padrão da palestra.
- Marcação opcional de "enviado para", como controle pessoal do colaborador, sem travar nada.
- Cancelamento de convites pelo colaborador (os próprios) e pelo Admin (todos), até a véspera, em `disponivel` ou `confirmado`, com motivo opcional.
- Download do próprio PDF pelo colaborador, com o mesmo conteúdo do PDF gerado pelo Admin.
- Visão de confirmados: nome do titular, nome do acompanhante e CPF mascarado.
- Visão gerencial em `/palestras/painel/equipe`: números e listas por loja e por regional, conforme o escopo, sem poder gerar nem enviar convites.

## Capabilities

### New Capabilities

- `painel-convites`: lista de convites com filtros e contagens, cópia de link, envio pelo WhatsApp, marcação de envio e visão dos confirmados.
- `cancelamento-operacional`: cancelamento de convites pelo colaborador e pelo Admin, respeitando prazo, escopo e irreversibilidade.
- `pdf-proprio`: download, pelo colaborador autenticado, do PDF com os próprios convites disponíveis.
- `visao-gerencial`: números e listas por loja e por regional para gerentes e Admin, em modo somente leitura.

### Modified Capabilities

Nenhuma. As regras de PDF definidas em `fundacao` continuam valendo; esta change adiciona o acesso do colaborador ao próprio documento.

## Impact

- **Rotas novas**: `/palestras/painel`, `/palestras/painel/convites` e `/palestras/painel/equipe`, todas autenticadas.
- **Escrita**: transição de `palestra_convite` para `cancelado` e marcação de `palestra_confirmacao.ativa` quando um confirmado é cancelado; campo `enviado_para` do convite.
- **Reuso**: o gerador de PDF de `fundacao` passa a ser chamado também a partir da sessão do colaborador, com o escopo do usuário.
- **Dependências**: `auth-e-papeis` (sessão, papéis e escopo) e, por transitividade, `fundacao`.
- **Interação com `confirmacao-convidado`**: o cancelamento operacional compartilha a transação de cancelamento com o cancelamento feito pelo convidado.
