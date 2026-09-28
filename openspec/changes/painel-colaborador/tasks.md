## 1. Telas do painel para validação em preview

Implementadas em Next com dados de exemplo e validadas pela cliente no preview.

- [x] 1.1 Painel inicial do colaborador no celular, com números por palestra
- [x] 1.2 Lista de convites com filtros, contagens e as ações na linha
- [x] 1.3 Detalhe do convite confirmado, com titular, acompanhante e CPF mascarado
- [x] 1.4 Confirmação de cancelamento, nas variantes de convite disponível e confirmado
- [x] 1.5 Visão de equipe para gerente de loja, gerente regional e Admin
- [ ] 1.6 Definir com um colaborador real a ordenação padrão da lista e validar as telas com a cliente no preview — pendente de etapa humana. Decisão técnica provisória: ordenação por data da palestra e depois por código, igual à ordem já usada em `convitesNoEscopo`/`resumoDeConvites`. Precisa de confirmação com um colaborador de loja e com a cliente antes de ir para produção.

## 2. Painel inicial

- [x] 2.1 Criar a rota `/palestras/painel` com conteúdo por papel
- [x] 2.2 Implementar as consultas agregadas de números por palestra, respeitando o escopo do usuário
- [x] 2.3 Implementar os atalhos por papel, sem oferecer ações fora da permissão
- [x] 2.4 Medir o tempo da agregação na visão do Admin com dados de volume realista — `scripts/integracao-painel.ts`, seção 9: 2.560 convites de volume + os de teste, `resumoPorRegional` e `resumoPorLoja` ficaram entre 79 e 160 ms, folgado abaixo do gatilho de 1s de D5.

## 3. Lista de convites

- [x] 3.1 Criar a rota `/palestras/painel/convites` com consulta filtrada por escopo
- [x] 3.2 Implementar os filtros por palestra e por estado, com contagens que acompanham o filtro
- [x] 3.3 Aplicar a avaliação de expiração na leitura, igual à das rotas públicas
- [x] 3.4 Implementar a paginação e o layout de celular, sem rolagem horizontal
- [x] 3.5 Implementar a visão do convite confirmado com titular, acompanhante e CPF mascarado pela camada de dados
- [x] 3.6 Exibir data e hora do check-in nos convites em estado `presente`

## 4. Ações de distribuição

- [x] 4.1 Implementar "Copiar link" com a URL completa e confirmação visual
- [x] 4.2 Implementar "Enviar via WhatsApp" reaproveitando o montador de mensagem de `fundacao`
- [x] 4.3 Verificar que a mensagem do painel é idêntica à do PDF para o mesmo convite — `montarMensagemDoConvite` (`lib/palestras/mensagem.ts`) é o único montador, usado por `lib/palestras/pdf/montar.ts` e pela lista do painel; conferido em `tests/utilitarios.test.ts` e em `scripts/integracao-painel.ts` (seção 8).
- [x] 4.4 Oferecer as ações apenas para convites `disponivel`
- [x] 4.5 Recusar com 403 o envio solicitado por papéis sem permissão — não existe rota de "enviar": o WhatsApp é um link `wa.me` aberto pelo navegador, sem round-trip ao servidor (D1/PRD). A proteção real é anterior: o endereço e a mensagem do convite só entram no payload da página quando `permitido(escopo, 'enviarConvitePorWhatsapp', …)` é verdadeiro (`app/palestras/painel/convites/page.tsx`); para um gerente o campo chega `null` ao navegador, então não há o que copiar nem o que enviar, mesmo inspecionando o código-fonte.

## 5. Marcação de envio

- [x] 5.1 Adicionar o campo `enviado_para` ao convite, se ainda não existir — já existia (schema de `fundacao`); confirmado com `npm run db:generate` → "No schema changes, nothing to migrate".
- [x] 5.2 Implementar a marcação, a edição e a remoção da anotação pelo colaborador
- [x] 5.3 Deixar explícito na interface que a anotação é um lembrete pessoal e não restringe quem pode confirmar
- [x] 5.4 Tornar a anotação visível, sem edição, para gerentes e Admin dentro do escopo
- [x] 5.5 Incluir o campo na política de retenção e eliminação — documentado em `docs/PAINEL-COLABORADOR.md`: `enviado_para` é uma coluna de `palestra_convite` e segue a mesma política de retenção indeterminada e eliminação manual pelo Admin definida em `confirmacao-convidado` (D9c); não há rotina de expurgo própria, nem nesta nem em nenhuma outra change ainda.

## 6. Cancelamento operacional

- [x] 6.1 Estender a transação de cancelamento de `confirmacao-convidado` com autor e motivo opcional — `executarTransacaoDeCancelamento` em `lib/palestras/servicos/confirmacao.ts`, chamada por `cancelarPeloConvidado` (comportamento inalterado) e pela nova `cancelarPeloPainel`.
- [x] 6.2 Implementar o cancelamento pelo colaborador, restrito aos próprios convites
- [x] 6.3 Implementar o cancelamento pelo Admin, sem restrição de escopo, inclusive de colaborador desativado
- [x] 6.4 Recusar com 403 o cancelamento por gerentes e por colaborador fora do escopo
- [x] 6.5 Implementar a confirmação explícita, nomeando o titular e avisando da perda do ingresso quando o convite estiver confirmado
- [x] 6.6 Recusar cancelamento após o prazo e em convites `cancelado`, `expirado` ou `presente`
- [x] 6.7 Garantir que o cancelamento de confirmado libera o CPF e invalida o ingresso
- [x] 6.8 Registrar autor, data e hora e motivo, e gravar o evento na auditoria

## 7. PDF do colaborador

- [x] 7.1 Adaptar o gerador de PDF de `fundacao` para receber o escopo do solicitante — `montarDadosDoPdf(escopo, colaboradorIdAlvo, eventoIds)`.
- [x] 7.2 Implementar o download pelo painel, ignorando qualquer identificador de colaborador vindo da requisição — `app/palestras/painel/convites/pdf/route.tsx` nem lê parâmetro de colaborador; o alvo é sempre `atual.usuarioId`.
- [x] 7.3 Recusar com 403 o pedido de PDF de outro colaborador e o pedido feito por gerentes
- [x] 7.4 Tratar o caso de colaborador sem convites disponíveis
- [x] 7.5 Registrar a geração na auditoria
- [x] 7.6 Comparar o PDF gerado pelo painel e pelo Admin para o mesmo colaborador e confirmar que são equivalentes — `scripts/integracao-painel.ts`, seção 8: mesmos códigos de convite, mesmo cabeçalho, mesma mensagem de WhatsApp.

## 8. Visão gerencial

- [x] 8.1 Criar a rota `/palestras/painel/equipe` com consultas agregadas por escopo
- [x] 8.2 Implementar a navegação regional → loja → colaborador, conforme o papel
- [x] 8.3 Implementar o filtro por palestra em toda a visão
- [x] 8.4 Calcular taxa de confirmação e taxa de comparecimento, tratando o caso de divisor zero — `lib/palestras/taxas.ts`, testado em `tests/taxas.test.ts` com os dois cenários exatos da spec.
- [x] 8.5 Implementar a lista de confirmados do escopo com CPF mascarado
- [x] 8.6 Garantir que nenhuma ação de escrita seja oferecida nem aceita para gerentes — a tela é só leitura: nenhum formulário de escrita existe nela.
- [x] 8.7 Testar o acesso por URL a escopo alheio e confirmar a resposta 403 — `scripts/integracao-painel.ts`, seção 3.

## 9. Verificação

- [x] 9.1 Testes de escopo: colaborador, gerente de loja, gerente regional e Admin, em consulta e em mutação — `scripts/integracao-painel.ts`, seções 2 e 3.
- [x] 9.2 Teste de que o CPF completo não aparece em nenhuma resposta do painel — `scripts/integracao-painel.ts`, seção 4, mais a cobertura já existente de `scripts/integracao.ts` para colaborador, gerente de loja e recepção.
- [x] 9.3 Teste do cancelamento de confirmado: ingresso invalidado e CPF liberado — `scripts/integracao-painel.ts`, seção 6.
- [ ] 9.4 Teste em celular real, com um colaborador, do fluxo completo de distribuição — pendente de etapa humana (aparelho físico e colaborador real).
- [x] 9.5 Validar os critérios de aceite do PRD para `painel-colaborador`, um a um — ver `docs/PAINEL-COLABORADOR.md`.
- [ ] 9.6 Piloto com uma loja antes de liberar para as demais — pendente de decisão de negócio/operação, fora do alcance de uma implementação de código.
