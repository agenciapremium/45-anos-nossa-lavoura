# Nossa Lavoura · 45 Anos

Landing page da campanha de aniversário — hub institucional que vai do afetivo ao comercial,
conforme a copy estruturada em [`docs/45-ANOS-LANDING-PAGE-COPY.md`](docs/45-ANOS-LANDING-PAGE-COPY.md).

**Stack:** HTML, CSS e JavaScript puros. Sem build, sem dependências. Deploy direto na Vercel.

---

## Rodar localmente

```bash
python3 -m http.server 8899
# abre http://127.0.0.1:8899
```

Precisa de um servidor HTTP (não abrir o `index.html` pelo `file://`), porque as fontes
e a sequência de frames do selo são carregadas por fetch.

## Deploy na Vercel

Projeto estático puro: sem framework, sem comando de build, output na raiz.
O [`vercel.json`](vercel.json) já define `cleanUrls`, cache imutável de um ano para `/assets/*`
e os headers de segurança.

---

## Estrutura

```
index.html          # a página inteira, seção por seção, comentada
tokens.css          # tokens do design system, cópia literal — não editar
styles.css          # estilos da página, só consomem os tokens acima
main.js             # nav, reveal, contadores, contagem regressiva, player e scroll-scrub
assets/
  selo/d/           # 105 frames WebP com alpha, 960px  (desktop)
  selo/m/           # 105 frames WebP com alpha, 560px  (mobile)
  img/              # pastagem, selo estático e imagem de compartilhamento
  fonts/            # Parkinsans e Hanken Grotesk em WOFF2
  svg/              # octógonos e ícones da marca
  video/            # onde entra o VT (ver abaixo)
docs/               # copy da campanha e mídia original (não versionada)
```

## Design system

A página consome o **Nossa Lavoura 45 Anos Design System** (em `docs/Nossa Lavoura 45 Anos Design System/`).

`tokens.css` é a cópia literal de `tokens/*.css` do sistema, concatenada em um arquivo só.
A única adaptação é o `@font-face`, que aponta para os WOFF2 em `assets/fonts/` em vez dos
TTF originais. **Não editar `tokens.css` à mão** — reimportar quando o sistema mudar.

`styles.css` só consome esses tokens. Sem hex cru, sem px onde existe token, sem família
tipográfica de fora.

| | |
|---|---|
| Paleta | terra `#3d201b`, lima `#b8db3d`, creme `#fffadc` — as três exatas, mais as rampas |
| Display | Parkinsans, pesos 300 e 700 apenas |
| Texto | Hanken Grotesk, pesos 300, 400 e 700 apenas |
| Botões | Hanken Bold em caixa alta, `--radius-control`, recuo de 1px no press |
| Octógono | fragmento de canto, duas faces, só como fundo — nunca container |
| Elevação | lajes de cor sólida; blur só no selo |
| Motion | `--dur-*` e `--ease-*`; fade com translate de 8px |

### O que mudou na revalidação

O primeiro corte foi feito sem acesso ao sistema, derivando tokens dos SVGs da marca.
Vários pontos estavam fora. Corrigidos:

- **Creme era `#F4ECDD`**, um bege que inventei. O valor certo é `#fffadc`.
- **Botões** eram pill em Parkinsans sentence case, com elevação no hover. Agora seguem
  `components/core/Button.jsx`: Hanken Bold, caixa alta, raio por tamanho, press de 1px.
- **Ícones**: eu tinha desenhado um set de contorno inteiro. O sistema tem exatamente quatro
  pictogramas e trata qualquer outro como violação de marca. Removidos; sobrou o `seta`.
- **Octógonos** apareciam inteiros e, nos selos de UF, como container recortado. Agora são
  fragmentos de canto de duas faces, e os UF viraram painéis arredondados.
- **Pesos 500 e 600** de ambas as famílias não existem no sistema. Removidos.
- **`backdrop-filter`** no header e no botão fantasma: o sistema proíbe blur de fundo.
- **Recortes diagonais** entre seções: o sistema encosta as bandas, a borda é o divisor.
- **Header** era fixo, transparente e 68px. Agora é sticky, terra, 76px.
- **Proteção de texto sobre foto** era um véu bege. Agora é o gradiente lateral de 96° em terra.
- **Manchetes de categoria** estavam em caixa alta. O sistema não admite manchete em caixa alta.
- **Durações e curvas** de animação agora vêm de `tokens/motion.css`.

### Desvios deliberados, que valem seu aval

1. **O scrub do selo pelo scroll.** O sistema diz "no parallax, no scroll-jacking". Mantive
   porque foi um pedido explícito seu, e porque a página rola normalmente — o scroll não é
   sequestrado, só alimenta qual quadro aparece. Se preferir aderência total, é trocar a
   seção de fechamento pelo selo estático: o código já faz isso sozinho em
   `prefers-reduced-motion`.
2. **Três cores de fundo.** O sistema pede no máximo duas por página. Uso creme + terra + lima,
   e a lima só na faixa da semana de aniversário — a exceção que o próprio sistema abre para
   "a faixa de campanha e o hero de campanha".
3. **Cards sem pictograma.** São quatro pictogramas para seis categorias. Repetir boi e saco
   para preencher a grade ficaria pior do que tipografia limpa. Se a marca liberar novos
   pictogramas, os cards já têm lugar para eles.
4. **Manchete de categoria em sentence case**, contrariando a copy, que as escreveu em caixa
   alta. Casing é decisão de renderização e o sistema é explícito: "never uppercase a whole
   headline — the display face is wide and it stops reading".
5. **Sem logotipo vetorial.** O sistema registra essa lacuna. A marca no header e no rodapé é
   tipo Parkinsans Bold, como ele determina, mais o PNG do selo. Vale pedir o vetor à marca
   antes de publicar.

---

## O selo 3D dirigido pelo scroll

O selo animado (`docs/ASSETS/selo_animation.mov`, ProRes 4444 com alpha) foi convertido em
105 frames WebP com transparência. Na seção de fechamento, a posição do scroll controla qual
frame aparece no `<canvas>` — o selo se monta conforme o leitor termina a página. É a mesma
técnica de scrub do [scroll-world](https://github.com/oso95/scroll-world), sem WebGL e sem
biblioteca: o asset já é um render 3D, então não há motivo para reconstruir a cena em runtime.

Detalhes da implementação, em `main.js`:

- a sequência só começa a baixar quando o fechamento entra a 1,5 viewport de distância;
- carrega em blocos de 8 frames e já exibe o canvas depois do primeiro bloco;
- até lá mostra o selo estático, então o primeiro paint nunca depende da sequência;
- se um frame ainda não chegou, desenha o anterior mais próximo em vez de piscar;
- mobile recebe a sequência de 560px (1,5 MB em vez de 2,9 MB);
- com `prefers-reduced-motion`, o scrub é desligado e fica só o selo estático.

Para regenerar os frames a partir do `.mov`:

```bash
ffmpeg -i docs/ASSETS/selo_animation.mov -vf "scale=1400:-1" -pix_fmt rgba build/frames/f%03d.png
# depois, para cada frame (pulando o primeiro, que é transparente):
cwebp -q 68 -alpha_q 88 -resize 960 0 -m 6 entrada.png -o assets/selo/d/001.webp
cwebp -q 66 -alpha_q 85 -resize 560 0 -m 6 entrada.png -o assets/selo/m/001.webp
```

---

## Pendências antes de publicar

Estes pontos vêm dos `[APURAR]` da copy e das decisões que tomei na ausência de confirmação.

### Falta o arquivo

- **VT emocional.** A seção 05 está montada com pôster e botão, mas o vídeo não estava na pasta
  `docs`. Basta colocar o arquivo em `assets/video/vt-45-anos.mp4`. Sem ele, o clique no play
  mostra um aviso e a versão em texto do filme, que já está no ar logo abaixo.

### Deixei de fora, conforme as regras da copy

- **Seção 06, depoimentos.** "Sem depoimentos coletados, a seção não entra no ar." Não entrou.
- **Faixa de logos de parceiros** na seção 07 — depende de autorização de uso de cada marca.
- **Olho "1981 a 2026"** no hero — o ano de fundação não está confirmado.
- **Redes sociais no rodapé** — o handle vigente ainda é o do nome anterior e precisa ser
  confirmado antes de virar link.
- **Anos dos marcos antigos** na linha do tempo — entraram só com título de capítulo, como
  a copy determina. 2025 e 2026 estão com ano.

### Decisões que valem revisar

- **Botão "Falar com um Consultor de Vendas"** aponta para a seção 12, como a copy manda
  enquanto o destino não estiver definido. Trocar por WhatsApp ou seletor de loja quando definir.
- **"Encontrar a loja mais próxima"** e **"Ler o regulamento completo"** apontam para
  `nossalavoura.com.br`. Ajustar para as URLs finais.
- **Fotografia.** Existe uma única foto de rebanho no material. Ela sustenta o hero e o
  manifesto. Os três blocos de gratidão são tipográficos, porque repetir a mesma imagem em três
  cards denunciaria placeholder — a copy pede "fotografia própria" em cada bloco. Quando as
  fotos chegarem, cada `.gcard` recebe um bloco de imagem de 168px encostado no topo, como
  define o `Card` do design system.
- **Nota "imagem meramente ilustrativa"** na seção 11 foi removida: ela se refere a uma
  fotografia de mesa posta que ainda não existe. Volta junto com a foto.
- **Contagem regressiva** na seção 08: não estava na copy. Entrei com ela porque a data
  (19 de outubro) já está confirmada e é o tipo de elemento que sustenta uma página de evento.
  É só remover o bloco `.cd` se não fizer sentido para a campanha.

### Automático por data

- A **tarja fixa** de rodapé ("Semana de aniversário: 19 a 24 de outubro") está publicada com
  `data-from="2026-10-12"` e aparece sozinha a partir de 12/10, como pede a copy.
- A contagem regressiva some sozinha quando o dia 19 chegar.

---

## Acessibilidade e performance

- Navegação por teclado com skip link e foco visível em lima.
- `prefers-reduced-motion` desliga reveals, parallax, flutuação e o scrub do selo.
- Imagens em WebP com `srcset` por viewport; fontes em WOFF2 com `font-display:swap`.
- O primeiro paint não depende da sequência de frames: carga inicial na casa de 500 KB.

## Nota sobre o import do Claude Design

O import direto de `claude.ai/design/p/30d0cd88-…` não foi possível: a ferramenta exige
`/design-login`, que não roda em sessão não interativa. O sistema foi lido da cópia local em
`docs/Nossa Lavoura 45 Anos Design System/`, que é a mesma coisa para efeito de aderência.
