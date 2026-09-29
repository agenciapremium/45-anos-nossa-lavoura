import { SELO_DO_CIRCUITO } from '@/components/palestras/selo';
import type { DadosDoIngresso } from './ingresso';

/* ---------------------------------------------------------
   Desenho da imagem

   Canvas em vez de captura de HTML (`html-to-image`), como D6 do design
   permite. Motivo prático: a captura de HTML depende de o navegador
   rasterizar webfont, `clip-path` e sombra do mesmo jeito, e o Safari do
   iPhone (o navegador desta audiência) é justamente onde ela falha mais.
   Desenhando, o resultado é igual em todo lugar, e o arquivo sai com o QR
   já embutido.
   --------------------------------------------------------- */

const LARGURA = 1080;
const ALTURA = 1620;

/**
 * Cores do desenho, lidas dos tokens de `tokens.css`.
 *
 * O `canvas` não lê `var(...)`, então quem chama `desenharIngresso` resolve
 * as variáveis com `getComputedStyle` (mesmo caminho que já existe para as
 * famílias de fonte) e repassa aqui. Os valores abaixo só entram quando a
 * leitura falha, e são os mesmos tokens, por extenso, como último recurso.
 */
export type CoresDoIngresso = {
  fundo: string;
  escuro: string;
  terra: string;
  lima: string;
  creme: string;
  branco: string;
  suave: string;
};

export const CORES_PADRAO: CoresDoIngresso = {
  fundo: '#fffadc',
  escuro: '#2a1512',
  terra: '#3d201b',
  lima: '#b8db3d',
  creme: '#fffadc',
  branco: '#ffffff',
  suave: '#8a5b4f',
};

function carregarImagem(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/** Quebra o texto na largura disponível e devolve as linhas. */
function quebrar(
  ctx: CanvasRenderingContext2D,
  texto: string,
  largura: number,
): string[] {
  const palavras = texto.split(/\s+/);
  const linhas: string[] = [];
  let atual = '';
  for (const palavra of palavras) {
    const tentativa = atual ? `${atual} ${palavra}` : palavra;
    if (ctx.measureText(tentativa).width > largura && atual) {
      linhas.push(atual);
      atual = palavra;
    } else {
      atual = tentativa;
    }
  }
  if (atual) linhas.push(atual);
  return linhas;
}

function escrever(
  ctx: CanvasRenderingContext2D,
  texto: string,
  x: number,
  y: number,
  opcoes: {
    fonte: string;
    cor: string;
    largura: number;
    entrelinha: number;
    centro?: boolean;
  },
): number {
  ctx.font = opcoes.fonte;
  ctx.fillStyle = opcoes.cor;
  ctx.textAlign = opcoes.centro ? 'center' : 'left';
  let cursor = y;
  for (const linha of quebrar(ctx, texto, opcoes.largura)) {
    ctx.fillText(linha, x, cursor);
    cursor += opcoes.entrelinha;
  }
  return cursor;
}

export async function desenharIngresso(
  dados: DadosDoIngresso,
  familias: { titulo: string; corpo: string },
  cores: CoresDoIngresso = CORES_PADRAO,
): Promise<HTMLCanvasElement> {
  const canvas = document.createElement('canvas');
  canvas.width = LARGURA;
  canvas.height = ALTURA;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas indisponível');

  const [selo, qr] = await Promise.all([
    carregarImagem(SELO_DO_CIRCUITO),
    carregarImagem(dados.qr),
  ]);

  ctx.fillStyle = cores.fundo;
  ctx.fillRect(0, 0, LARGURA, ALTURA);

  /* ---- faixa superior ---- */
  const faixa = 430;
  ctx.fillStyle = cores.escuro;
  ctx.fillRect(0, 0, LARGURA, faixa);

  if (selo) {
    // Proporção 1:1 sempre: o selo traz as marcas dos patrocinadores.
    const lado = 230;
    ctx.drawImage(selo, (LARGURA - lado) / 2, 48, lado, lado);
  }

  ctx.textAlign = 'center';
  ctx.font = `700 26px ${familias.corpo}`;
  ctx.fillStyle = cores.lima;
  ctx.fillText('ACELERA NO CAMPO 3.0', LARGURA / 2, 330);

  ctx.font = `700 44px ${familias.titulo}`;
  ctx.fillStyle = cores.creme;
  ctx.fillText('INGRESSO CONFIRMADO', LARGURA / 2, 390);

  /* ---- QR ---- */
  const cartao = 620;
  const cartaoX = (LARGURA - cartao) / 2;
  const cartaoY = faixa + 48;
  ctx.fillStyle = cores.branco;
  ctx.fillRect(cartaoX, cartaoY, cartao, cartao);
  ctx.strokeStyle = cores.terra;
  ctx.lineWidth = 6;
  ctx.strokeRect(cartaoX, cartaoY, cartao, cartao);

  if (qr) {
    const lado = cartao - 60;
    ctx.drawImage(qr, cartaoX + 30, cartaoY + 30, lado, lado);
  }

  let y = cartaoY + cartao + 70;

  ctx.textAlign = 'center';
  ctx.font = `700 30px ${familias.corpo}`;
  ctx.fillStyle = cores.terra;
  ctx.fillText('VALE PARA 2 PESSOAS', LARGURA / 2, y);
  y += 60;

  /* ---- pessoas ---- */
  const margem = 90;
  const util = LARGURA - margem * 2;

  y = escrever(ctx, dados.titular, LARGURA / 2, y, {
    fonte: `700 46px ${familias.titulo}`,
    cor: cores.escuro,
    largura: util,
    entrelinha: 56,
    centro: true,
  });

  if (dados.acompanhante) {
    y += 8;
    y = escrever(ctx, `com ${dados.acompanhante}`, LARGURA / 2, y, {
      fonte: `400 32px ${familias.corpo}`,
      cor: cores.suave,
      largura: util,
      entrelinha: 42,
      centro: true,
    });
  }

  y += 40;
  ctx.fillStyle = cores.lima;
  ctx.fillRect(margem, y, util, 6);
  y += 62;

  /* ---- palestra ---- */
  y = escrever(
    ctx,
    `${dados.cidade} · ${dados.data} às ${dados.horario}`,
    LARGURA / 2,
    y,
    {
      fonte: `700 40px ${familias.titulo}`,
      cor: cores.escuro,
      largura: util,
      entrelinha: 50,
      centro: true,
    },
  );

  y += 12;
  y = escrever(ctx, dados.localNome, LARGURA / 2, y, {
    fonte: `700 32px ${familias.corpo}`,
    cor: cores.terra,
    largura: util,
    entrelinha: 42,
    centro: true,
  });

  y = escrever(ctx, dados.localEndereco, LARGURA / 2, y, {
    fonte: `400 28px ${familias.corpo}`,
    cor: cores.terra,
    largura: util,
    entrelinha: 38,
    centro: true,
  });

  /* ---- rodapé ---- */
  ctx.fillStyle = cores.escuro;
  ctx.fillRect(0, ALTURA - 96, LARGURA, 96);
  ctx.textAlign = 'center';
  ctx.font = `700 26px ${familias.corpo}`;
  ctx.fillStyle = cores.creme;
  ctx.fillText(
    `Convite ${dados.codigo} · pessoal e intransferível`,
    LARGURA / 2,
    ALTURA - 38,
  );

  return canvas;
}
