## Context

O módulo está inteiro entregue e funcionando: `fundacao`, `confirmacao-convidado`, `auth-e-papeis`, `painel-colaborador` e `operacao-evento`. O que falta é coesão de interface. Hoje existem três cascas independentes (`admin/layout.tsx` com barra de abas, `painel/layout.tsx` sem navegação nenhuma, e `relatorios`/`checkin` com cabeçalho montado na própria página), o filtro de palestra é um `<form method="get">` repetido em cinco telas, a lista de convites usa cartão onde caberia tabela, e não existe tela que responda "como está o circuito agora".

A cliente aprovou em 28/09/2026 um mockup navegável de 27 telas, que é a referência visual desta change. O circuito acontece em outubro de 2026, então a janela de aplicação é curta e o sistema não pode ficar quebrado entre um passo e outro.

Restrições que não mudam: o design system de `tokens.css`, a matriz de papéis de `lib/palestras/papeis.ts`, o escopo de `lib/palestras/escopo.ts`, o mascaramento de CPF, os limites e a auditoria.

## Goals / Non-Goals

**Goals:**

- Uma casca só para todas as telas autenticadas, com navegação visível e filtrada por papel.
- Palestra como contexto que atravessa a navegação, em vez de filtro por tela.
- Uma tela que responda "como está o circuito agora", com os números que já existem no banco.
- Densidade adequada a cada uso: mesa de trabalho no desktop, alvo grande na porta do evento e no celular do convidado.
- Nenhuma regressão de segurança: o que o servidor barra hoje continua barrado.

**Non-Goals:**

- Mudar regra de domínio, schema, Server Action, autenticação ou geração de PDF.
- Mexer na landing dos 45 anos e em `/foto-comemorativa`.
- Introduzir biblioteca de componentes, de gráficos ou de ícones.
- Tema escuro, internacionalização, ou qualquer coisa que o mockup não mostre.

## Decisions

### D1. Uma casca em route group, não dois layouts irmãos

As telas autenticadas passam a viver em `app/palestras/(interno)/`, com um `layout.tsx` único que renderiza menu lateral, barra de topo e a área de conteúdo. As rotas não mudam de endereço: o route group não aparece na URL, então `/palestras/painel/convites` e `/palestras/admin/gerar` continuam iguais.

*Alternativa considerada:* manter os dois layouts e só uniformizar o estilo. Rejeitada porque o problema é a navegação, não a pintura: um colaborador que abre `/palestras/painel` hoje não tem como chegar a lugar nenhum sem digitar a URL.

*Consequência:* `exigirEscopo()` sobe para o layout do grupo e cada tela mantém a própria checagem de papel. A dupla camada de autorização de `auth-e-papeis` (D4 daquela change) continua valendo, agora com o layout como primeira camada de aplicação e o middleware como barreira anterior.

### D2. Contexto de palestra: cookie como memória, querystring como autoridade

O seletor da barra de topo grava a palestra escolhida num cookie de sessão (`palestra_atual`, `httpOnly`, `sameSite=lax`). Toda tela lê a palestra nesta ordem: `?palestra=` da URL, senão o cookie, senão a palestra do dia, senão a primeira ativa.

*Alternativa considerada:* só querystring. Perde o contexto a cada troca de seção, que é justamente a dor. Só cookie: quebra o link compartilhável, que hoje funciona em relatórios e auditoria.

*Consequência:* o id que vem da URL continua validado contra a lista de palestras ativas antes de ir para qualquer consulta, como já é feito hoje em `painel/convites/page.tsx`. Cookie não é fonte de autorização: escopo continua saindo da sessão.

### D3. O menu sai da matriz de papéis, não de uma lista escrita à mão

Cada item do menu declara a ação protegida que o habilita (`alcanceDe(papel, acao) !== 'nenhum'`), no mesmo padrão que `painel/page.tsx` já usa para os atalhos. Itens sem alcance não são renderizados.

Isto é cortesia, não proteção: continuam valendo o `matcher` do middleware e o `exigirPapel` de cada rota. Esconder um item não protege nada; oferecer um botão que responde 403 é desrespeito com quem clica.

### D4. Duas superfícies, zero token novo

O design system fica como está. A change define duas superfícies compostas a partir dos tokens existentes:

- **Interna** (painel, administração, relatórios): fundo `--surface-page`, cartão `--surface-card`, borda `--border-hairline` de 1px, raio `--radius-card`, sem laje de cor.
- **Pública e de marca** (páginas do convidado, ingresso, PDF, lista impressa): borda de 2px em `--border-strong` e `--shadow-slab-sm`, como hoje.

A tela de acesso é o caso de fronteira: o painel de marca em terra, à esquerda, carrega o peso da marca, e o cartão do formulário, à direita, fica com a borda hairline da superfície interna. É o que o artboard `Entrar` mostra e o que está implementado.

*Alternativa considerada:* aplicar a borda de 2px também no interno, por aderência literal ao sistema. Rejeitada: em uma tabela de 20 linhas com cartões aninhados, a borda pesada vira ruído e come espaço vertical. A decisão está registrada aqui porque é um desvio deliberado do sistema, e foi aprovada com o mockup.

### D5. Métricas em SVG renderizado no servidor, sem biblioteca de gráfico

`lib/palestras/metricas.ts` concentra as agregações novas, todas recebendo `Escopo` como primeiro argumento, no padrão de `lib/palestras/dados.ts`:

- série diária de confirmações por palestra (`date_trunc('day', ...)` em `America/Porto_Velho`);
- funil gerados → com anotação de envio → confirmados → presentes;
- resumo por regional e por loja, reaproveitando `resumoPorRegional` e `resumoPorLoja`;
- contagem de colaboradores sem nenhum convite distribuído.

Os gráficos são SVG escrito à mão em Server Components: linha de 2px com área a 10%, barras com ponta arredondada de 4px, grade de 1px em `--creme-700`. Uma série por gráfico, então não há legenda de cor; rótulos diretos nas pontas.

*Alternativa considerada:* Recharts ou similar. Rejeitada: obrigaria componente de cliente, pesaria no bundle da tela mais acessada por gerentes no celular, e traria uma paleta que não é a da marca. O que precisamos desenhar cabe em polyline e rect.

*Consequência:* as cores de dado saem da rampa lima em passo escuro (`--lima-700`), que é o único passo da rampa com contraste suficiente sobre branco. As cores de estado (sucesso, atenção, perigo) ficam reservadas a selo e aviso, nunca a série de gráfico.

### D6. Convites: tabela no desktop, cartão no celular, mesma fonte de dados

A página monta as linhas uma vez e renderiza dois blocos: tabela em `hidden lg:block` e lista de cartões em `lg:hidden`. Custa HTML duplicado, e é o preço de não introduzir JavaScript de layout numa tela que precisa funcionar com internet ruim.

A regra de segurança de `paraLinha` não muda: link e mensagem de WhatsApp só entram no payload quando o papel tem alcance de **enviar** sobre aquele convite. Um gerente continua sem receber o endereço do convite, nos dois blocos.

### D7. Abas segmentadas são links, não botões de estado

O controle segmentado (métodos de login, níveis da estrutura organizacional) é uma lista de `<a>` com `aria-selected`, e o estado vive na URL. Assim o endereço é compartilhável, o botão voltar funciona e a tela abre antes de o script carregar — que é o cenário real de um celular na área rural, e a mesma razão que já valia para as abas do login.

### D8. Sem travessão, com teste que garante

Regra de copy: `—` e `–` não aparecem na interface. Usa-se ` · ` para separar fatos na mesma linha, dois-pontos para explicar, vírgula para apor, parênteses para definir. Intervalos numéricos viram "1 a 20".

Para a regra não depender de disciplina, entra um teste em `tests/copy.test.ts` que varre `app/`, `components/` e `lib/palestras/mensagem*.ts` procurando esses dois caracteres em literais de texto. O teste falha nomeando arquivo e trecho.

### D9. Ícones de interface são um desvio registrado

O design system reconhece quatro pictogramas de marca (boi, grama, saco, seta) e trata qualquer outro como violação. O menu lateral precisa de cerca de catorze ícones funcionais (início, métricas, convites, equipe, download, QR, documento, calendário, estrutura, upload, mais, escudo, sair, busca).

Decisão: usar um conjunto próprio de ícones de traço, 24×24, `stroke-width` 1.8, `currentColor`, em `components/ui/icones.tsx`, declarado como **ícone de interface** e nunca como pictograma de marca — os quatro da marca continuam exclusivos das superfícies de campanha. O desvio é deliberado e precisa do aval da marca antes da publicação.

### D10. Aplicação em duas etapas, sistema sempre de pé

Primeiro a casca e os componentes, com as telas atuais dentro dela; depois cada tela, uma por vez. Em nenhum momento o `main` fica quebrado, e cada passo é verificável no preview da Vercel.

## Risks / Trade-offs

- **[A casca nova engole o `exigirPapel` de alguma rota e abre uma tela para quem não deveria vê-la]** → O layout do grupo exige escopo, e cada `page.tsx` mantém o `exigirPapel` que já tem. Os testes de acesso (`tests/acesso.test.ts`, `scripts/integracao-acesso.ts`) rodam antes e depois, e a matriz de respostas de `docs/AUTH-E-PAPEIS.md` é reconferida.
- **[O contexto em cookie mostra a palestra errada depois de uma troca]** → O id do cookie é validado contra as palestras ativas a cada leitura; inválido, cai no padrão. O rótulo da palestra corrente fica sempre visível na barra de topo, para o operador nunca decidir no escuro.
- **[Consulta de série diária fica lenta com 3.900 convites × 4 palestras]** → Volume pequeno para Postgres, mas a agregação é por índice de `evento_id` e a tela é `force-dynamic` sem cache. Se passar de 300 ms, entra materialização por dia.
- **[Duplicar tabela e cartão dobra o HTML da lista de convites]** → A página já pagina em 20 linhas. Medir o tamanho do documento depois de aplicar; acima de 250 KB, reduzir o cartão do celular ao essencial.
- **[Reescrita ampla de JSX introduz regressão de copy ou de estado]** → A aplicação é tela a tela, e cada uma é conferida contra o artboard correspondente do mockup antes de seguir.
- **[Ícones de interface reprovados pela marca]** → Isolados em um arquivo só; trocar o conjunto é uma edição localizada.

## Migration Plan

1. **Componentes e casca** — `components/ui` ganha os componentes novos; nasce `app/palestras/(interno)/layout.tsx` com menu, barra de topo e contexto de palestra. As telas são movidas para dentro do grupo sem alteração de conteúdo. Deploy: o sistema já fica navegável.
2. **Telas do painel** — início, convites, detalhe do convite, equipe.
3. **Métricas** — `lib/palestras/metricas.ts` e a tela nova.
4. **Administração** — palestras, estrutura, importação, geração, PDFs, auditoria.
5. **Operação e acesso** — relatórios, lista impressa, check-in, login.
6. **Telas públicas** — circuito, confirmação, ingresso, estados, recuperação.
7. **Limpeza** — teste de copy, remoção de `CabecalhoDoCircuito` e dos layouts antigos, atualização de `docs/PAINEL-COLABORADOR.md` e `docs/OPERACAO-EVENTO.md`.

*Rollback:* cada etapa é um commit isolado e reversível. A etapa 1 é a única com risco de rota; se der errado, reverter devolve os dois layouts antigos intactos.

## Open Questions

- **Aval da marca para os ícones de interface (D9).** Precisa de resposta antes da publicação, não antes de começar.
- **Configuração de textos de consentimento.** Hoje vem de `lib/palestras/configuracao.ts` sem tela de edição. O mockup não cobre; fica fora desta change, mas é a lacuna mais evidente da administração.
- **Atalho de check-in no menu.** O mockup marca "hoje" no item quando há palestra no dia. Confirmar se a recepção quer isso ou prefere a tela abrindo direto no leitor.
- **Retirada do selo "em breve"** de `painel/page.tsx` para relatórios e check-in: é correção de conteúdo desatualizado, feita junto, sem aval separado.
