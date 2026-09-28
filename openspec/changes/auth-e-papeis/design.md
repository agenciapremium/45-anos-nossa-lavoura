## Context

O sistema tem cinco papéis, quatro métodos de login e uma restrição que não é comum: **parte dos usuários não tem e-mail**. Colaboradores de loja no interior de Rondônia frequentemente não têm endereço corporativo, e é esse grupo que distribui os convites.

Ao mesmo tempo, esses usuários acessam dados pessoais de convidados — nome, CPF, WhatsApp, propriedade. Autenticar por CPF e data de nascimento, dados que circulam com facilidade e não são segredo, é um risco assumido conscientemente, e precisa vir com travas proporcionais.

Esta change também tem uma dívida a pagar: `fundacao` deixou `/palestras/admin/*` atrás de um token de ambiente provisório. A remoção desse guard faz parte do escopo.

## Goals / Non-Goals

**Goals:**

- Dar acesso a todos os papéis, inclusive a quem não tem e-mail.
- Aplicar a matriz de permissões do PRD no servidor, não só na interface.
- Manter o método fraco (CPF + nascimento) confinado aos papéis de menor alcance.
- Remover o guard provisório de `fundacao`.

**Non-Goals:**

- Autoatendimento de cadastro: usuários são criados pelo Admin ou por importação.
- Federação, SSO ou login social.
- Autenticação do convidado: ele nunca tem conta.
- Segundo fator para papéis de gestão — fica como recomendação futura, não entra nesta versão.

## Decisions

### D1. Better Auth com dois métodos nativos e dois plugins próprios

Senha e link mágico são recursos nativos. Os outros dois são plugins:

- **OTP por CPF**: não é o "email OTP" nativo, porque o identificador digitado é o CPF, não o e-mail. O plugin resolve CPF → usuário → e-mail vinculado, gera o código, envia e devolve o e-mail mascarado para a tela.
- **CPF + data de nascimento**: credencial de dois campos, sem e-mail no caminho.

**Alternativa:** implementar autenticação própria. Rejeitada — sessão, rotação e CSRF são exatamente o tipo de coisa que não se reescreve sob prazo de campanha.

### D2. O método CPF + nascimento é uma credencial fraca, e o desenho assume isso

Três travas o acompanham:

1. Disponível apenas para `colaborador` e `recepcao`, verificado **no servidor após resolver o usuário** — um usuário com papel de gestão é recusado mesmo com os dados corretos.
2. Sessão de 12 horas, sem extensão.
3. Sujeito ao mesmo bloqueio de 5 tentativas por CPF e por IP.

Some-se a isso que o colaborador nunca vê CPF completo de convidado, o que limita o dano de uma sessão comprometida.

**Trade-off aceito:** quem souber o CPF e a data de nascimento de um colaborador entra como ele. Não há como evitar isso mantendo o método. A alternativa — exigir e-mail de todos — foi descartada no PRD porque deixaria colaboradores sem acesso, e são eles que operam a distribuição.

### D3. Respostas neutras em todo o fluxo de autenticação

CPF inexistente, CPF sem e-mail, senha errada, e-mail não cadastrado: todos produzem respostas do mesmo formato. O sistema nunca confirma a existência de um cadastro a quem não passou nas travas. Isso importa aqui mais que no comum, porque a base é uma lista nominal de funcionários de uma empresa específica.

Exceção deliberada: o e-mail **mascarado** exibido no fluxo de OTP por CPF. É necessário para o usuário saber onde procurar o código, e revela pouco — mas só aparece depois de o CPF ser aceito, e o fluxo tem limite de tentativas.

### D4. Autorização em duas camadas

1. **Middleware** resolve a sessão, confirma que o usuário está ativo e barra rotas por papel. Rápido e abrangente.
2. **Verificação por recurso** no servidor: toda consulta filtra pelo escopo do usuário, e toda mutação confere se o recurso pertence ao escopo antes de agir.

A segunda camada é o que realmente protege. O middleware não sabe se o convite `K7Q2MX` pertence ao colaborador que o pediu — a consulta sabe. A regra é: **nenhuma consulta de domínio roda sem receber o escopo do usuário**, imposto pela assinatura das funções de acesso a dados.

**Alternativa:** RLS no Postgres. Mais forte, mas exige propagar identidade do usuário para a conexão, o que o driver serverless do Neon com pool compartilhado torna trabalhoso. Fica anotado como reforço futuro.

### D5. Desativação com efeito imediato por consulta de estado na requisição

A cada requisição autenticada, o estado `ativo` do usuário é verificado. Custa uma leitura por requisição, o que é aceitável na escala do projeto (390 usuários, uso concentrado em quatro noites).

**Alternativa:** invalidar as sessões no momento da desativação. Mais eficiente, mas deixa brecha se uma sessão escapar. A verificação a cada requisição é simples e não falha por esquecimento.

### D6. Mascaramento de CPF na camada de dados, não na de apresentação

A função que lê confirmações recebe o papel do solicitante e devolve o CPF já mascarado quando ele não é Admin. O valor completo não chega a sair do servidor. Assim, nenhuma tela nova pode vazar CPF por esquecer de mascarar, e uma resposta de API inspecionada não traz o dado.

### D7. Limite de requisições: escolher agora a implementação definitiva

`confirmacao-convidado` criou uma interface de limite com implementação apoiada em tabela no Neon. Aqui se decide a definitiva. Recomendação: **manter a tabela no Neon**, salvo se o volume exigir outra coisa.

Motivo: o Upstash agrega um serviço, uma credencial e um ponto de falha a mais, para um sistema com 390 usuários e pico em quatro noites. A tabela no Neon resolve na escala real, com uma varredura periódica para limpar registros antigos. Se o custo por requisição se mostrar relevante no teste de carga, troca-se a implementação atrás da mesma interface.

### D8. Remoção do guard provisório é tarefa desta change

`ADMIN_PREVIEW_TOKEN` sai do código e da configuração da Vercel. A verificação faz parte dos critérios de conclusão: nenhuma rota administrativa pode responder a esse token depois desta change.

## Risks / Trade-offs

- **Colaborador com CPF e data de nascimento vazados** → escopo restrito, CPF de convidado mascarado, sessão curta, bloqueio por tentativas. Risco residual aceito e documentado.
- **E-mail do Resend caindo em spam** → configurar SPF, DKIM e DMARC no domínio `agpremium.com.br` **antes** do lançamento, e testar entrega nos provedores mais usados pelos colaboradores. Se falhar, os afetados ainda entram por CPF + nascimento, desde que não sejam papéis de gestão.
- **Gestor sem e-mail acessível** → um gerente sem e-mail funcional fica sem acesso, por desenho. O cadastro precisa garantir e-mail válido para todo papel de gestão; a importação de CSV deveria alertar quando um papel de gestão vier sem e-mail.
- **Bloqueio por IP afetando uma loja inteira** → várias pessoas atrás do mesmo IP podem se bloquear mutuamente. Mitigação: contar o bloqueio por IP com limiar mais alto que o por CPF, e permitir que o Admin libere um bloqueio manualmente.
- **Custo da verificação de estado a cada requisição** → aceitável na escala; se pesar, cachear por poucos segundos.

## Migration Plan

1. Configurar o domínio de e-mail no Resend e validar SPF, DKIM e DMARC.
2. Publicar as rotas de autenticação em preview com uma base de usuários de teste cobrindo os cinco papéis, incluindo um colaborador sem e-mail.
3. Testar os quatro métodos, as recusas por papel e os bloqueios.
4. Definir a senha do Admin real e validar o acesso.
5. Publicar em produção, remover `ADMIN_PREVIEW_TOKEN` do código e da Vercel, e confirmar que as rotas administrativas não respondem mais a ele.
6. Só então importar a base real de colaboradores, se ainda não tiver sido importada.

**Rollback:** reverter para o deploy anterior restabelece o guard provisório. Sessões criadas ficam órfãs mas inofensivas; usuários precisam entrar de novo depois.

## Open Questions

**Resolvida nesta rodada:** ~~etapa de mockup~~ — telas implementadas em Next e validadas no preview.

- **Mecanismo de limite de requisições** (bloqueia o APPLY, decisão técnica): confirmar a tabela no Neon ou preferir Upstash Redis.
- **Primeiro acesso dos colaboradores**: quem tem e-mail recebe um convite para definir senha, ou todos começam por link mágico e OTP? Define se haverá um disparo em massa de e-mails no lançamento.
- **Liberação manual de bloqueio**: o Admin precisa de uma tela para desbloquear um CPF ou IP antes dos 15 minutos?
- **Segundo fator para o Admin**: entra nesta versão ou fica registrado como melhoria?
- **Quem será o Admin** e quantas pessoas terão esse papel.
