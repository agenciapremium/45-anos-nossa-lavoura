## 1. Telas de operação para validação em preview

Implementadas em Next e validadas no preview, de preferência no celular que será usado na porta.

- [x] 1.1 Tela de check-in com escolha de palestra, leitor e acesso à busca manual
- [x] 1.2 Os três resultados do check-in, em corpo grande e legível à distância de um braço
- [x] 1.3 Busca manual por CPF e por nome, com os dados visíveis à Recepção
- [x] 1.4 Lista impressa em A4 retrato, com cabeçalho, colunas e rodapé
- [x] 1.5 Tela de relatórios e os números por palestra e por loja
- [ ] 1.6 Validar as telas no preview com a cliente e, se possível, com quem fará a recepção — depende de deploy de preview e de pessoas; não foi possível neste ambiente (ver `docs/OPERACAO-EVENTO.md`, "O que falta")

## 2. Base do check-in

- [x] 2.1 Criar a rota `/palestras/checkin` restrita a Recepção e Admin
- [x] 2.2 Implementar a escolha de palestra, sugerindo a palestra do dia por padrão
- [x] 2.3 Implementar a alternância entre leitor e busca manual sem recarregar a tela
- [x] 2.4 Implementar a resolução do token de ingresso no servidor, sem decisão de validade no cliente

## 3. Leitura de QR

- [x] 3.1 Integrar a biblioteca de leitura pela câmera do navegador
- [x] 3.2 Implementar o pedido de permissão de câmera e a orientação quando ela for negada
- [x] 3.3 Manter a leitura ativa após um código ilegível, sem travar a tela
- [x] 3.4 Implementar o retorno ao estado de leitura após cada resultado
- [x] 3.5 Medir o tempo entre a leitura e o resultado na tela, com meta de até 2 segundos em boa conexão
- [ ] 3.6 Testar a leitura com ingresso na tela do celular e com ingresso impresso — depende de aparelho e ingresso reais

## 4. Registro do check-in

- [x] 4.1 Implementar a transação de check-in com `SELECT ... FOR UPDATE` sobre o convite
- [x] 4.2 Criar a restrição de unicidade de check-in por convite
- [x] 4.3 Validar dentro da transação o estado `confirmado`, a palestra correta e o dia da palestra em America/Porto_Velho
- [x] 4.4 Implementar a transição do convite para `presente`
- [x] 4.5 Gravar convite, autor, data e hora e método (qr ou manual)
- [x] 4.6 Escrever teste de concorrência: duas leituras simultâneas do mesmo QR geram um único registro
- [x] 4.7 Registrar o check-in na auditoria

## 5. Resultados na tela

- [x] 5.1 Implementar o resultado verde com titular, acompanhante, loja e colaborador de origem
- [x] 5.2 Implementar o aviso de que a entrada vale para duas pessoas, e o caso sem acompanhante
- [x] 5.3 Implementar o resultado amarelo com data e hora do primeiro check-in
- [x] 5.4 Implementar o resultado vermelho para cancelado, expirado, outra palestra e token desconhecido
- [x] 5.5 Garantir que o resultado de outra palestra não revele qual palestra
- [ ] 5.6 Validar a legibilidade das três telas a um braço de distância, com brilho reduzido — cores e tamanhos escolhidos para isso (ver `docs/OPERACAO-EVENTO.md`), mas a validação em pessoa/aparelho não foi feita

## 6. Busca manual

- [x] 6.1 Implementar a busca por CPF, restrita à palestra escolhida
- [x] 6.2 Implementar a busca por nome parcial, com lista de resultados
- [x] 6.3 Exibir apenas titular, acompanhante e CPF mascarado nos resultados
- [x] 6.4 Implementar o check-in a partir da busca, com o método marcado como manual
- [x] 6.5 Verificar que o registro do check-in manual é idêntico ao do QR, exceto pelo método

## 7. Lista para impressão

- [x] 7.1 Criar a página de impressão com CSS próprio para A4 retrato
- [x] 7.2 Montar o cabeçalho com palestra, cidade, data, horário, local, total de confirmados e total de pessoas
- [x] 7.3 Montar as colunas com número, titular, CPF mascarado, acompanhante, loja, colaborador e caixa de marcação
- [x] 7.4 Ordenar por nome do titular e excluir convites cancelados
- [x] 7.5 Implementar o rodapé com data e hora da geração e numeração de página
- [x] 7.6 Aplicar o escopo do solicitante e mascarar o CPF inclusive para o Admin
- [x] 7.7 Recusar o acesso de colaboradores com 403
- [ ] 7.8 Imprimir uma prova em papel e conferir quebra de página e legibilidade — depende de impressora física

## 8. Exportação CSV

- [x] 8.1 Implementar a exportação por palestra com todas as colunas previstas
- [x] 8.2 Gerar UTF-8 com BOM e separador ponto e vírgula
- [x] 8.3 Escapar corretamente valores com separador, aspas e quebra de linha
- [x] 8.4 Exportar o CPF preservando zeros à esquerda ao abrir na planilha
- [x] 8.5 Formatar datas e horas no padrão brasileiro, no fuso America/Porto_Velho
- [x] 8.6 Aplicar escopo e mascaramento de CPF conforme o papel
- [x] 8.7 Recusar a exportação para colaborador e Recepção com 403
- [x] 8.8 Registrar na auditoria as exportações realizadas e as tentativas recusadas
- [ ] 8.9 Abrir o arquivo gerado no Excel em português e conferir acentos, colunas e CPF — sem Excel disponível neste ambiente; conferido byte a byte (BOM, separador, escape, truque de texto forçado do CPF) — ver `docs/OPERACAO-EVENTO.md`

## 9. Números por palestra

- [x] 9.1 Implementar as consultas agregadas por palestra e por loja, respeitando o escopo
- [x] 9.2 Implementar as contagens de gerados, confirmados, presentes, cancelados e expirados
- [x] 9.3 Implementar as taxas de confirmação e comparecimento, tratando divisor zero
- [x] 9.4 Exibir na tela a definição de cada taxa, deixando claro o que entra no denominador
- [x] 9.5 Verificar que confirmado sem check-in é tratado como ausência
- [x] 9.6 Conferir que a soma das quantidades corresponde ao total de convites gerados no escopo

## 10. Preparação operacional

- [ ] 10.1 Criar os usuários de recepção de cada praça e testar o login no celular que será usado — depende de a cliente indicar as pessoas; o Admin já tem a tela para cadastrar (de `fundacao`/`auth-e-papeis`), ver `docs/ROTEIRO-RECEPCAO.md`
- [ ] 10.2 Ensaiar o check-in com um ingresso real em cada dispositivo, antes da respectiva palestra — depende de aparelho e evento reais
- [x] 10.3 Escrever um roteiro de uma página para a equipe de recepção, com os três resultados e o que fazer em cada caso — `docs/ROTEIRO-RECEPCAO.md`
- [x] 10.4 Definir o procedimento de contingência para queda de internet, com a lista impressa — `docs/ROTEIRO-RECEPCAO.md`
- [ ] 10.5 Combinar com a cliente o procedimento para acompanhante que chega sem o titular — decisão da cliente; recomendação provisória registrada em `docs/ROTEIRO-RECEPCAO.md`

## 11. Verificação

- [x] 11.1 Testes de check-in: válido, repetido, cancelado, expirado, outra palestra e token desconhecido
- [x] 11.2 Teste de check-in fora do dia da palestra, verificando a mensagem exibida
- [x] 11.3 Teste de permissões: Recepção, Admin, gerentes e colaborador em cada rota desta change
- [x] 11.4 Simulação de fila: leituras em sequência em um mesmo dispositivo, medindo o tempo por pessoa
- [x] 11.5 Validar os critérios de aceite do PRD para `operacao-evento`, um a um
- [ ] 11.6 Ensaio completo em preview com dados de uma palestra de teste — depende de deploy de preview e de pessoas
