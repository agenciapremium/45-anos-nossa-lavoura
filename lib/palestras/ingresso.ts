import 'server-only';

import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

import QRCode from 'qrcode';

/* =========================================================
   Ingresso digital

   Três coisas moram aqui: o token que vira QR, o QR em si e a impressão
   que identifica o dispositivo do titular.
   ========================================================= */

/** 32 bytes, como o PRD e a spec exigem. */
export const BYTES_DO_TOKEN = 32;

/**
 * Token do ingresso: 32 bytes de fonte criptográfica, em base64 URL-safe.
 *
 * É o **conteúdo inteiro** do QR (D5 do design). Não é uma URL, não carrega
 * CPF, nome nem identificador de palestra: o leitor de check-in é nosso e
 * sabe o que fazer com o token. Assim, apontar a câmera de um celular
 * qualquer para o ingresso alheio não abre página nenhuma nem revela nada.
 */
export function gerarIngressoToken(): string {
  return randomBytes(BYTES_DO_TOKEN).toString('base64url');
}

/**
 * QR como `data:` URI, para funcionar sem rede.
 *
 * A imagem viaja dentro do HTML. Na porta do evento, com o celular sem
 * sinal, uma `<img src="/algo.png">` não carregaria — e o ingresso salvo
 * como imagem depende de o QR já estar desenhado no momento da captura.
 *
 * Correção de erro em nível M (~15%): o ingresso pode ser lido de uma tela
 * riscada ou de uma foto tirada de outro celular.
 */
export async function qrComoDataUri(token: string): Promise<string> {
  return QRCode.toDataURL(token, {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 512,
    color: { dark: '#2a1512ff', light: '#ffffffff' },
  });
}

/* ---------------------------------------------------------
   Dispositivo do titular (D3 do design)
   --------------------------------------------------------- */

/** Cookie do convite: escopo de caminho, nunca do site inteiro. */
export function nomeDoCookieDeDispositivo(codigo: string): string {
  return `ingresso_${codigo}`;
}

export function caminhoDoCookieDeDispositivo(codigo: string): string {
  return `/palestras/c/${codigo}`;
}

/**
 * Valor opaco que prova, naquele dispositivo, ser o titular.
 *
 * É derivado do id da confirmação **e** do token do ingresso, e nunca é
 * nenhum dos dois. Duas consequências: o cookie não serve de ingresso se
 * vazar para o check-in, e não há como forjá-lo sem conhecer o token, que
 * nunca sai do servidor a não ser desenhado dentro do QR do próprio
 * titular.
 *
 * Alternativa considerada: gravar o id da confirmação direto no cookie.
 * Rejeitada porque o id circula em consultas administrativas e em
 * auditoria; uma impressão derivada não circula em lugar nenhum.
 */
export function impressaoDoDispositivo(
  confirmacaoId: string,
  ingressoToken: string,
): string {
  return createHash('sha256')
    .update(`${confirmacaoId}:${ingressoToken}`)
    .digest('base64url');
}

/** Comparação em tempo constante, para não vazar o prefixo correto. */
export function impressaoConfere(
  enviada: string | undefined,
  esperada: string,
): boolean {
  if (!enviada) return false;
  const a = Buffer.from(enviada);
  const b = Buffer.from(esperada);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** Duração do cookie: uma semana depois da palestra já não serve a nada. */
export const DIAS_DO_COOKIE = 60;
