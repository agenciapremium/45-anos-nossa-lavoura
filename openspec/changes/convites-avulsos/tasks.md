## 1. Banco e tipos

- [x] 1.1 Ajustar `lib/db/schema.ts`: `colaboradorId` anulável em `palestra_convite` e em `palestra_lote`, e `rotulo` (texto, até 80) em `palestra_lote`
- [x] 1.2 Gerar a migração com `npm run db:generate` e conferir que ela só faz `DROP NOT NULL` e `ADD COLUMN`, sem reescrever tabela nem tocar em linha existente
- [ ] 1.3 Aplicar com `npm run db:migrate`, com autorização explícita: o `.env` aponta para o mesmo Neon do deploy, não há banco de desenvolvimento separado. Rodar fora do horário de palestra e conferir que os convites atuais continuam intactos (não executado nesta sessão, por instrução explícita: precisa de autorização humana em produção)

## 2. Consultas: o convite sem colaborador precisa sobreviver ao join

- [x] 2.1 Trocar `innerJoin(user, ...)` por `leftJoin` em `convitesNoEscopo` e em `confirmacoesNoEscopo`, tornando anuláveis no tipo os campos derivados do colaborador (a mesma troca foi estendida a `conviteNoEscopo`, que alimenta o detalhe e compartilha `colunasDoConvite()`; decisão registrada no relatório desta sessão)
- [x] 2.2 Percorrer os erros de tipo que o passo anterior provoca e decidir, em cada tela, o texto de origem, sem deixar nenhum campo vazio
- [x] 2.3 Confirmar que `resumoPorRegional`, `resumoPorLoja` e `resumoPorColaborador` seguem com `innerJoin`, que é o que mantém o avulso fora dos recortes por construção
- [x] 2.4 Acrescentar `semColaborador` como filtro opcional de `convitesNoEscopo`, no padrão dos filtros que já existem lá
- [x] 2.5 Escrever os testes de escopo: Admin enxerga o avulso na lista, no resumo e no detalhe; colaborador, gerente de loja, gerente regional e recepção não o enxergam em nenhuma das três (`tests/convite-avulso.test.ts`, sem banco, roda em `npm test`)

## 3. Serviço de geração

- [x] 3.1 Criar `gerarLoteAvulso({ eventoId, quantidade, rotulo, ator })` em `lib/palestras/servicos/geracao.ts`, reaproveitando checagem de prazo, geração de código, inserção em blocos e transação única
- [x] 3.2 Validar a quantidade com `esquemaDeQuantidade`, o mesmo limite por operação da geração por colaborador
- [x] 3.3 Registrar a ação `lote_avulso.gerado` na auditoria com palestra, quantidade e rótulo
- [ ] 3.4 Teste de integração: lote avulso nasce com N convites disponíveis e sem colaborador; prazo vencido recusa; quantidade inválida recusa sem gravar nada (escrito em `scripts/integracao.ts`, seção 10; não executado nesta sessão, por instrução explícita, precisa do banco)

## 4. Geração na interface

- [ ] 4.1 Acrescentar à tela de gerar convites o segundo modo, em abas segmentadas, entre "Por colaborador" e "Avulso"
- [ ] 4.2 Formulário do modo avulso: palestra vinda do contexto, quantidade, rótulo opcional, e resumo lateral confirmando o que vai ser gerado
- [ ] 4.3 Server Action da geração avulsa, restrita ao Admin no servidor, no padrão das ações existentes
- [ ] 4.4 Conferir que a recusa para papéis sem permissão acontece no servidor, não só pela ausência do caminho na tela

## 5. Entrega dos links

- [ ] 5.1 Tela do lote: lista dos convites com código e endereço em texto, copiar um a um e copiar todos
- [ ] 5.2 PDF do lote avulso, reaproveitando `lib/palestras/pdf`, com cabeçalho da palestra e sem nome de colaborador
- [ ] 5.3 CSV do lote avulso, reaproveitando `lib/palestras/csv`
- [ ] 5.4 Lista dos lotes avulsos da palestra, com data, rótulo e quantidade, para reabrir os links depois
- [ ] 5.5 Garantir que nenhuma ação de envio por WhatsApp aparece no lote avulso

## 6. Leitura nas telas existentes

- [ ] 6.1 Lista de convites: coluna de origem mostra o rótulo do lote, ou "Avulso", e o filtro ganha a opção de origem avulsa
- [ ] 6.2 Detalhe do convite: origem "Administração" com o rótulo, no lugar do bloco de colaborador, loja e regional
- [ ] 6.3 Lista impressa: "Administração" nas colunas de loja e colaborador
- [ ] 6.4 Check-in, no resultado e na busca manual: origem "Administração"
- [ ] 6.5 Métricas e relatórios: linha "Avulsos" nos recortes por origem, com a definição escrita na tela

## 7. Fechamento

- [ ] 7.1 Rodar `npm run typecheck`, `npm test` e o teste de copy
- [ ] 7.2 Rodar as integrações de painel e operação contra o banco de desenvolvimento
- [ ] 7.3 Conferir a matriz de papéis de `docs/AUTH-E-PAPEIS.md` com um convite avulso no banco, papel por papel
- [ ] 7.4 Atualizar `docs/MODULO-PALESTRAS.md` e `docs/PAINEL-COLABORADOR.md` com a geração avulsa e o que ela muda nos recortes
- [ ] 7.5 Confirmar com a cliente as duas perguntas em aberto do design: rótulo obrigatório ou opcional, e se gerente regional também gera
