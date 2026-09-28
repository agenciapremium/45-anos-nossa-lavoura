import 'server-only';

import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';

import { somenteDigitos } from '@/lib/palestras/cpf';
import { env } from '@/lib/env';
import { VALIDADE_DO_CODIGO_SEGUNDOS } from '@/lib/palestras/limite-politicas';

/* =========================================================
   Pendência do código por CPF

   Entre a tela que pede o CPF e a que pede o código de seis dígitos há um
   estado a carregar: qual CPF, e qual e-mail mascarado mostrar. Ele vai num
   cookie `HttpOnly` e **assinado**, com a mesma validade do código.

   Por que assinado, se o conteúdo é o CPF que a própria pessoa digitou:
   sem assinatura, qualquer um editaria o cookie para outro CPF e a tela do
   código viraria um verificador de cadastro — bastaria trocar o número e
   ver se aparece e-mail mascarado. A assinatura prende o par
   (CPF, e-mail mascarado) ao que o servidor de fato resolveu.

   O cookie **não** autentica nada. Quem autentica é o código de seis
   dígitos, que só existe na caixa de entrada do dono do cadastro.
   ========================================================= */

const NOME = 'palestras_codigo_pendente';

export type Pendencia = { cpf: string; emailMascarado: string };

function assinar(carga: string): string {
  return createHmac('sha256', env().BETTER_AUTH_SECRET)
    .update(carga)
    .digest('base64url');
}

export async function guardarPendencia(pendencia: Pendencia): Promise<void> {
  const carga = Buffer.from(
    JSON.stringify({
      cpf: somenteDigitos(pendencia.cpf),
      email: pendencia.emailMascarado,
    }),
    'utf8',
  ).toString('base64url');

  const lista = await cookies();
  lista.set(NOME, `${carga}.${assinar(carga)}`, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/palestras',
    maxAge: VALIDADE_DO_CODIGO_SEGUNDOS,
  });
}

export async function lerPendencia(): Promise<Pendencia | null> {
  const bruto = (await cookies()).get(NOME)?.value;
  if (!bruto) return null;

  const ponto = bruto.lastIndexOf('.');
  if (ponto <= 0) return null;

  const carga = bruto.slice(0, ponto);
  const assinatura = bruto.slice(ponto + 1);
  const esperada = assinar(carga);

  const a = Buffer.from(assinatura, 'utf8');
  const b = Buffer.from(esperada, 'utf8');
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const dados = JSON.parse(Buffer.from(carga, 'base64url').toString('utf8'));
    if (
      typeof dados?.cpf !== 'string' ||
      typeof dados?.email !== 'string' ||
      dados.cpf.length !== 11
    ) {
      return null;
    }
    return { cpf: dados.cpf, emailMascarado: dados.email };
  } catch {
    return null;
  }
}

export async function limparPendencia(): Promise<void> {
  (await cookies()).delete(NOME);
}
