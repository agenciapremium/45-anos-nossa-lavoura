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
styles.css          # tokens de marca + estilos, na ordem das seções
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

## Marca

| Token | Valor | Uso |
|---|---|---|
| `--marrom` | `#3D201B` | faixas escuras, tipografia sobre bege |
| `--lima` | `#B8DB3D` | destaque, seção comercial, CTAs |
| `--bege` | `#F4ECDD` | fundo padrão |
| `--creme` | `#FDF9F1` | cards sobre bege, texto sobre marrom |

Display: **Parkinsans**. Texto: **Hanken Grotesk**. Ambas self-hosted em WOFF2.

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
  manifesto. Nos três blocos de gratidão usei o octógono da marca com ícone, porque repetir a
  mesma imagem em três cards denunciaria placeholder — a copy pede "fotografia própria" em cada
  bloco. Quando as fotos chegarem, é trocar o `<div class="gcard__mark">` por
  `<div class="gcard__img"><img …></div>`.
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

## Nota sobre o projeto do Claude Design

O import de `claude.ai/design/p/30d0cd88-02b0-434e-8628-4f48f0fb2bc7` não foi possível:
a ferramenta exige autorização via `/design-login`, que não roda em sessão não interativa.
Os tokens desta página foram derivados dos próprios assets da marca (as cores dos SVGs de
octógono, o selo 3D e as duas famílias tipográficas). Se o design system for importado depois,
vale conferir `styles.css` contra os tokens de lá.
