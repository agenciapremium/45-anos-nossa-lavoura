/* =========================================================
   FOTO COMEMORATIVA · geometria e composição

   O núcleo puro do motor: nada aqui toca o DOM além do contexto 2D que
   recebe. É o que permite comparar a saída desta versão com a da página
   estática fora do navegador, com o mesmo arquivo de origem — a checagem de
   regressão mais importante da migração (tarefa 1.8 da change `fundacao`).

   Os números são os mesmos de `foto-comemorativa/foto-comemorativa.js`:
   geometria medida por varredura de alpha nas molduras normalizadas para
   1080 de largura. Se a arte mudar, é aqui que os números mudam.
   ========================================================= */

export type IdFormato = 'perfil' | 'story';

export type Janela =
  | { tipo: 'circulo'; cx: number; cy: number; r: number }
  | { tipo: 'retangulo'; x: number; y: number; w: number; h: number };

export type Formato = {
  rotulo: string;
  w: number;
  h: number;
  janela: Janela;
  moldura: string;
  arquivo: string;
};

export const FORMATOS: Record<IdFormato, Formato> = {
  perfil: {
    rotulo: 'Foto de perfil',
    w: 1080,
    h: 1080,
    janela: { tipo: 'circulo', cx: 526, cy: 564, r: 507.5 },
    moldura: '/foto-comemorativa/assets/moldura-perfil.webp',
    arquivo: 'nossa-lavoura-45-anos-perfil.jpg',
  },
  story: {
    rotulo: 'Story',
    w: 1080,
    h: 1920,
    janela: { tipo: 'retangulo', x: 68, y: 80, w: 944, h: 1759 },
    moldura: '/foto-comemorativa/assets/moldura-story.webp',
    arquivo: 'nossa-lavoura-45-anos-story.jpg',
  },
};

export const IDS_DE_FORMATO: IdFormato[] = ['perfil', 'story'];

/** A foto passa alguns pixels por baixo da borda da janela: sem costura. */
export const SANGRIA = 6;

/**
 * Fotos de celular chegam com 12 MP ou mais. Redesenhar isso a cada
 * movimento do dedo trava o aparelho; a saída tem 1080 de largura, então
 * 2400 no lado maior sobra mesmo com zoom.
 */
export const LADO_MAX = 2400;

export const ZOOM_MIN = 0.1;
export const ZOOM_MAX = 10;

/** Qualidade do JPEG exportado. */
export const QUALIDADE_JPEG = 0.92;

export type Caixa = { x: number; y: number; w: number; h: number };
export type Enquadramento = { escala: number; offset: { x: number; y: number } };

/** Caixa que a foto precisa cobrir para não deixar vão na janela. */
export function caixaJanela(formato: Formato): Caixa {
  const j = formato.janela;
  if (j.tipo === 'circulo') {
    const R = j.r + SANGRIA;
    return { x: j.cx - R, y: j.cy - R, w: R * 2, h: R * 2 };
  }
  return {
    x: j.x - SANGRIA,
    y: j.y - SANGRIA,
    w: j.w + SANGRIA * 2,
    h: j.h + SANGRIA * 2,
  };
}

/** Caminho de recorte da janela, já com a sangria. */
export function caminhoJanela(
  ctx: {
    beginPath(): void;
    arc(
      x: number,
      y: number,
      r: number,
      inicio: number,
      fim: number,
    ): void;
    rect(x: number, y: number, w: number, h: number): void;
  },
  formato: Formato,
): void {
  const j = formato.janela;
  ctx.beginPath();
  if (j.tipo === 'circulo') ctx.arc(j.cx, j.cy, j.r + SANGRIA, 0, Math.PI * 2);
  else
    ctx.rect(j.x - SANGRIA, j.y - SANGRIA, j.w + SANGRIA * 2, j.h + SANGRIA * 2);
}

/** O ponto está dentro da janela (com sangria)? */
export function dentroDaJanela(
  formato: Formato,
  x: number,
  y: number,
): boolean {
  const j = formato.janela;
  if (j.tipo === 'circulo')
    return Math.hypot(x - j.cx, y - j.cy) <= j.r + SANGRIA;
  return (
    x >= j.x - SANGRIA &&
    x <= j.x + j.w + SANGRIA &&
    y >= j.y - SANGRIA &&
    y <= j.y + j.h + SANGRIA
  );
}

/** Enquadra a foto cobrindo a janela inteira, centralizada. */
export function enquadrar(
  formato: Formato,
  foto: { width: number; height: number },
): Enquadramento {
  const b = caixaJanela(formato);
  const r = Math.max(b.w / foto.width, b.h / foto.height);
  return {
    escala: r,
    offset: {
      x: b.x + (b.w - foto.width * r) / 2,
      y: b.y + (b.h - foto.height * r) / 2,
    },
  };
}

/** Aproxima ou afasta mantendo fixo o ponto (fx, fy) da tela. */
export function aplicarZoom(
  atual: Enquadramento,
  fator: number,
  fx: number,
  fy: number,
): Enquadramento {
  const nova = Math.min(Math.max(atual.escala * fator, ZOOM_MIN), ZOOM_MAX);
  const real = nova / atual.escala;
  return {
    escala: nova,
    offset: {
      x: fx - (fx - atual.offset.x) * real,
      y: fy - (fy - atual.offset.y) * real,
    },
  };
}

/** Centro da caixa da janela — para onde os botões de zoom apontam. */
export function centroJanela(formato: Formato): { x: number; y: number } {
  const b = caixaJanela(formato);
  return { x: b.x + b.w / 2, y: b.y + b.h / 2 };
}

/** Escala de redução aplicada à foto de origem antes de qualquer desenho. */
export function fatorDeReducao(largura: number, altura: number): number {
  return Math.min(1, LADO_MAX / Math.max(largura, altura));
}

type ContextoDeDesenho = {
  clearRect(x: number, y: number, w: number, h: number): void;
  fillRect(x: number, y: number, w: number, h: number): void;
  save(): void;
  restore(): void;
  clip(): void;
  beginPath(): void;
  arc(x: number, y: number, r: number, i: number, f: number): void;
  rect(x: number, y: number, w: number, h: number): void;
  drawImage(img: never, x: number, y: number, w: number, h: number): void;
  fillStyle: unknown;
};

/**
 * Compõe o quadro: fundo creme, foto recortada na janela e moldura por cima.
 * Mesma ordem de operações da versão estática.
 */
export function compor(
  ctx: ContextoDeDesenho,
  opcoes: {
    formato: Formato;
    foto: { width: number; height: number } | null;
    enquadramento: Enquadramento;
    moldura: unknown | null;
    corDeFundo: string;
    corDoVazio: string;
  },
): void {
  const { formato: f, foto, enquadramento, moldura } = opcoes;

  ctx.clearRect(0, 0, f.w, f.h);

  /* Fundo creme: se a pessoa afastar demais a foto, o vão fica creme em vez
     de transparente (que viraria preto no JPEG). */
  ctx.fillStyle = opcoes.corDeFundo;
  ctx.fillRect(0, 0, f.w, f.h);

  ctx.save();
  caminhoJanela(ctx, f);
  ctx.clip();
  if (foto) {
    const s = enquadramento.escala;
    ctx.drawImage(
      foto as never,
      enquadramento.offset.x,
      enquadramento.offset.y,
      foto.width * s,
      foto.height * s,
    );
  } else {
    ctx.fillStyle = opcoes.corDoVazio;
    ctx.fillRect(0, 0, f.w, f.h);
  }
  ctx.restore();

  if (moldura) ctx.drawImage(moldura as never, 0, 0, f.w, f.h);
}
