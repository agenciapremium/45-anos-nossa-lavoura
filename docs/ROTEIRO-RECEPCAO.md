# Roteiro da Recepção — Circuito Acelera no Campo 3.0

Uma página, para imprimir e levar para a porta. Fala diretamente com quem
vai operar o check-in — não é documentação técnica.

> Este roteiro é o que o repositório pode entregar (tasks 10.3 e 10.4 da
> change `operacao-evento`). O que depende de pessoas — quem são os
> operadores de cada praça, o aparelho de cada um, o ensaio com ingresso
> real — está listado em ["O que falta"](#o-que-falta-antes-de-outubro) no
> final, e continua pendente.

---

## Antes de sair de casa / do hotel

1. **Celular carregado**, de preferência com carregador portátil — a tela
   fica ligada a noite inteira.
2. **Testar o login** em `/palestras/entrar` com o usuário de Recepção
   daquela praça, no próprio celular que vai usar na porta.
3. **Testar a câmera**: abrir `/palestras/checkin`, escolher a palestra do
   dia e apontar para qualquer QR (mesmo de outro app) só para ver se o
   navegador pede a permissão e a imagem aparece.
4. **Levar a lista impressa** da palestra do dia, gerada à tarde (ver
   "Contingência" abaixo). Ela é o plano B, não um extra.
5. Se possível, **duas pessoas com celular** na porta quando a palestra
   tiver muitos confirmados — uma fila só trava tudo.

## Na porta

1. Abra `/palestras/checkin`, confirme que a **palestra certa** está
   selecionada (normalmente já vem escolhida sozinha, é a de hoje).
2. Aponte a câmera para o QR do convidado (na tela do celular dele ou
   impresso). Não precisa apertar nada — a leitura é automática.
3. **QR não lê?** Sem drama: toque em **"Busca manual"**, do lado do
   leitor, e procure por CPF ou nome. É tão válido quanto o QR — não é
   "plano B envergonhado".

### Os três resultados

| Cor | O que apareceu | O que fazer |
| --- | --- | --- |
| 🟢 **Verde — ENTROU** | Nome do titular, do acompanhante, loja e colaborador de origem | Confira o nome com a pessoa e libere a entrada. O convite vale para o titular **e** o acompanhante (se houver um nomeado na tela) — as duas pessoas entram juntas, sem novo check-in. |
| 🟡 **Amarelo — JÁ UTILIZADO** | Data e hora do primeiro check-in | Mostre a hora na tela: "esse convite já foi usado às 19h12". Na maioria das vezes é o próprio convidado voltando a passar sem perceber. Se a pessoa insiste que é a primeira vez dela, confira o nome na **lista impressa** — se ele não bateu com quem já passou, chame quem estiver coordenando a recepção. Não libere pela conversa; libere pela lista. |
| 🔴 **Vermelho — NÃO ENTRA** | Um motivo em uma linha (cancelado, expirado, de outra palestra, código não reconhecido, ou fora do dia) | Explique com a frase que está na tela. **Nunca diga qual é "a outra palestra"** mesmo que apareça vermelho por esse motivo — o sistema não mostra essa informação de propósito, e você também não deve adivinhar ou comentar. Oriente a pessoa a procurar o colaborador que enviou o convite. Não é uma decisão sua para reverter na hora. |

### Se a tela demorar ou travar

A tela de check-in **exige internet** — é assim de propósito, para nenhum
dado de convidado ficar salvo no celular da equipe. Se a conexão cair:

1. Pare de tentar o leitor de QR e a busca manual.
2. Use a **lista impressa**: confira o nome (ordem alfabética), marque a
   caixinha de presença à mão e libere.
3. Quando a internet voltar (ainda no mesmo dia da palestra), quem estiver
   com acesso de Recepção ou Admin pode abrir a busca manual e fazer o
   check-in de quem passou nesse intervalo — é o mesmo sistema, só que
   feito depois.
4. **Se a internet só voltar no dia seguinte**, os check-ins não podem
   mais ser lançados pela tela (o sistema só aceita check-in no dia da
   própria palestra). Nesse caso a lista impressa marcada à mão **é** o
   registro da noite — guarde-a e entregue para o Admin depois.

## Acompanhante que chega sozinho, sem o titular

O QR fica com o titular, e o sistema não faz distinção entre as duas
pessoas do convite — quem está com o QR na tela (ou no papel) é quem
libera a entrada de ambos.

**Isto ainda não tem uma regra combinada com a cliente** (ver Pontos em
Aberto do design). Até lá, a orientação é conservadora: **peça para o
titular estar por perto**, mesmo que seja só para mostrar o QR pelo
celular dele para quem está na porta. Qualquer exceção fica a critério de
quem está coordenando a recepção naquela noite, não do operador do QR.

## Se algo sair muito errado

- Tela em branco, erro esquisito, navegador travando: feche a aba, abra
  `/palestras/checkin` de novo. A sessão continua válida.
- Sem sinal de jeito nenhum: siga direto para a lista impressa (seção
  acima) e não perca tempo tentando religar o celular repetidamente.
- Qualquer dúvida sobre liberar ou não uma pessoa: **erre para o lado de
  deixar entrar e anotar o caso à mão na lista**, e resolva depois com
  calma. Uma pessoa impedida de assistir à palestra por um problema do
  sistema é pior do que uma inconsistência que se corrige no dia seguinte.

---

## O que falta antes de outubro

Fora do que o código consegue entregar:

- **Quem são os operadores de Recepção em cada praça** (Vilhena, Espigão
  d'Oeste, Ji-Paraná, Porto Velho) e quantas pessoas por praça — depende da
  cliente definir e do Admin cadastrar os usuários em
  `/palestras/admin/organizacao` (tela que já existe, de `fundacao`).
- **Testar o login e a câmera no aparelho real** de cada operador, antes
  da respectiva palestra.
- **Ensaiar um check-in com um ingresso de verdade** (na tela de um
  celular e, separadamente, impresso) em cada dispositivo.
- **Combinar com a cliente** a regra de acompanhante sem o titular (acima)
  e se duas estações por praça são necessárias — isso só se sabe com o
  número de confirmados de cada palestra, na véspera.
- **Imprimir a lista de confirmados de verdade e testar na impressora**
  que vai ser usada, para conferir quebra de página com o volume real.
