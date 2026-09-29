/**
 * Estado inicial das Server Actions desta tela.
 *
 * Mora fora de `acoes.ts` porque um módulo `'use server'` só pode exportar
 * funções async. Exportar um objeto de lá derruba a rota em tempo de
 * execução — "A `use server` file can only export async functions" — e o
 * `next build` não pega: só a primeira requisição pega.
 */

import type { EstadoDaAnotacao, EstadoDoCancelamentoPainel } from './acoes';

export const CANCELAMENTO_PAINEL_INICIAL: EstadoDoCancelamentoPainel = {
  ok: false,
};
export const ANOTACAO_INICIAL: EstadoDaAnotacao = { ok: false };
