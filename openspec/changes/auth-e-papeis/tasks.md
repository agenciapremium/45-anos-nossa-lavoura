## 1. Telas de acesso para validação em preview

Implementadas em Next e validadas pela cliente no preview, antes de os métodos de login serem finalizados.

- [x] 1.1 Tela `/palestras/entrar` com as quatro abas e a escolha de método
- [x] 1.2 Fluxo de OTP por CPF: entrada do CPF, tela do código e exibição do e-mail mascarado
- [x] 1.3 Mensagens de recusa: credencial inválida, bloqueio por tentativas, método indisponível para o papel
- [x] 1.4 E-mails transacionais: link mágico, código de acesso e redefinição de senha
- [x] 1.5 Tela de 403 e painel inicial por papel
- [ ] 1.6 Validar as telas com a cliente no preview — **pendente**: depende da cliente: as telas estão no ar em `/palestras/entrar`, faltando a sessão de validação no preview

## 2. Base do Better Auth

- [x] 2.1 Instalar e configurar o Better Auth sobre o Neon, reaproveitando as tabelas criadas em `fundacao`
- [x] 2.2 Configurar `BETTER_AUTH_SECRET` e `BETTER_AUTH_URL` e validá-las no carregador de configuração
- [x] 2.3 Configurar a duração de sessão por papel: 12 horas para colaborador e recepção, 7 dias para admin e gerentes
- [x] 2.4 Implementar o encerramento de sessão no dispositivo atual e em todos os dispositivos
- [x] 2.5 Garantir proteção contra CSRF e cookies de sessão `HttpOnly`, `Secure` e `SameSite`

## 3. E-mail transacional

- [x] 3.1 Configurar o Resend e a variável `EMAIL_FROM` no domínio `agpremium.com.br`
- [ ] 3.2 Configurar SPF, DKIM e DMARC no domínio e validar a autenticação do remetente — **pendente**: etapa de DNS: SPF, DKIM e DMARC em `agpremium.com.br`, no painel do Resend e na zona do domínio
- [x] 3.3 Criar os templates em React Email: link mágico, código de acesso e redefinição de senha
- [x] 3.4 Garantir que nenhum e-mail contenha CPF completo, senha ou dados de convidados
- [x] 3.5 Tratar falha de envio com mensagem neutra ao usuário e registro do erro
- [ ] 3.6 Testar a entrega nos provedores de e-mail mais usados pelos colaboradores — **pendente**: depende de 3.2 e de uma chave real do Resend

## 4. Métodos de login

- [x] 4.1 Implementar o login por senha aceitando e-mail ou CPF como identificador
- [x] 4.2 Implementar a definição de senha no primeiro acesso e a redefinição por e-mail, com link de uso único
- [x] 4.3 Implementar o link mágico com validade de 15 minutos e uso único
- [x] 4.4 Implementar o plugin de OTP por CPF: resolução CPF → usuário → e-mail, código de 6 dígitos, validade de 10 minutos, máximo de 5 tentativas
- [x] 4.5 Implementar o mascaramento do e-mail na tela do OTP, no formato `m*****@gmail.com`
- [x] 4.6 Implementar a orientação para CPF sem e-mail vinculado, indistinguível da resposta para CPF inexistente
- [x] 4.7 Implementar o plugin de CPF e data de nascimento
- [x] 4.8 Recusar CPF e data de nascimento para `admin`, `gerente_regional` e `gerente_loja`, verificando após resolver o usuário
- [x] 4.9 Recusar o login de usuário desativado em todos os métodos, com mensagem genérica
- [x] 4.10 Padronizar as respostas neutras em todo o fluxo de autenticação
- [x] 4.11 Montar a tela `/palestras/entrar` com as quatro abas

## 5. Controle de acesso

- [x] 5.1 Implementar o middleware de sessão com verificação do estado `ativo` do usuário a cada requisição
- [x] 5.2 Implementar a barreira por papel nas rotas de `/palestras/painel`, `/palestras/admin`, `/palestras/checkin` e `/palestras/relatorios`
- [x] 5.3 Definir o objeto de escopo do usuário e exigi-lo na assinatura de toda função de acesso a dados de domínio
- [x] 5.4 Aplicar o filtro de escopo nas consultas de convites, confirmações, lojas e usuários
- [x] 5.5 Verificar a propriedade do recurso em toda mutação antes de agir, respondendo 403 fora do escopo
- [x] 5.6 Implementar a página de 403 e garantir que ela não revele dados do recurso
- [x] 5.7 Ajustar a interface para mostrar apenas os atalhos e ações permitidos ao papel
- [x] 5.8 Implementar o mascaramento de CPF na camada de dados, com base no papel do solicitante
- [x] 5.9 Implementar a visão reduzida do papel `recepcao`: apenas titular, acompanhante e CPF mascarado

## 6. Proteção contra abuso

- [x] 6.1 Decidir e implementar o mecanismo definitivo de limite de requisições, atrás da interface criada em `confirmacao-convidado`
- [x] 6.2 Implementar o bloqueio de 15 minutos após 5 tentativas incorretas por CPF
- [x] 6.3 Implementar o bloqueio por IP, com limiar próprio, e o zeramento do contador após sucesso
- [x] 6.4 Implementar o intervalo mínimo entre envios de link mágico, código e redefinição
- [x] 6.5 Invalidar o código anterior quando um novo é enviado
- [x] 6.6 Implementar o bloqueio por IP após tentativas seguidas com códigos de convite inexistentes
- [x] 6.7 Registrar tentativas malsucedidas e bloqueios sem gravar a credencial informada
- [x] 6.8 Substituir a implementação inicial de limite de `confirmacao-convidado`, sem alterar as rotas públicas

## 7. Remoção do guard provisório

- [x] 7.1 Remover o guard `ADMIN_PREVIEW_TOKEN` do código
- [ ] 7.2 Remover a variável da configuração da Vercel em todos os ambientes — **pendente**: etapa humana no painel da Vercel: remover `ADMIN_PREVIEW_TOKEN` de todos os ambientes
- [x] 7.3 Verificar que nenhuma rota administrativa responde mais a esse token
- [x] 7.4 Confirmar que todas as rotas antes protegidas pelo guard exigem agora sessão e papel

## 8. Verificação

- [x] 8.1 Testes de autorização por papel, cobrindo cada linha da matriz de permissões do PRD
- [x] 8.2 Testes de acesso fora do escopo por URL e por identificador em requisição
- [x] 8.3 Testes dos quatro métodos de login, incluindo recusas e expirações
- [x] 8.4 Teste do bloqueio por tentativas, por CPF e por IP, e da expiração automática do bloqueio
- [x] 8.5 Teste da desativação com sessão aberta, verificando a recusa na requisição seguinte
- [x] 8.6 Verificar que o CPF completo não aparece em nenhuma resposta para papéis que não são Admin
- [x] 8.7 Validar os critérios de aceite do PRD para `auth-e-papeis`, um a um
- [x] 8.8 Revisão de segurança das rotas de autenticação antes da publicação


---

## Situação em 28/09/2026

**53 de 57 concluídas.** As quatro pendentes não são de código: duas
dependem de DNS (3.2 e 3.6), uma da cliente (1.6) e uma do painel da Vercel
(7.2).

### Decisões tomadas no APPLY

- **Open Question do design — mecanismo de limite de requisições:** ficou a
  **tabela no Neon**, como D7 recomendava. As entranhas de
  `lib/palestras/limite.ts` foram trocadas (bloqueio ancorado na última
  tentativa, chave de identificador opaca por HMAC, varredura de limpeza na
  rotina diária) sem alterar as três funções exportadas nem uma linha das
  rotas públicas do convidado.
- **O manipulador HTTP do Better Auth não foi montado.** Não existe
  `/api/auth/[...all]`. Montá-lo publicaria `/api/auth/sign-in/email`, que
  responde "user not found" e não passa pelo bloqueio por tentativas nem
  pelas respostas neutras — um verificador de cadastro ao lado da porta que
  esta change tranca. Todo fluxo entra por Server Action ou por Route
  Handler deste projeto.
- **Tarefa 6.6** (bloqueio por IP em códigos de convite inexistentes) está
  atendida pela rota pública do convite, de `confirmacao-convidado`, apoiada
  no módulo de limite desta change. A rota é do outro escopo de arquivos e
  não foi tocada.
