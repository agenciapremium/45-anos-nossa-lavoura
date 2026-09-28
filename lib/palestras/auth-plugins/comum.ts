import 'server-only';

import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';

import { env } from '@/lib/env';
import { duracaoDaSessao } from '@/lib/palestras/papeis';
import type { Papel } from '@/lib/db/schema';

/* =========================================================
   Peças comuns aos dois plugins próprios

   D1 do design: senha e link mágico são nativos do Better Auth; OTP por CPF
   e CPF + data de nascimento são plugins deste projeto, porque em nenhum
   dos dois o identificador digitado é um e-mail.

   O que os dois compartilham: a forma de comparar segredos, a de guardar
   um código sem guardá-lo em claro, e a duração da sessão por papel.
   ========================================================= */

/**
 * Comparação em tempo constante.
 *
 * Um `===` vaza, pela diferença de tempo, quantos caracteres iniciais
 * batem. Com um código de 6 dígitos e um atacante paciente, isso encurta a
 * busca de um milhão de combinações para sessenta.
 */
export function iguaisEmTempoConstante(a: string, b: string): boolean {
  const ba = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  if (ba.length !== bb.length) {
    // Compara mesmo assim, contra si próprio, para o tempo não denunciar o
    // comprimento do valor esperado.
    timingSafeEqual(ba, ba);
    return false;
  }
  return timingSafeEqual(ba, bb);
}

/**
 * Impressão do código guardada no banco, em vez do código.
 *
 * Um código de 6 dígitos tem um milhão de valores: um SHA simples seria
 * revertido por tabela. O HMAC com o segredo da aplicação torna a reversão
 * inviável para quem obtenha o banco sem o segredo.
 */
export function impressaoDoCodigo(codigo: string): string {
  return createHmac('sha256', env().BETTER_AUTH_SECRET)
    .update(codigo)
    .digest('base64url');
}

/** Código de 6 dígitos, sorteado sem viés. */
export function gerarCodigo(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, '0');
}

/**
 * Quando esta sessão deve morrer, pelo papel de quem entrou.
 *
 * 12 horas para colaborador e recepção, 7 dias para admin e gerentes. Vale
 * para **todos** os métodos: uma sessão aberta por CPF + nascimento não
 * dura menos nem mais que a aberta por senha pelo mesmo papel.
 */
export function expiracaoDaSessao(papel: Papel, agora = new Date()): Date {
  return new Date(agora.getTime() + duracaoDaSessao(papel) * 1000);
}

/**
 * Valor guardado na linha de verificação: impressão do código e quantas
 * tentativas de digitação já houve.
 *
 * Vai tudo num campo só porque a tabela `verification` do Better Auth tem
 * exatamente três colunas úteis (`identifier`, `value`, `expires_at`), e
 * estender o esquema nativo por causa de um contador não se justifica.
 */
export function montarValor(impressao: string, tentativas: number): string {
  return `${impressao}.${tentativas}`;
}

export function lerValor(valor: string): {
  impressao: string;
  tentativas: number;
} {
  const separador = valor.lastIndexOf('.');
  if (separador < 0) return { impressao: valor, tentativas: 0 };
  return {
    impressao: valor.slice(0, separador),
    tentativas: Number(valor.slice(separador + 1)) || 0,
  };
}
