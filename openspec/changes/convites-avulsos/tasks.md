## 1. Banco e tipos

- [x] 1.1 Ajustar `lib/db/schema.ts`: `colaboradorId` anulável em `palestra_convite` e em `palestra_lote`, e `rotulo` (texto, até 80) em `palestra_lote`
- [x] 1.2 Gerar a migração com `npm run db:generate` e conferir que ela só faz `DROP NOT NULL` e `ADD COLUMN`, sem reescrever tabela nem tocar em linha existente
- [x] 1.3 Aplicar com `npm run db:migrate` (autorizado pela cliente em 29/09/2026; migração `0006_lively_korvac.sql` aplicada no Neon de produção, com contagem de convites conferida antes e depois: intactos)

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
- [x] 3.4 Teste de integração: lote avulso nasce com N convites disponíveis e sem colaborador; prazo vencido recusa; quantidade inválida recusa sem gravar nada (`scripts/integracao.ts`, seção 10, executado: 17 checks passam)

## 4. Geração na interface

- [x] 4.1 Acrescentar à tela de gerar convites o segundo modo, em abas segmentadas, entre "Por colaborador" e "Avulso" (o modo vive na URL, `?modo=avulso`, como nas abas de métricas; a lista vazia de colaboradores deixou de tomar a tela e virou aviso dentro da aba dela, apontando para a avulsa)
- [x] 4.2 Formulário do modo avulso: palestra vinda do contexto, quantidade, rótulo opcional, e resumo lateral confirmando o que vai ser gerado (`formulario-avulso.tsx`; a palestra do contexto só entra pré-escolhida se ainda aceitar convites)
- [x] 4.3 Server Action da geração avulsa, restrita ao Admin no servidor, no padrão das ações existentes (`gerarAvulso`, com `exigirPapel(['admin'])` antes de qualquer leitura; sucesso redireciona para a tela do lote, em vez de deixar 20 convites gerados sem caminho até eles)
- [x] 4.4 Conferir que a recusa para papéis sem permissão acontece no servidor, não só pela ausência do caminho na tela (três camadas: `exigirPapel` na ação, `papel === 'admin'` nas rotas de PDF e CSV, e recusa em `loteAvulsoNoEscopo`/`lotesAvulsosDaPalestra`/`resumoAvulso` na camada de dados; testado em `tests/convite-avulso.test.ts`)

## 5. Entrega dos links

- [x] 5.1 Tela do lote: lista dos convites com código e endereço em texto, copiar um a um e copiar todos (`/palestras/admin/gerar/lote/[id]`; "copiar todos" põe um endereço por linha, formato que cola direto em planilha ou e-mail)
- [x] 5.2 PDF do lote avulso, reaproveitando `lib/palestras/pdf`, com cabeçalho da palestra e sem nome de colaborador (`montarDadosDoPdfDeLoteAvulso`; `LinhaDeConvitePdf.linkWhatsapp` virou anulável e `DadosDoPdf.semWhatsapp` troca a instrução do topo, que falava de escolher contato no WhatsApp)
- [x] 5.3 CSV do lote avulso, reaproveitando `lib/palestras/csv` (sem coluna de titular, CPF ou WhatsApp: é planilha de distribuição de links, e circula por e-mail; quem precisa do dado do convidado usa o CSV da palestra, que respeita o mascaramento por papel)
- [x] 5.4 Lista dos lotes avulsos da palestra, com data, rótulo e quantidade, para reabrir os links depois (`/palestras/admin/gerar/lotes`; mostra a quantidade pedida e a existente hoje lado a lado, porque elas divergem depois de um cancelamento e a divergência é informação)
- [x] 5.5 Garantir que nenhuma ação de envio por WhatsApp aparece no lote avulso (nem na tela do lote, nem no PDF, nem na linha do convite avulso na lista de convites: `AcoesDeEnvio` passou a esconder o botão quando não há `linkWhatsapp`, em vez de desenhar um `href="#"`)

## 6. Leitura nas telas existentes

- [x] 6.1 Lista de convites: coluna de origem mostra o rótulo do lote, ou "Avulso", e o filtro ganha a opção de origem avulsa (coluna renomeada de "Colaborador" para "Origem"; filtro com três opções, só para o Admin)
- [x] 6.2 Detalhe do convite: origem "Administração" com o rótulo, no lugar do bloco de colaborador, loja e regional (mais um link para abrir o lote de origem)
- [x] 6.3 Lista impressa: "Administração" nas colunas de loja e colaborador (já feito no grupo 2; conferido contra o banco na seção 12 de `scripts/integracao-operacao.ts`)
- [x] 6.4 Check-in, no resultado e na busca manual: origem "Administração". **Era um defeito, não um campo vazio**: `executarCheckin` fazia `innerJoin` em `user`, a consulta não devolvia linha para convite sem colaborador, o serviço lançava `RecusaDeCheckin('invalido')` e a transação inteira era desfeita — a portaria veria TELA VERMELHA para um convidado com ingresso válido. Corrigido para `leftJoin`, com o rótulo do lote chegando ao resultado; travado por teste de unidade e pela seção 12 da integração de operação. A busca manual usa `ConfirmadoParaRecepcao`, que por spec não tem origem nenhuma: nada a mudar lá
- [x] 6.5 Métricas e relatórios: linha "Avulsos" nos recortes por origem, com a definição escrita na tela (`resumoAvulso`, na lista por regional e na tabela por loja, com a aritmética explicada embaixo: as lojas somam X, os avulsos Y, e o total da palestra é X+Y)

## 7. Fechamento

- [x] 7.1 Rodar `npm run typecheck`, `npm test` e o teste de copy (308 testes, 0 falhas; `next build` também passa, o que cobre o lint e a fronteira servidor/cliente das telas novas)
- [x] 7.2 Rodar as integrações de painel e operação contra o banco (as cinco suítes passam: `integracao`, `painel`, `operacao`, `acesso`, `confirmacao`; a limpeza de `integracao-operacao.ts` passou a apagar os lotes antes do evento, senão o lote órfão barrava o `delete` por `on delete restrict`)
- [x] 7.3 Conferir a matriz de papéis de `docs/AUTH-E-PAPEIS.md` com um convite avulso no banco, papel por papel (seção 12 da integração de operação: o gerente regional não vê o convidado avulso na lista da porta; colaborador e recepção já eram recusados nas três leituras; a seção nova de `AUTH-E-PAPEIS.md` registra por que a exclusão cai do próprio mecanismo de escopo)
- [x] 7.4 Atualizar `docs/MODULO-PALESTRAS.md` e `docs/PAINEL-COLABORADOR.md` com a geração avulsa e o que ela muda nos recortes (mais `docs/AUTH-E-PAPEIS.md`, pela decisão de restringir a geração avulsa ao Admin)
- [x] 7.5 Confirmar com a cliente as duas perguntas em aberto do design: rótulo **opcional**, geração avulsa **só do Admin** (respondido em 29/09/2026; registrado em `design.md`)
