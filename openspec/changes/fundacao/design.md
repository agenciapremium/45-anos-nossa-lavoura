## Context

O repositório hoje é um **site estático**: `index.html`, `styles.css`, `tokens.css`, `main.js`, `/foto-comemorativa` e `/assets`, publicados na Vercel em `45anosnossalavoura.agpremium.com.br` com um `vercel.json` de redirects e headers. Não há `package.json` nem Next.js.

O PRD parte do princípio de que o módulo entra "no mesmo projeto Next.js da landing page". Esse projeto ainda não existe. A decisão tomada pela cliente é **reconstruir a landing e a foto comemorativa como páginas React**, eliminando o HTML estático, em vez de apenas hospedá-lo dentro do Next. O repositório passa a ter uma única tecnologia.

O banco Neon já está provisionado e conectado ao projeto da Vercel, com as variáveis no `.env` local.

Restrições relevantes:

- A landing está em produção e tem tráfego de campanha. Regressão de URL ou de SEO é inaceitável.
- O circuito acontece em **outubro de 2026**, com prazo de confirmação a partir de 12/10. A janela de operação é curta e sem segunda chance.
- Público de cerca de 390 colaboradores, com pico de uso concentrado nos dias anteriores a cada palestra.
- A Agência Premium é **operadora** de dados pessoais; o controlador é o Grupo Axia Agro.

## Goals / Non-Goals

**Goals:**

- Introduzir a base Next.js + Neon + Drizzle e reconstruir as páginas existentes, sem alterar nenhuma URL pública, conteúdo visível ou sinal de SEO.
- Entregar ao Admin a operação completa de preparação: palestras, hierarquia, importação, lotes e PDF.
- Deixar o esquema de dados **inteiro** criado nesta change, inclusive as tabelas que só serão usadas pelas changes seguintes, para que as migrações não fiquem espalhadas.
- Garantir que a expiração de convites seja correta mesmo se o cron falhar.

**Non-Goals:**

- Confirmação pelo convidado, ingresso e QR (`confirmacao-convidado`).
- Login dos colaboradores e matriz de papéis aplicada (`auth-e-papeis`).
- Painel do colaborador e visão dos gerentes (`painel-colaborador`).
- Check-in, relatórios e indicadores (`operacao-evento`).
- Redesenho da landing: a reconstrução é de tecnologia, não de design. Qualquer mudança visual é escopo separado.

## Decisions

### D1. Reconstruir a landing em React, no mesmo repositório

**Escolha (definida pela cliente):** converter o repositório em um projeto Next.js (App Router, TypeScript) e **reescrever** a landing dos 45 anos e a foto comemorativa como páginas e componentes React. O HTML estático é removido ao fim da migração. Só imagens, vídeos, fontes e demais binários ficam em `public/`.

**Alternativas consideradas:**

- *Mover o HTML estático para `public/` e servi-lo como arquivo.* Menor esforço e menor risco imediato, mas deixa o repositório com duas tecnologias e duas formas de fazer a mesma coisa — dois sistemas de estilo, dois jeitos de escrever uma página. Descartada pela cliente.
- *Projeto Vercel separado servido por rewrite, ou subdomínio próprio.* Isolariam o risco, ao custo de dois deploys ou de tirar o link do convite do domínio da campanha. Descartadas.

**Motivo:** um único stack, um único sistema de componentes e tokens, e a landing passa a poder reaproveitar o que o módulo de palestras construir — em especial a identidade visual do Acelera no Campo 3.0.

**O que isso exige, concretamente:**

- `styles.css` e `tokens.css` viram a base do tema Tailwind: os tokens de cor, tipografia e espaçamento são traduzidos para a configuração, não copiados como CSS solto.
- O comportamento de `main.js` (animações, rolagem, interações) é reescrito em componentes React.
- A foto comemorativa é a parte mais delicada: `foto-comemorativa.js` manipula canvas para compor a moldura sobre a foto do usuário. A lógica de canvas migra praticamente como está, embrulhada em um componente cliente — não é reescrita conceitual, é mudança de invólucro.
- Metadados de SEO e Open Graph passam a ser gerados pela API de metadata do Next, reproduzindo exatamente as tags atuais.
- Os headers de `vercel.json` migram para `next.config.ts`; os redirects de host e de `/figurinhas` permanecem.

**Critério de pronto:** a paridade é verificada rota a rota contra a produção atual — status, conteúdo visível, metadados e headers — antes de promover.

### D1b. Identidade visual: a mesma da landing, com o selo do circuito nas páginas públicas

O módulo usa o design system Nossa Lavoura 45 Anos que já está em `tokens.css`: paleta terra/lima/creme, Parkinsans para display, Hanken Grotesk para texto, elevação por slab de cor (não por blur), octógono só como elemento de fundo. Nada de tema novo — o Tailwind é configurado a partir desses tokens e a landing e o módulo passam a compartilhar os mesmos componentes.

**A única troca é o selo.** Nas páginas públicas do circuito, `assets/img/selo_circuito_acelera_no_campo.webp` (500×500, redondo) substitui o selo dos 45 anos (`selo-1200.webp`, `selo-600.webp`). Onde vale cada um:

| Superfície | Selo |
| --- | --- |
| Landing dos 45 anos, `/foto-comemorativa` | 45 anos |
| `/palestras`, `/palestras/c/[codigo]`, `/palestras/ingresso` | Circuito |
| Ingresso digital e imagem salva pelo convidado | Circuito |
| PDF de distribuição e lista impressa | Circuito |
| Painéis internos, login, check-in | Circuito, discreto no cabeçalho |

O selo do circuito carrega as marcas **Virbac** e **Supremax**, que são dos patrocinadores. Isso tem duas consequências: ele não pode ser recortado nem ter a proporção alterada, e não deve ser usado como favicon em tamanho pequeno, onde as marcas ficam ilegíveis. O favicon continua sendo o selo dos 45 anos.

### D2. Esquema de dados completo já nesta change

Todas as tabelas do PRD (`palestra_regional`, `palestra_loja`, `palestra_evento`, `palestra_lote`, `palestra_convite`, `palestra_confirmacao`, `palestra_checkin`, `palestra_importacao`, `palestra_auditoria`) e as do Better Auth (`user`, `session`, `account`, `verification`) entram em uma migração inicial, mesmo que `palestra_confirmacao` e `palestra_checkin` só sejam escritas nas changes seguintes.

**Alternativa:** criar cada tabela na change que a usa. Rejeitada porque fragmenta migrações que precisam de índices e chaves estrangeiras cruzadas — em especial o índice único parcial de CPF, que só faz sentido junto com a tabela de convites.

### D2b. Mensagem padrão de WhatsApp aprovada

Texto gravado como padrão de toda palestra nova, editável pelo Admin em cada uma:

```
Olá! A Nossa Lavoura convida você para o Circuito de Palestras Acelera no Campo 3.0.

📍 {cidade} · {local}
🗓 {data}, às {horario}

Palestras técnicas gratuitas com Giovani Pastre, da Virbac, e Ricardo Arantes.

Convite pessoal e intransferível, válido para você e mais 1 acompanhante.
Confirme sua presença até {prazo}:
{link}

Acelere conhecimento. Acelere resultados. Acelere no Campo.
```

Decisões por trás do texto: o link fica sozinho na última linha útil, porque o WhatsApp gera a pré-visualização a partir dele e linha isolada evita que pontuação entre na URL; "gratuitas" aparece cedo, porque é a objeção mais provável de quem recebe um convite de empresa; "pessoal e intransferível" precede o link, para que quem repassar saiba que o convite trava no primeiro CPF. Dois emojis apenas, nas linhas de lugar e data, que é onde ajudam a varrer a mensagem.

Cabem os acentos, o `·` e os emojis — tudo passa por `encodeURIComponent` na montagem do `wa.me`, e esse caso está nos testes.

### D3. Estados do convite no banco, com expiração dupla

O estado fica em uma coluna `estado` com verificação de domínio. Para expiração, o sistema faz **as duas coisas**:

1. **Na leitura**: toda consulta que devolve um convite `disponivel` compara o prazo da palestra com o instante atual e o apresenta como expirado se vencido.
2. **Por cron diário da Vercel**: consolida o estado gravado, com a rota protegida por `CRON_SECRET`.

**Motivo:** o cron é um efeito colateral; a correção não pode depender dele. A leitura defensiva garante que nenhum convite fora do prazo seja confirmado mesmo se o cron não executar.

### D4. Toda mudança de estado sob transação com trava de linha

Qualquer transição de estado de convite roda em transação com `SELECT … FOR UPDATE` sobre a linha do convite. Nesta change isso vale para a expiração; nas changes seguintes, para confirmação, cancelamento e check-in. A regra é estabelecida aqui, junto com um helper compartilhado, para que as outras changes não a reinventem.

**Alternativa:** confiar apenas em restrições únicas. Insuficiente: a unicidade resolve o CPF duplicado, mas não impede duas confirmações do mesmo convite por CPFs diferentes.

### D5. Código curto: 6 caracteres de um alfabeto de 31 símbolos

Alfabeto `23456789ABCDEFGHJKMNPQRSTUVWXYZ` (sem `0`, `O`, `1`, `I`, `L`), sorteado com gerador criptográfico. Cerca de 887 milhões de combinações para um universo esperado na casa de milhares de convites — a densidade é baixíssima, e a defesa contra varredura é complementada pelo bloqueio por IP após tentativas seguidas com códigos inexistentes (em `auth-e-papeis`). Colisão tratada por re-sorteio com limite de tentativas, apoiado na restrição de unicidade do banco.

### D6. PDF gerado sob demanda em Route Handler

`@react-pdf/renderer` dentro de um Route Handler Node.js, com o PDF montado no momento do pedido e nunca armazenado. O PDF fotografa os convites disponíveis naquele instante, o que é consistente com o carimbo de geração impresso no documento.

Botão de WhatsApp: `<Link src="https://wa.me/?text=...">` do `@react-pdf/renderer`, com a mensagem codificada por `encodeURIComponent`. O formato `wa.me` sem número abre o seletor de contatos do próprio WhatsApp, que é o fluxo descrito no PRD.

**Risco:** `@react-pdf/renderer` não roda no Edge Runtime. O handler declara `runtime = 'nodejs'`. Geração em lote com `.zip` pode estourar o limite de tempo da função em lotes grandes — mitigado com limite de colaboradores por operação e geração em streaming.

### D7. Acesso administrativo provisório até `auth-e-papeis`

Esta change entrega telas de Admin antes de o login existir. Para não deixar rota administrativa aberta, `/palestras/admin/*` fica protegido por um guard provisório: variável de ambiente `ADMIN_PREVIEW_TOKEN`, exigido em cookie ou header, com `noindex` em todas as telas administrativas.

O guard é **temporário por contrato**: `auth-e-papeis` o remove e substitui pela sessão do Better Auth. A tarefa de remoção está registrada nas tasks daquela change.

**Alternativa:** entregar `auth-e-papeis` antes de `fundacao`. Rejeitada porque o login precisa da tabela de usuários e da hierarquia que esta change cria.

### D8. Fuso horário tratado na borda, UTC no banco

Todos os instantes são gravados em `timestamptz` (UTC). A conversão para `America/Porto_Velho` acontece na formatação e no cálculo de prazos, com `date-fns-tz`. Rondônia não adota horário de verão, mas o offset fixo não é codificado — o identificador de fuso é usado, para o caso de mudança de regra.

### D9. Papéis persistidos na tabela `user` desde já

A coluna `papel` e os vínculos `regional_id` e `loja_id` entram na tabela `user` nesta change, porque a importação de CSV já os preenche. A **aplicação** das permissões (matriz de acesso, 403, escopo) é de `auth-e-papeis`.

## Risks / Trade-offs

- **Quebrar a landing em produção durante a migração** → é o maior risco desta change, e a reconstrução o amplia: não basta comparar bytes, é preciso comparar o que o visitante vê. Validar em preview, rota a rota (`/`, `/foto-comemorativa`, `/figurinhas`, `/assets/*`, `/robots.txt`, `/sitemap.xml`), status, conteúdo visível, metadados e headers, mais uma conferência visual em desktop e celular. Promover só com a lista inteira verde, e manter o deploy anterior para rollback imediato pela Vercel.
- **Regressão sutil na foto comemorativa** → a composição em canvas depende de proporção, recorte e qualidade de exportação. Comparar imagens geradas antes e depois, nos dois formatos (perfil e story), com a mesma foto de origem.
- **Esforço da reconstrução competindo com o prazo do circuito** → a landing não tem prazo; o circuito tem. Se a reconstrução atrasar o módulo de palestras, ela pode ser publicada depois: as páginas novas e as antigas convivem durante a transição, e o HTML estático só é removido quando a versão React estiver aprovada.
- **Custo de build e cold start** → a landing passa a ser servida pela CDN como arquivo estático; o custo fica restrito às rotas `/palestras`.
- **Limite de tempo na geração de PDFs em lote** → limite de colaboradores por operação e geração em streaming; se persistir, dividir o lote por loja.
- **Importação de CSV com planilha suja** (acentos, separador trocado, CPF formatado como número pelo Excel, perdendo o zero à esquerda) → detectar e avisar na pré-visualização; documentar no próprio modelo que a coluna de CPF deve ser texto.
- **Dados pessoais de 390 colaboradores carregados antes de o controle de acesso existir** → o guard provisório de D7 e o `noindex` reduzem a exposição, mas a janela entre `fundacao` e `auth-e-papeis` deve ser curta; recomenda-se não carregar a base real de produção antes de `auth-e-papeis` estar no ar.
- **Cron da Vercel no plano atual** → se o plano não permitir cron diário, a expiração na leitura (D3) mantém o comportamento correto; a consolidação passa a ser acionada manualmente pelo Admin.

## Migration Plan

1. Criar a base Next.js em branch, com Tailwind configurado a partir de `tokens.css` e `styles.css`.
2. Reconstruir a landing como página React, seção a seção, comparando com a produção atual em cada etapa.
3. Reconstruir a foto comemorativa, migrando a lógica de canvas para um componente cliente.
4. Migrar metadados, `robots.txt`, `sitemap.xml` e os headers de `vercel.json` para `next.config.ts`; manter os redirects.
5. Deploy de preview e checagem de paridade rota a rota, mais conferência visual em desktop e celular e comparação das imagens geradas pela foto comemorativa.
6. Rodar a migração inicial do banco no ambiente de preview.
7. Promover para produção fora do horário de pico, com o deploy anterior mantido para rollback.
8. Remover `index.html`, `styles.css`, `main.js` e `foto-comemorativa/` do repositório, em commit próprio, depois de a versão React estar no ar e aprovada.
9. Cadastrar as quatro palestras e importar a base de colaboradores (ver ressalva de risco acima).

**Rollback:** promover o deploy estático anterior pela Vercel. Como o banco só é usado por rotas novas, não há dado da landing a reverter. Enquanto o passo 8 não for executado, o HTML original continua no repositório e o rollback é trivial.

## Open Questions

**Resolvidas nesta rodada:**

- ~~Banco Neon~~: provisionado e conectado ao projeto da Vercel, com as variáveis no `.env` local.
- ~~Estratégia de migração~~: reconstrução da landing e da foto comemorativa em React, no mesmo repositório, eliminando o HTML estático.
- ~~Etapa de mockup~~: as telas são implementadas em Next e validadas pela cliente no preview da Vercel, sem mockups descartáveis.
- ~~Identidade visual~~: o design system dos 45 anos (`tokens.css`), com o selo do circuito no lugar do selo dos 45 anos nas superfícies do módulo. Ver D1b.
- ~~Mensagem padrão do WhatsApp~~: copy aprovada, em D2b.
- ~~Retenção~~: indeterminada, enquanto durar a finalidade ou até a revogação do consentimento. Sem rotina de expurgo automático.

**Em aberto:**

- **Base real de colaboradores**: quando a planilha da Nossa Lavoura estará disponível, e se ela virá no formato do modelo ou precisará de tratamento prévio.
- **Prioridade entre reconstruir a landing e entregar o módulo**: se as duas frentes competirem, qual vem primeiro? Ver o risco correspondente acima.
