/* =========================================================
   FOTO COMEMORATIVA DOS 45 ANOS · motor de canvas

   Porte direto de `foto-comemorativa/foto-comemorativa.js`, que por sua vez
   portou o `useMolduraEngine` do projeto utilidades-nossa-lavoura: a foto é
   recortada na janela da moldura e a moldura é desenhada por cima. Tudo no
   navegador, nada é enviado.

   Esta é a parte que **não** foi reescrita conceitualmente na migração para
   React: a geometria, as constantes e a ordem das operações de desenho estão
   em `geometria.ts`, iguais às da versão estática. O que mudou foi o
   invólucro — em vez de procurar elementos por `id` e se registrar em
   eventos do documento, o motor recebe o canvas e devolve uma API que o
   componente cliente aciona.
   ========================================================= */

import {
  aplicarZoom,
  centroJanela,
  compor,
  dentroDaJanela,
  enquadrar,
  fatorDeReducao,
  FORMATOS,
  IDS_DE_FORMATO,
  QUALIDADE_JPEG,
  type Enquadramento,
  type IdFormato,
} from './geometria';

export { FORMATOS, IDS_DE_FORMATO };
export type { IdFormato };

const css = (nome: string) =>
  getComputedStyle(document.documentElement).getPropertyValue(nome).trim();

export type Motor = ReturnType<typeof criarMotor>;

export function criarMotor(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas 2d indisponível');

  const estado = {
    formato: 'perfil' as IdFormato,
    foto: null as HTMLCanvasElement | null,
    enquadramento: { escala: 1, offset: { x: 0, y: 0 } } as Enquadramento,
    molduras: {} as Partial<Record<IdFormato, HTMLImageElement>>,
  };

  const fmt = () => FORMATOS[estado.formato];

  /* ---------------------------------------------------------
     Molduras: pré-carrega as duas, a troca de formato é imediata
     --------------------------------------------------------- */
  for (const id of IDS_DE_FORMATO) {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      if (estado.formato === id) desenhar();
    };
    img.src = FORMATOS[id].moldura;
    estado.molduras[id] = img;
  }

  /* ---------------------------------------------------------
     Desenho
     --------------------------------------------------------- */
  let pedido = 0;
  const desenhar = () => {
    if (pedido) return;
    pedido = requestAnimationFrame(() => {
      pedido = 0;
      const m = estado.molduras[estado.formato];
      compor(ctx, {
        formato: fmt(),
        foto: estado.foto,
        enquadramento: estado.enquadramento,
        moldura: m && m.complete && m.naturalWidth ? m : null,
        corDeFundo: css('--creme-500'),
        corDoVazio: css('--creme-700'),
      });
    });
  };

  const centralizar = () => {
    if (!estado.foto) return;
    estado.enquadramento = enquadrar(fmt(), estado.foto);
  };

  const zoomEm = (fator: number, fx: number, fy: number) => {
    estado.enquadramento = aplicarZoom(estado.enquadramento, fator, fx, fy);
  };

  /* ---------------------------------------------------------
     Formato
     --------------------------------------------------------- */
  const selecionarFormato = (id: IdFormato) => {
    if (!FORMATOS[id]) return;
    const mudou = estado.formato !== id;
    estado.formato = id;

    const f = fmt();
    if (canvas.width !== f.w || canvas.height !== f.h) {
      canvas.width = f.w;
      canvas.height = f.h;
    }
    /* A janela muda de forma e de lugar: reenquadra a foto. */
    if (mudou) centralizar();
    desenhar();
  };

  /* ---------------------------------------------------------
     Carregar foto
     --------------------------------------------------------- */
  const reduzir = (img: HTMLImageElement) => {
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    const k = fatorDeReducao(w, h);
    const c = document.createElement('canvas');
    c.width = Math.round(w * k);
    c.height = Math.round(h * k);
    c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
    return c;
  };

  const carregarFoto = (src: string) =>
    new Promise<void>((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        estado.foto = reduzir(img);
        if (src.startsWith('blob:')) URL.revokeObjectURL(src);
        centralizar();
        desenhar();
        resolve();
      };
      img.onerror = () => reject(new Error('imagem inválida'));
      img.src = src;
    });

  const limparFoto = () => {
    estado.foto = null;
    estado.enquadramento = { escala: 1, offset: { x: 0, y: 0 } };
    desenhar();
  };

  const temFoto = () => estado.foto !== null;

  /* ---------------------------------------------------------
     Interação: arrastar, pinça, roda do mouse e teclado
     --------------------------------------------------------- */
  const noCanvas = (clientX: number, clientY: number) => {
    const r = canvas.getBoundingClientRect();
    return {
      x: (clientX - r.left) * (canvas.width / r.width),
      y: (clientY - r.top) * (canvas.height / r.height),
    };
  };

  const mover = (dx: number, dy: number) => {
    estado.enquadramento.offset.x += dx;
    estado.enquadramento.offset.y += dy;
  };

  function ligarInteracoes(): () => void {
    let arrastando = false;
    let ini = { x: 0, y: 0 };
    let distInicial: number | null = null;
    let pinca = false;
    let meio = { x: 0, y: 0 };

    const onMouseDown = (e: MouseEvent) => {
      if (!estado.foto) return;
      const p = noCanvas(e.clientX, e.clientY);
      if (!dentroDaJanela(fmt(), p.x, p.y)) return;
      arrastando = true;
      ini = p;
    };
    const onMouseMove = (e: MouseEvent) => {
      if (!arrastando) return;
      const p = noCanvas(e.clientX, e.clientY);
      mover(p.x - ini.x, p.y - ini.y);
      ini = p;
      desenhar();
    };
    const onMouseUp = () => {
      arrastando = false;
    };

    const onTouchStart = (e: TouchEvent) => {
      if (!estado.foto) return;
      if (e.touches.length === 1) {
        const t = e.touches[0]!;
        const p = noCanvas(t.clientX, t.clientY);
        arrastando = dentroDaJanela(fmt(), p.x, p.y);
        ini = p;
      } else if (e.touches.length === 2) {
        e.preventDefault();
        const a = e.touches[0]!;
        const b = e.touches[1]!;
        distInicial = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
        meio = noCanvas(
          (a.clientX + b.clientX) / 2,
          (a.clientY + b.clientY) / 2,
        );
        pinca = true;
        arrastando = false;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 1 && arrastando) {
        e.preventDefault();
        const t = e.touches[0]!;
        const p = noCanvas(t.clientX, t.clientY);
        mover(p.x - ini.x, p.y - ini.y);
        ini = p;
        desenhar();
      } else if (e.touches.length === 2 && pinca && estado.foto) {
        e.preventDefault();
        const a = e.touches[0]!;
        const b = e.touches[1]!;
        const d = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
        const m = noCanvas(
          (a.clientX + b.clientX) / 2,
          (a.clientY + b.clientY) / 2,
        );
        if (distInicial) {
          zoomEm(d / distInicial, m.x, m.y);
          mover(m.x - meio.x, m.y - meio.y);
          desenhar();
        }
        distInicial = d;
        meio = m;
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      arrastando = false;
      if (e.touches.length < 2) {
        distInicial = null;
        pinca = false;
      }
    };

    const onWheel = (e: WheelEvent) => {
      if (!estado.foto) return;
      e.preventDefault();
      const p = noCanvas(e.clientX, e.clientY);
      zoomEm(e.deltaY < 0 ? 1.08 : 1 / 1.08, p.x, p.y);
      desenhar();
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (!estado.foto) return;
      const passo = e.shiftKey ? 60 : 16;
      const c = centroJanela(fmt());
      const acoes: Record<string, () => void> = {
        ArrowLeft: () => mover(-passo, 0),
        ArrowRight: () => mover(passo, 0),
        ArrowUp: () => mover(0, -passo),
        ArrowDown: () => mover(0, passo),
        '+': () => zoomEm(1.1, c.x, c.y),
        '=': () => zoomEm(1.1, c.x, c.y),
        '-': () => zoomEm(1 / 1.1, c.x, c.y),
      };
      const acao = acoes[e.key];
      if (!acao) return;
      e.preventDefault();
      acao();
      desenhar();
    };

    canvas.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('touchend', onTouchEnd);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    canvas.addEventListener('keydown', onKeyDown);

    return () => {
      canvas.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchmove', onTouchMove);
      canvas.removeEventListener('touchend', onTouchEnd);
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('keydown', onKeyDown);
      if (pedido) cancelAnimationFrame(pedido);
    };
  }

  /* Os botões de zoom aproximam em torno do centro da janela, para a foto
     não "fugir" para o canto. */
  const zoomPeloBotao = (fator: number) => {
    if (!estado.foto) return;
    const c = centroJanela(fmt());
    zoomEm(fator, c.x, c.y);
    desenhar();
  };

  /* ---------------------------------------------------------
     Exportar
     JPEG: é foto, então fica bem menor que PNG, e é o formato que WhatsApp e
     Instagram aceitam sem conversão.
     --------------------------------------------------------- */
  const gerarArquivo = () =>
    new Promise<{ blob: Blob; file: File }>((resolve, reject) => {
      /* Garante que o último quadro pendente já foi desenhado. */
      requestAnimationFrame(() => {
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('toBlob falhou'));
              return;
            }
            resolve({
              blob,
              file: new File([blob], fmt().arquivo, { type: 'image/jpeg' }),
            });
          },
          'image/jpeg',
          QUALIDADE_JPEG,
        );
      });
    });

  return {
    selecionarFormato,
    carregarFoto,
    limparFoto,
    temFoto,
    centralizar,
    desenhar,
    ligarInteracoes,
    zoomPeloBotao,
    gerarArquivo,
    nomeDoArquivo: () => fmt().arquivo,
  };
}
