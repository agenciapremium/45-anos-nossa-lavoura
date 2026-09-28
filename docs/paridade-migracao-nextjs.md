# Paridade da migração para Next.js

Registro capturado em **28/09/2026** contra a produção
(`https://45anosnossalavoura.agpremium.com.br`), antes de qualquer alteração.
É a referência de comparação das tarefas 1.14 e 12.4 da change `fundacao`.

O HTML servido em produção é **byte a byte idêntico** aos arquivos do
repositório (`index.html`, `foto-comemorativa/index.html`) — conferido por
`diff`. Portanto os arquivos estáticos versionados são a referência de
conteúdo, e esta tabela é a referência de status e headers.

## Status e headers por rota

| Rota | Status | Content-Type | Cache-Control | Observações |
| --- | --- | --- | --- | --- |
| `/` | 200 | `text/html; charset=utf-8` | `public, max-age=0, must-revalidate` | 26.927 bytes |
| `/foto-comemorativa` | 200 | `text/html; charset=utf-8` | `public, max-age=0, must-revalidate` | 7.265 bytes |
| `/figurinhas` | **308** | `text/plain` | `public, max-age=0, must-revalidate` | `location: /foto-comemorativa` |
| `/figurinhas/:path*` | **308** | `text/plain` | — | `location: /foto-comemorativa/:path*` |
| `/robots.txt` | 200 | `text/plain; charset=utf-8` | `public, max-age=0, must-revalidate` | 89 bytes |
| `/sitemap.xml` | 200 | `application/xml` | `public, max-age=0, must-revalidate` | 847 bytes |
| `/assets/**` | 200 | conforme o arquivo | `public, max-age=31536000, immutable` | |

Headers presentes em **todas** as respostas:

```
x-content-type-options: nosniff
referrer-policy: strict-origin-when-cross-origin
x-frame-options: SAMEORIGIN
strict-transport-security: max-age=63072000
```

> **Nota sobre o 301 × 308.** A spec `plataforma-palestras` fala em "301" para
> `/figurinhas`. A produção atual responde **308** (é o que a Vercel emite para
> `"permanent": true`, e é o que o Next.js emite para `permanent: true`). 308 é
> o equivalente moderno do 301 que preserva o método. Manter 308 **é** a
> paridade; mudar para 301 seria a regressão.

## Metadados a preservar

### `/`

- `<title>`: `Nossa Lavoura 45 Anos | Uma história construída com quem faz o campo acontecer`
- `description`, `theme-color: #2a1512`, `robots: index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1`
- `canonical: https://45anosnossalavoura.agpremium.com.br/`
- Open Graph completo (`type`, `locale`, `site_name`, `url`, `title`, `description`, `image` + `secure_url`/`type`/`width`/`height`/`alt`)
- Twitter card `summary_large_image` com `title`, `description`, `image`, `image:alt`
- `icon` e `apple-touch-icon`: `/assets/img/selo-600.webp`
- JSON-LD `@graph` com `Organization`, `WebSite`, `ImageObject`, `WebPage`, `SaleEvent`

### `/foto-comemorativa`

- `<title>`: `Foto comemorativa dos 45 anos | Nossa Lavoura`
- `canonical: .../foto-comemorativa`
- Open Graph e Twitter apontando para `/foto-comemorativa/assets/og-foto-comemorativa.jpg`

## Seções da landing (ordem e âncoras)

1. `#topo` — hero
2. Números (`45`, `+40`, `3`) — contagem animada
3. `#historia` — manifesto
4. `#trajetoria` — linha do tempo
5. `#filme` — VT
6. `#gratidao`
7. `#semana` — banda lima, contagem regressiva `2026-10-19T00:00:00-04:00`
8. `#ofertas` — seis categorias
9. `#acelera` — Acelera no Campo 3.0
10. `#cafe`
11. `#lojas`
12. `#fim`
13. rodapé + tarja de campanha (`data-from="2026-10-12"`)

## Comportamentos de `main.js`

- Reveal por `IntersectionObserver` com escalonamento (`--d`), respeitando `prefers-reduced-motion`
- Contagem dos números (easing cúbico, 1400 ms)
- Tarja publicada a partir de `2026-10-12T00:00:00-04:00`
- Contagem regressiva por segundo até `2026-10-19T00:00:00-04:00`
- Player do VT: cria `<video>` sob demanda, cai no aviso de indisponível em erro

## Foto comemorativa — geometria a preservar

| Formato | Canvas | Janela |
| --- | --- | --- |
| Perfil | 1080×1080 | círculo `cx 526`, `cy 564`, `r 507.5` |
| Story | 1080×1920 | retângulo `x 68`, `y 80`, `w 944`, `h 1759` |

Constantes: `SANGRIA = 6`, `LADO_MAX = 2400`, `ZOOM_MIN = 0.1`, `ZOOM_MAX = 10`,
exportação `image/jpeg` a `0.92`.

---

## Resultado da checagem (28/09/2026, versão React local)

Comparação automatizada entre o HTML estático versionado e o HTML gerado
por `next build` + `next start`, feita por um extrator que compara título,
metatags, JSON-LD, imagens e **todo o texto visível**.

### `/`

| Item | Resultado |
| --- | --- |
| `<title>` | idêntico |
| Texto visível (todas as seções) | **idêntico** |
| JSON-LD (`@graph` com 5 nós) | **idêntico** |
| `canonical` e `og:url` | idênticos, com a barra final |
| Open Graph e Twitter | idênticos |
| Imagens (`src`, `alt`, `width`, `height`) | mesmas imagens, mesmos `alt` e dimensões |
| Status e headers | 200 + os três headers de segurança |

### `/foto-comemorativa`

| Item | Resultado |
| --- | --- |
| `<title>`, `canonical`, OG, imagens | idênticos |
| Texto visível | idêntico |

### Divergências conhecidas e aceitas

1. **`<meta name="next-size-adjust" content="">`** — emitida pelo
   `next/font` para a métrica de fallback das fontes. Não afeta conteúdo
   nem SEO.
2. **`src` das imagens passou de relativo (`assets/…`) para absoluto
   (`/assets/…`)** — mesmo recurso. Na versão estática o caminho relativo
   só funcionava porque a página estava na raiz; o absoluto é o correto
   para uma rota do App Router.
3. **`twitter:title` e `twitter:description` na foto comemorativa** —
   o Next as deriva do Open Graph. A versão estática só trazia
   `twitter:card` e `twitter:image`. É acréscimo, não perda.
4. **Preload de fontes** — a versão estática pré-carregava 2 arquivos
   (`Parkinsans-Bold`, `HankenGrotesk-Regular`); o `next/font` pré-carrega
   os 5 WOFF2 declarados, com nomes versionados sob `/_next/static/media/`.
   Os arquivos originais continuam em `/assets/fonts/`.
5. **`/figurinhas` responde 308**, como já respondia. Ver a nota sobre
   301 × 308 acima.

### Foto comemorativa — comparação das imagens geradas

Executada fora do navegador, com Skia (`@napi-rs/canvas`), comparando a
implementação **estática** (`foto-comemorativa.js`, transcrita sem
alteração) com a **nova** (`components/foto-comemorativa/geometria.ts`),
usando a mesma foto de origem (`pasto-2400.webp`, 2400×1600) e as molduras
reais:

| Formato | Cenários | Pixels diferentes | JPEG byte a byte |
| --- | --- | --- | --- |
| Perfil (1080×1080) | 6 | **0** | idêntico |
| Story (1080×1920) | 6 | **0** | idêntico |

Cenários: enquadramento inicial, dois cliques em aproximar, afastar e
arrastar, pinça fora do centro, zoom no teto (10×) e zoom no piso (0,1×).

Os valores de escala e deslocamento dos cenários viraram teste permanente
em `tests/foto-comemorativa.test.ts`.

### O que ainda depende de gente

- **Conferência visual em desktop e celular no preview da Vercel**
  (tarefa 1.14). A comparação acima cobre marcação, texto, metadados,
  headers e a geometria do canvas; não cobre renderização.
- **Uso real da câmera** em iOS e Android na foto comemorativa.
