## 1. Telas públicas para validação em preview

Implementadas em Next com dados de exemplo e validadas pela cliente no preview, antes de a lógica de domínio ser finalizada.

- [x] 1.1 Formulário de confirmação em tela de celular, com todos os campos e os dois checkboxes
- [x] 1.2 Tela de ingresso com QR, titular, acompanhante, dados da palestra e os botões de salvar e agenda
- [x] 1.3 Telas de estado inválido: já utilizado, expirado, cancelado e presente
- [x] 1.4 Tela de recuperação de ingresso e suas mensagens de erro
- [x] 1.5 Mensagens de recusa: CPF inválido, CPF já confirmado no circuito, prazo vencido
- [ ] 1.6 Aplicar a identidade visual do Acelera no Campo 3.0 e validar as telas com a cliente no preview

## 2. Base da página do convite

- [x] 2.1 Criar a rota `/palestras/c/[codigo]` com resolução do convite e do estado efetivo, considerando a expiração na leitura
- [x] 2.2 Implementar o roteamento de conteúdo por estado: disponível, confirmado (titular), confirmado (outro), expirado, cancelado, presente
- [x] 2.3 Garantir que nenhum dado do titular chegue ao HTML nas telas de estado inválido
- [x] 2.4 Igualar formato e tempo de resposta entre código inexistente e convite cancelado
- [x] 2.5 Aplicar `noindex` nas rotas de convite e mantê-las fora do `sitemap.xml`
- [x] 2.6 Implementar o rodapé público com link da política e canal do encarregado de dados

## 3. Formulário e validação

- [x] 3.1 Definir o esquema Zod de confirmação, compartilhado entre formulário e servidor
- [x] 3.2 Implementar o formulário com máscaras de CPF e WhatsApp e teclado numérico no celular
- [x] 3.3 Implementar a seleção de atividade com as opções corte, leite, cria e outra
- [x] 3.4 Implementar as mensagens de erro por campo e a validação equivalente no servidor
- [x] 3.5 Implementar o texto que avisa que a confirmação vale para uma única palestra do circuito
- [x] 3.6 Bloquear o duplo envio no cliente e garantir idempotência no servidor

## 4. Consentimento

- [x] 4.1 Implementar o checkbox obrigatório de aceite, desmarcado por padrão, com link da política em nova aba
- [x] 4.2 Implementar o checkbox opcional de comunicações, independente do obrigatório
- [x] 4.3 Recusar no servidor qualquer confirmação sem aceite
- [x] 4.4 Gravar data e hora do aceite, versão vigente da política, IP e agente de usuário
- [x] 4.5 Tornar a versão vigente da política configurável sem deploy

## 5. Confirmação e concorrência

- [x] 5.1 Implementar a transação de confirmação com `SELECT ... FOR UPDATE` sobre o convite
- [x] 5.2 Validar dentro da transação o estado do convite e o prazo da palestra
- [x] 5.3 Tratar a violação do índice único de CPF como caminho esperado, convertendo na mensagem de CPF já confirmado
- [x] 5.4 Implementar a transição do convite para `confirmado` e o vínculo da confirmação ao CPF
- [x] 5.5 Escrever teste de concorrência: dois envios simultâneos no mesmo convite resultam em uma confirmação
- [x] 5.6 Escrever teste de concorrência: dois envios simultâneos do mesmo CPF em convites diferentes resultam em uma confirmação
- [x] 5.7 Registrar a confirmação na auditoria, sem CPF completo nem token

## 6. Ingresso digital

- [x] 6.1 Gerar o `ingresso_token` de 32 bytes por fonte criptográfica, único por confirmação
- [x] 6.2 Gerar o QR Code com o token, embutido como `data:` URI
- [x] 6.3 Montar a tela de ingresso com titular, acompanhante, dados da palestra e aviso de duas pessoas
- [x] 6.4 Implementar o cookie de dispositivo do titular, `HttpOnly`, `Secure`, `SameSite=Lax`, com escopo do convite
- [ ] 6.5 Implementar o salvamento do ingresso como imagem, testado em iOS e Android
- [x] 6.6 Implementar a rota do arquivo `.ics` com fuso America/Porto_Velho, local e endereço
- [x] 6.7 Verificar que o QR decodificado não contém CPF, nome nem identificador legível de palestra

## 7. Recuperação de ingresso

- [x] 7.1 Criar a rota `/palestras/ingresso` com formulário de CPF e código do convite
- [x] 7.2 Implementar a verificação dos dois fatores e a exibição do mesmo ingresso
- [x] 7.3 Implementar respostas neutras para qualquer falha, sem distinguir os motivos
- [x] 7.4 Recusar a recuperação de ingresso de confirmação cancelada, com mensagem própria
- [x] 7.5 Aplicar limite por IP nas tentativas de recuperação

## 8. Cancelamento pelo convidado

- [x] 8.1 Implementar o botão "Não vou poder ir" com etapa de confirmação explícita e aviso de irreversibilidade
- [x] 8.2 Implementar a transação de cancelamento: convite para `cancelado`, confirmação com `ativa = false`
- [x] 8.3 Ocultar o botão após o prazo e recusar o cancelamento no servidor após o prazo
- [x] 8.4 Tornar o cancelamento repetido inofensivo
- [x] 8.5 Registrar data e hora, autor e motivo do cancelamento, preservando o registro original
- [x] 8.6 Testar que o CPF liberado consegue confirmar em outro convite

## 9. Proteção das rotas públicas

- [x] 9.1 Definir a interface de limite de requisições, com implementação inicial apoiada em tabela no Neon
- [x] 9.2 Aplicar limite por IP no envio de confirmação e na recuperação de ingresso
- [x] 9.3 Aplicar bloqueio por IP após tentativas seguidas com códigos de convite inexistentes
- [x] 9.4 Usar mensagens neutras nas respostas de limite excedido
- [x] 9.5 Documentar que a implementação será substituída pela definitiva em `auth-e-papeis`, atrás da mesma interface

## 10. Verificação

- [ ] 10.1 Testes de ponta a ponta no celular: confirmar, ver ingresso, salvar imagem, adicionar à agenda, cancelar
- [x] 10.2 Teste do fluxo em outro dispositivo: estado "já utilizado" e recuperação por CPF e código
- [x] 10.3 Validar os critérios de aceite do PRD para `confirmacao-convidado`, um a um
- [x] 10.4 Revisar com o time que nenhuma tela de estado inválido expõe dado pessoal, inclusive no código-fonte
- [ ] 10.5 Ensaio com uma palestra de teste em preview, desativada antes da produção valer
