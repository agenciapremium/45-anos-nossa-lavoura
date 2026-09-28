import 'server-only';

import { cookies } from 'next/headers';

import {
  caminhoDoCookieDeDispositivo,
  DIAS_DO_COOKIE,
  impressaoConfere,
  impressaoDoDispositivo,
  nomeDoCookieDeDispositivo,
} from '@/lib/palestras/ingresso';

/* =========================================================
   Dispositivo do titular (D3 do design)

   O PRD diz que "o ingresso fica acessível no mesmo link a partir desse
   dispositivo". Não é sessão nem conta: é um cookie com escopo daquele
   convite, gravado na confirmação e conferido a cada abertura.

   Perder o cookie — navegação anônima, limpar dados, trocar de celular —
   é previsto. O caminho de volta é `/palestras/ingresso`, com CPF e
   código, e a própria tela de "já utilizado" aponta para lá.
   ========================================================= */

/** O cookie deste convite prova ser o titular? */
export async function ehODispositivoDoTitular(
  codigo: string,
  confirmacaoId: string,
  ingressoToken: string,
): Promise<boolean> {
  const jar = await cookies();
  const enviado = jar.get(nomeDoCookieDeDispositivo(codigo))?.value;
  return impressaoConfere(
    enviado,
    impressaoDoDispositivo(confirmacaoId, ingressoToken),
  );
}

/**
 * Grava o cookie do titular.
 *
 * - `httpOnly`: JavaScript da página não lê, então um XSS em qualquer
 *   outra rota do domínio não leva embora o acesso ao ingresso.
 * - `secure`: só sobre HTTPS. Liberado apenas em desenvolvimento, onde o
 *   servidor local é `http://` e o navegador descartaria o cookie — em
 *   preview e em produção a exigência vale.
 * - `sameSite: 'lax'`: o link chega de fora (WhatsApp), então `strict`
 *   faria o ingresso sumir justamente na primeira abertura.
 * - `path`: escopo do convite, não do site. O cookie de um convite não é
 *   enviado na requisição de outro.
 */
export async function marcarDispositivoDoTitular(
  codigo: string,
  confirmacaoId: string,
  ingressoToken: string,
): Promise<void> {
  const jar = await cookies();
  jar.set({
    name: nomeDoCookieDeDispositivo(codigo),
    value: impressaoDoDispositivo(confirmacaoId, ingressoToken),
    httpOnly: true,
    secure: process.env.NODE_ENV !== 'development',
    sameSite: 'lax',
    path: caminhoDoCookieDeDispositivo(codigo),
    maxAge: DIAS_DO_COOKIE * 24 * 60 * 60,
  });
}

/** Apaga o cookie — usado quando a confirmação deixa de existir. */
export async function esquecerDispositivo(codigo: string): Promise<void> {
  const jar = await cookies();
  jar.set({
    name: nomeDoCookieDeDispositivo(codigo),
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV !== 'development',
    sameSite: 'lax',
    path: caminhoDoCookieDeDispositivo(codigo),
    maxAge: 0,
  });
}
