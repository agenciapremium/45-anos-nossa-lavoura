## Context

O painel é a ferramenta de trabalho de cerca de 390 colaboradores, usada principalmente no celular, em lojas do interior de Rondônia, durante os dias que antecedem cada palestra. A maioria dessas pessoas não é usuária de sistemas internos — a tela precisa ser óbvia.

Para os gerentes, é a primeira visibilidade sobre a distribuição: quantos convites saíram, quantos voltaram confirmados, onde a conversão está travando. Essa visão é de leitura: o PRD é explícito em manter a geração de convites concentrada no Admin.

Esta change não cria regra de negócio nova. Ela dá interface e escopo ao que `fundacao` e `confirmacao-convidado` já definiram.

## Goals / Non-Goals

**Goals:**

- Fazer o colaborador conseguir distribuir convites pelo celular sem instrução.
- Dar ao gerente um retrato do seu escopo, sem lhe dar poder de operação.
- Reaproveitar, sem duplicar, o gerador de PDF e a transação de cancelamento já existentes.

**Non-Goals:**

- Geração de convites por gerentes (decisão explícita do PRD).
- Cotas por colaborador ou por loja.
- Reposição automática de convite cancelado: decidido que o Admin repõe manualmente.
- Envio automatizado pelo WhatsApp: o disparo continua manual, pelo `wa.me`.
- Lembretes ao convidado.

## Decisions

### D1. Um caminho de código por operação, chamado de dois lugares

Cancelamento e geração de PDF já existem em outras changes. Aqui eles ganham novos pontos de entrada, não novas implementações:

- **Cancelamento**: a transação escrita em `confirmacao-convidado` recebe um parâmetro de autor (convidado, colaborador ou Admin) e um motivo opcional. A regra de prazo, a liberação do CPF e a irreversibilidade ficam em um só lugar.
- **PDF**: o gerador de `fundacao` passa a receber o escopo do solicitante. Quando é o colaborador, o escopo é ele mesmo — o parâmetro de colaborador vindo da requisição é ignorado, não validado.

O critério de "mesmo conteúdo do PDF do Admin" é consequência de ser o mesmo código, não de duas implementações mantidas em paralelo.

### D2. Escopo aplicado na consulta, nunca na interface

Toda consulta do painel recebe o escopo do usuário, na forma definida em `auth-e-papeis`. A lista do colaborador não é "a lista geral filtrada na tela": é uma consulta que só sabe buscar convites daquele colaborador.

Consequência prática: um identificador de convite vindo do cliente nunca é usado sem passar pelo filtro de escopo. Não existe "buscar convite por id e depois checar se é seu" — existe "buscar convite por id dentro do escopo", que devolve nada quando está fora.

### D3. Expiração avaliada na leitura também no painel

O painel usa a mesma avaliação de expiração das rotas públicas: um convite `disponivel` com prazo vencido aparece como expirado, mesmo antes de o cron consolidar. Evita a situação de o colaborador ver "disponível" no painel e o convidado ver "expirado" ao abrir o link.

### D4. `enviado_para` é anotação livre, sem efeito de sistema

Campo de texto livre, visível só no escopo, sem validação de formato e sem qualquer efeito sobre quem pode confirmar. O PRD é claro: "só para controle dele (não trava nada)".

**Ponto de atenção de LGPD:** é um campo onde o colaborador vai digitar nome e telefone de terceiros que ainda não consentiram nada. Duas mitigações: deixar explícito na interface que a anotação é um lembrete pessoal, e incluir o campo na eliminação prevista na política de retenção. Vale confirmar com o DPO se o campo deve existir — a alternativa é uma marcação booleana de "enviado", sem identificar a quem.

### D5. Números calculados por consulta agregada, sem tabela de contadores

Com 390 colaboradores e alguns milhares de convites, uma agregação por palestra e loja é barata e sempre correta. Contadores materializados seriam otimização prematura e mais uma coisa a dessincronizar.

**Gatilho de revisão:** se a visão do Admin, que agrega todas as regionais, passar de um segundo, cachear por poucos minutos — nunca materializar.

### D6. Interface do colaborador desenhada para o polegar

A lista de convites no celular é a tela mais usada do sistema. Decisões que seguem daí: ações principais (copiar, WhatsApp) como botões grandes na própria linha, filtros fixos no topo, contagem por estado sempre visível, e nenhuma ação destrutiva a um toque de distância — cancelar pede confirmação explícita.

### D7. Cancelamento de confirmado avisa sobre a consequência

Cancelar um convite `confirmado` invalida o ingresso de alguém que já se programou para ir. A confirmação explícita nomeia o titular e avisa que ele perderá o ingresso. O sistema não notifica o convidado — não há canal de notificação no escopo do projeto —, então a responsabilidade de avisar é do colaborador, e a interface diz isso.

## Risks / Trade-offs

- **Colaborador cancela confirmado por engano** → confirmação explícita nomeando o titular, e registro de autor e motivo na auditoria. Não há desfazer: a reposição depende do Admin gerar um novo convite.
- **Convidado não é avisado do cancelamento** → limitação conhecida do escopo (sem notificações). A interface orienta o colaborador a avisar pelo WhatsApp.
- **`enviado_para` acumula dados de terceiros sem base legal clara** → ver D4; decisão pendente com o DPO.
- **Gerente querer gerar convites** → é uma decisão de produto do PRD, não uma limitação técnica. Provável ponto de atrito na operação; se a cliente mudar de ideia, vira uma change nova.
- **Painel do Admin lento com todas as regionais** → ver gatilho em D5.
- **Colaborador com muitos convites em tela pequena** → paginação e contagem por estado no topo, para não depender de rolagem longa.

## Migration Plan

Sem migração de dados. A change adiciona o campo `enviado_para` ao convite, se ele ainda não existir, e publica rotas autenticadas novas.

Sequência: MOCKUP validado → implementação → teste com usuários reais de uma loja piloto antes de liberar para as 39 lojas.

**Rollback:** despublicar as rotas do painel. Os convites e confirmações permanecem intactos; o Admin continua operando pelas telas de `fundacao`.

## Open Questions

**Resolvidas nesta rodada:**

- ~~Reposição após cancelamento~~: manual, pelo Admin. O painel precisa deixar claro que cancelar não devolve o convite ao colaborador.
- ~~Etapa de mockup~~: telas implementadas em Next e validadas no preview.

**Em aberto:**

- **PDF pelo colaborador** (definido nesta proposta, confirmar com a cliente): esta change assume que **sim**, o colaborador baixa o próprio PDF, conforme o fluxo 2 do PRD. Se a cliente preferir concentrar a distribuição do PDF no Admin, a capacidade `pdf-proprio` sai do escopo.
- **Campo "enviado para"** (ver D4): manter o texto livre com nome e telefone, ou trocar por uma marcação simples de "enviado"? Decisão com o DPO.
- **Ordenação padrão da lista**: por data de geração, por estado ou por anotação de envio? Definir no MOCKUP com um colaborador real.
