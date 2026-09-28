import 'server-only';

import { headers } from 'next/headers';

/* =========================================================
   Origem da requisição

   IP e agente de usuário são evidência de consentimento (spec
   `consentimento-lgpd`) e chave do limite por IP. Ficam num módulo só
   porque ler `x-forwarded-for` errado é fácil e silencioso.
   ========================================================= */

/**
 * IP do visitante, atrás do proxy da Vercel.
 *
 * `x-forwarded-for` chega como uma lista; o **primeiro** endereço é o do
 * cliente, e os seguintes são os proxies pelo caminho. Pegar o último
 * daria o IP da própria borda da Vercel — e todo mundo compartilharia a
 * mesma chave de limite.
 *
 * Um cliente pode forjar o cabeçalho, mas não na Vercel: a borda
 * sobrescreve o valor antes de a função ver. Em outro hospedeiro isso
 * precisa ser reavaliado.
 */
export async function enderecoDeOrigem(): Promise<string | null> {
  const cabecalhos = await headers();

  const encaminhado = cabecalhos.get('x-forwarded-for');
  if (encaminhado) {
    const primeiro = encaminhado.split(',')[0]?.trim();
    if (primeiro) return primeiro;
  }

  return (
    cabecalhos.get('x-real-ip') ??
    cabecalhos.get('x-vercel-forwarded-for') ??
    null
  );
}

/** Agente de usuário, cortado no que cabe num campo de evidência. */
export async function agenteDeUsuario(): Promise<string | null> {
  const cabecalhos = await headers();
  const bruto = cabecalhos.get('user-agent');
  return bruto ? bruto.slice(0, 500) : null;
}

/**
 * Chave de limite por IP.
 *
 * Sem IP identificável, todo mundo cai numa chave comum — conservador de
 * propósito: é melhor limitar demais um caso raro que abrir a porta.
 */
export function chaveDeLimite(finalidade: string, ip: string | null): string {
  return `${finalidade}:${ip ?? 'desconhecido'}`;
}

/**
 * Segura a resposta até um piso de tempo (D10 do design).
 *
 * As telas de convite inexistente, cancelado e já utilizado precisam
 * demorar aproximadamente o mesmo tanto: sem isso, uma consulta que não
 * encontra nada volta mais rápido que uma que encontra, e a diferença é
 * suficiente para varrer códigos válidos medindo o relógio.
 *
 * O piso é constante, não aleatório. Jitter mascara a média, mas com
 * amostras suficientes a distribuição ainda separa os dois casos; um piso
 * fixo acima do pior caso de trabalho real não separa.
 */
export const PISO_DE_RESPOSTA_MS = 260;

export async function aguardarPisoDeTempo(
  inicio: number,
  pisoMs: number = PISO_DE_RESPOSTA_MS,
): Promise<void> {
  const restante = pisoMs - (Date.now() - inicio);
  if (restante > 0) {
    await new Promise((resolver) => setTimeout(resolver, restante));
  }
}
