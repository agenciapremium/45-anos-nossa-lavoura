## Context

Quatro noites, quatro cidades, uma equipe de recepção por praça. É a única parte do sistema que funciona sob pressão de tempo real: há fila na porta, o produtor chegou de longe, e qualquer travamento vira constrangimento na frente da cliente.

Condições reais a considerar: salão de restaurante ou espaço de eventos no interior de Rondônia, iluminação variável, Wi-Fi do local provavelmente ruim, celular da equipe com internet móvel instável, e convidados com o ingresso salvo como imagem, com brilho de tela baixo.

O relatório vem depois, sem pressa, mas é o que a cliente leva para avaliar a ação.

## Goals / Non-Goals

**Goals:**

- Decidir em segundos, na porta, se a pessoa entra.
- Nunca deixar alguém de fora por falha do sistema: a busca manual e a lista impressa são caminhos de igual valor.
- Registrar a presença de forma confiável e única.
- Entregar relatórios que abram sem tratamento no Excel em português.

**Non-Goals:**

- Controle de capacidade do local, lotação máxima ou fila de espera.
- Conferência de identidade do acompanhante — o PRD não coleta CPF dele.
- Check-in de saída ou controle de permanência.
- Aplicativo instalável: a leitura é pelo navegador.
- Funcionamento totalmente offline da tela de check-in (ver Risks).

## Decisions

### D1. Leitura pela câmera do navegador, com busca manual em pé de igualdade

`@zxing/browser` ou `html5-qrcode` na tela de check-in, em contexto seguro (HTTPS). A busca manual **não** é um recurso escondido de contingência: fica na mesma tela, a um toque, porque câmera falha, permissão é negada, tela do convidado está escura e QR impresso amassa.

**Alternativa:** aplicativo nativo com leitor dedicado. Rejeitada — instalar aplicativo em celular de quatro equipes diferentes, poucos dias antes, é mais risco que benefício.

### D2. QR contém o token; o servidor decide

A câmera lê o `ingresso_token` e o envia ao servidor, que resolve a confirmação, valida a palestra, o estado e o dia, grava o check-in e devolve o resultado. Nenhuma decisão de validade acontece no cliente.

Consequência: **a tela de check-in exige conexão**. É o trade-off aceito para não distribuir dados de convidados para os dispositivos da equipe. Mitigação operacional: lista impressa em mãos em toda palestra (ver Risks).

### D3. Check-in em transação com trava de linha

```
BEGIN
  SELECT … FROM palestra_convite WHERE id = (confirmação do token) FOR UPDATE
  -- valida estado = 'confirmado', palestra correta, dia da palestra
  INSERT INTO palestra_checkin (…)     -- unicidade por convite
  UPDATE palestra_convite SET estado = 'presente'
COMMIT
```

Unicidade de check-in garantida por restrição única em `palestra_checkin (convite_id)`. Duas leituras simultâneas do mesmo QR, em dois celulares, produzem um registro e um resultado "já utilizado" — o mesmo padrão usado na confirmação.

### D4. "Dia da palestra" no fuso do evento

A janela é o dia civil da palestra em `America/Porto_Velho`, de 00h00 a 23h59. Simples de explicar para a equipe e suficiente: as palestras são às 19h, exceto Porto Velho, às 10h30.

**Alternativa considerada:** janela relativa ao horário (por exemplo, duas horas antes até o fim). Rejeitada por criar recusas difíceis de explicar na porta quando alguém chega adiantado.

### D5. Três cores, uma decisão

A tela devolve verde, amarelo ou vermelho, com o texto essencial em corpo grande. O operador não lê parágrafo na porta: vê a cor, confere o nome, libera. Detalhes ficam abaixo da dobra.

- **Verde**: entrou. Titular, acompanhante, loja e colaborador de origem.
- **Amarelo**: já utilizado, com o horário do primeiro check-in — a informação que resolve a conversa ("seu convite já foi usado às 19h12").
- **Vermelho**: não entra por este convite. Motivo em uma linha.

Convite de outra palestra é vermelho e **não revela qual palestra** — a mesma regra de não vazamento que vale no resto do sistema.

### D6. Mascaramento de CPF também para o Admin na lista impressa

Na lista impressa o CPF aparece mascarado para todos, inclusive para o Admin. É um papel que circula pelo salão, é manuseado por várias pessoas e pode ser esquecido em cima de uma mesa. A exportação CSV, que tem destino controlado e fica registrada em auditoria, mantém a regra geral: completo só para o Admin.

### D7. CSV com BOM e ponto e vírgula

UTF-8 **com BOM** e separador ponto e vírgula. É o que faz o Excel em pt-BR abrir com acento correto e colunas separadas, com duplo clique, sem assistente de importação. Tecnicamente é menos elegante que UTF-8 puro com vírgula; na prática é a diferença entre um arquivo que abre e um que a cliente devolve dizendo que "veio tudo em uma coluna só".

CPF exportado com aspas, para o Excel não tratar como número e comer o zero à esquerda.

### D8. Números por consulta agregada, mesma decisão do painel

Coerente com `painel-colaborador`: agregação na consulta, sem contadores materializados. A definição de cada taxa fica visível na tela, para não haver dúvida sobre o que entra no denominador — em especial, convites cancelados permanecem no total de gerados.

### D9. Preparação operacional faz parte da entrega

A change não termina no código. Fazem parte dela: criar e testar os usuários de recepção de cada praça antes da respectiva palestra, testar a câmera no celular que será usado, e levar a lista impressa atualizada. Isso está nas tasks porque é o que de fato evita fila na porta.

## Risks / Trade-offs

- **Internet cai no local** → a tela de check-in para de funcionar. Mitigação em camadas: lista impressa obrigatória em toda palestra, atualizada no fim da tarde; conferência manual na lista; registro posterior no sistema, se a cliente quiser o dado consolidado. **Este é o risco mais provável do projeto inteiro.**
- **Câmera não lê a tela do convidado** (brilho baixo, tela trincada, película) → busca por nome na mesma tela; pedir ao convidado para aumentar o brilho.
- **Permissão de câmera negada por engano** → a tela explica como reverter, e a busca manual segue disponível.
- **Fila na entrada** → um operador com celular atende uma pessoa por vez; recomendar duas estações por praça em palestras com muitos confirmados.
- **Acompanhante chegar sem o titular** → o sistema não distingue; o QR está com o titular. Decisão operacional da cliente, a combinar antes.
- **Check-in fora do dia recusado sem que a equipe entenda** → a mensagem diz explicitamente a data em que o convite é válido.
- **CSV aberto em Google Sheets ou LibreOffice** → o BOM e o ponto e vírgula funcionam bem no Excel; em outras ferramentas pode exigir ajuste na importação. Prioridade é o Excel, que é o que a cliente usa.

## Migration Plan

Sem migração de dados. A change publica rotas novas e passa a escrever em `palestra_checkin`.

Sequência por palestra:

1. Criar os usuários de recepção da praça e testar o login no celular que será usado.
2. Testar a leitura de QR com um ingresso real, no dispositivo e no local, se possível.
3. Imprimir a lista de confirmados no fim da tarde do dia da palestra.
4. Operar com leitura de QR, usando a busca manual sem cerimônia sempre que for mais rápido.

**Rollback:** se a tela de check-in falhar durante o evento, a operação segue pela lista impressa, sem perda para o convidado. Os check-ins podem ser lançados depois pela busca manual, se a cliente quiser o dado no sistema.

## Open Questions

**Resolvida nesta rodada:** ~~etapa de mockup~~ — telas implementadas em Next e validadas no preview.

- **Recepção por praça** (bloqueia a preparação, não o APPLY): quem terá o papel em Vilhena, Espigão d'Oeste, Ji-Paraná e Porto Velho, e quantas pessoas por praça.
- **Acompanhante sem o titular**: a recepção libera a entrada do acompanhante que chega sozinho? Definir antes da primeira palestra.
- **Lançamento posterior de check-in**: se a internet cair e a conferência for feita no papel, a cliente quer esses check-ins lançados depois? Isso exigiria permitir o registro fora do dia da palestra, para o Admin.
- **Duas estações por praça**: depende do número de confirmados por palestra, conhecido apenas na véspera.
- **Destino dos relatórios**: além do CSV, a cliente espera uma apresentação de resultados do circuito?
