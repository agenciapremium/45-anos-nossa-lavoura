## Why

`fundacao` carrega 390 colaboradores no banco e cria telas administrativas protegidas apenas por um guard provisório. Enquanto o login real não existir, ninguém além do Admin pode usar o sistema — e os dados pessoais dos colaboradores ficam atrás de uma proteção temporária que precisa sair do ar.

O desafio específico do projeto: parte dos colaboradores das lojas não tem e-mail corporativo. Um sistema que só saiba autenticar por e-mail deixa esse grupo de fora, e são justamente eles que distribuem os convites.

## What Changes

- Better Auth configurado sobre o Neon, com as tabelas criadas em `fundacao`.
- Quatro métodos de login em `/palestras/entrar`, em abas: senha, link mágico, código de 6 dígitos por CPF e CPF + data de nascimento.
- Envio de e-mails transacionais pelo Resend, com templates em React Email, no domínio `agpremium.com.br`.
- Plugin próprio para os dois métodos que não são nativos: OTP por CPF (busca o usuário pelo CPF e envia o código ao e-mail vinculado, exibindo o e-mail mascarado) e CPF + data de nascimento.
- Restrição de método por papel: Admin e gerentes só entram por métodos baseados em e-mail; CPF + nascimento vale apenas para Colaborador e Recepção.
- Matriz de permissões do PRD aplicada em toda rota autenticada, com escopo por vínculo (regional, loja ou próprio usuário) e 403 no acesso fora do escopo.
- Sessões com duração por papel: 12 horas para Colaborador e Recepção, 7 dias para Admin e gerentes, com opção de encerrar sessões em todos os dispositivos.
- Bloqueio de 15 minutos após 5 tentativas erradas por CPF ou por IP, em todos os métodos.
- Desativação de usuário com efeito imediato na próxima requisição.
- **Remoção** do guard provisório `ADMIN_PREVIEW_TOKEN` criado em `fundacao`.

## Capabilities

### New Capabilities

- `autenticacao`: os quatro métodos de login, definição e redefinição de senha, envio de e-mails transacionais e encerramento de sessão.
- `controle-de-acesso`: papéis, escopo por vínculo, aplicação da matriz de permissões, 403 fora do escopo e efeito imediato da desativação.
- `protecao-contra-abuso`: limite de tentativas, bloqueio por CPF e por IP, duração de sessão por papel e mascaramento de dados sensíveis na interface.

### Modified Capabilities

Nenhuma. O guard provisório de `fundacao` é uma decisão de design daquela change, não um requisito de spec, e sua remoção entra como tarefa aqui.

## Impact

- **Rotas novas**: `/palestras/entrar` com as quatro abas, rotas de callback do link mágico, de verificação de OTP e de redefinição de senha.
- **Rotas protegidas**: todas sob `/palestras/painel`, `/palestras/admin`, `/palestras/checkin` e `/palestras/relatorios` passam a exigir sessão e escopo.
- **Novas dependências**: better-auth, resend, @react-email/components.
- **Novas variáveis de ambiente**: `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `RESEND_API_KEY`, `EMAIL_FROM`.
- **Infraestrutura**: escolha definitiva do mecanismo de limite de requisições (Upstash Redis ou tabela no Neon), substituindo a implementação inicial de `confirmacao-convidado` atrás da mesma interface.
- **Domínio de e-mail**: `agpremium.com.br` precisa de SPF, DKIM e DMARC configurados no Resend antes do lançamento.
- **Dependência**: `fundacao` (tabelas de usuário, papéis e vínculos).
