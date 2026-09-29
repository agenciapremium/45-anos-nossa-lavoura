## Why

A página pública `/palestras` é hoje uma lista de cartões brancos com cidade, data e local. Ela não mostra quem vai palestrar, sobre o quê, nem a promoção do trator, e visualmente não se parece com nada que o convidado viu antes de chegar a ela. Enquanto isso, a campanha do circuito já está nas redes com o carrossel "Conheça os palestrantes" (`docs/CARROSSEL CONTEÚDO/`, 7 slides), que tem uma linguagem própria e forte: lajes de lima, nome em negrito + light, etiqueta "Palestra:", cartões de "Onde e quando" com a cidade numa aba e o trator John Deere.

O convidado chega à página vindo desse carrossel ou do link de WhatsApp. A página tem de continuar a conversa que o carrossel começou, e precisa estar pronta antes da primeira palestra, em 13/10/2026.

## What Changes

- **`/palestras` é redesenhada** seguindo a sequência e a linguagem visual do carrossel, em cinco blocos:
  1. **Abertura** com a foto de pasto recortada em curva com borda lima, o selo do circuito sobreposto, título, subtítulo "Conhecimento para acelerar os resultados no campo.", fatos rápidos (4 cidades, 2 palestrantes, entrada gratuita) e as chamadas, tudo centralizado.
  2. **Palestrantes**: uma laje lima por palestrante (Ricardo Arantes e Giovani Pastre), com foto recortada, a mesma foto ampliada e esmaecida ao fundo, nome em negrito + light, credenciais em tópicos, etiqueta "Palestra:" e o tema.
  3. **Onde e quando**: fundo terra, um cartão por palestra ativa com contorno lima, cidade numa aba, dia da semana e data, local, endereço, horário e um link "Abrir no mapa".
  4. **Garanta sua presença**: os três passos (receber o link, confirmar pelo link, mostrar o ingresso), o aviso para quem ainda não recebeu e o botão "Já confirmei · ver meu ingresso". Continua **sem formulário e sem campo de CPF**.
  5. **Promoção** do trator John Deere 5080E, bordão "Acelere conhecimento. Acelere resultados. Acelere no Campo." e o texto legal do certificado de autorização, seguidos do rodapé público atual.
- **Novos assets**: fotos recortadas dos palestrantes (`docs/Ricardo Arantes.png`, `docs/Giovani Pastre.png`) e o trator (`docs/Trator.png`), convertidos para WebP em `public/assets/img/`.
- **Conteúdo dos palestrantes e da promoção fica em código**, num módulo de conteúdo tipado, não no banco. As datas e locais continuam vindo do banco.
- **Metadados de compartilhamento** (Open Graph) passam a citar os temas das palestras.
- **Mockup de aprovação** em `openspec/changes/landing-do-circuito/mockup/index.html` (e `celular.html` para 390 px), feito a pedido da cliente antes da implementação.

## Capabilities

### New Capabilities

- `landing-do-circuito`: conteúdo, ordem e comportamento da página pública `/palestras`: blocos obrigatórios, apresentação dos palestrantes, agenda derivada das palestras ativas, orientação de confirmação sem formulário, promoção com texto legal, desempenho em celular e acessibilidade.

### Modified Capabilities

<!-- Nenhuma. `openspec/specs/` está vazio. O requisito "Página pública de
     apresentação do circuito" vive em `fundacao/specs/plataforma-palestras` e
     continua valendo como está (lista das palestras ativas, ordenadas por
     data, sem campo de CPF). Esta change acrescenta requisitos sobre ele,
     sem mudar nenhum. -->

## Impact

- **Reescrito**: `app/palestras/page.tsx`.
- **Novos**: `lib/palestras/conteudo-da-landing.ts` (palestrantes, promoção, texto legal), componentes da landing em `components/palestras/landing/`, `public/assets/img/palestrantes/*.webp`, `public/assets/img/trator-5080e.webp`.
- **Ajuste pequeno**: `lib/tempo.ts` ganha um formato de horário curto (`19h`, `10h30`) e o dia da semana por extenso.
- **Sem mudança** em banco, migrações, rotas, autenticação, confirmação ou ingresso. `RodapePublico` é reaproveitado como está.
- **Fora do escopo**: cadastro de palestrantes pelo Admin, página individual por palestra, confirmação de presença pela landing.
