/* =========================================================
   Origem de um convite · texto único do sistema (D7 de `convites-avulsos`)

   Módulo **puro**: sem `server-only`, sem banco. É o que permite que o
   mesmo texto seja usado na consulta (`lib/palestras/dados.ts`), na tela
   do painel (Server Component), na linha da lista (Client Component), no
   PDF e no CSV, sem cada um inventar o próprio "sem colaborador".

   A regra é uma frase: onde a interface mostraria de quem o convite veio,
   o convite avulso mostra **Administração**, e o rótulo do lote entra como
   detalhe logo abaixo — "Avulso" quando o lote não tem rótulo. Campo em
   branco é proibido: numa lista impressa ou na porta, célula vazia parece
   defeito do sistema, não uma informação.
   ========================================================= */

/** O que aparece no lugar do colaborador e da loja num convite avulso. */
export const ORIGEM_AVULSA = 'Administração';

/**
 * O detalhe de um lote avulso sem rótulo. Decisão da cliente (29/09/2026):
 * o rótulo é opcional, e a ausência dele não deixa a coluna vazia.
 */
export const ROTULO_AVULSO_PADRAO = 'Avulso';

/** O suficiente para decidir a origem: vem igual da consulta e da tela. */
export type ConviteComOrigem = {
  colaboradorNome: string | null;
  lojaNome: string | null;
  /** `rotulo` do lote, quando o convite nasceu de um lote avulso. */
  loteRotulo: string | null;
};

export type Origem = {
  /** Linha principal: o colaborador, ou "Administração". */
  titulo: string;
  /** Linha secundária: a loja, ou o rótulo do lote. Nunca string vazia. */
  detalhe: string | null;
  /** Verdadeiro quando o convite não tem colaborador de origem. */
  avulso: boolean;
};

/**
 * O par (título, detalhe) que toda tela usa para dizer de onde o convite
 * veio.
 *
 * O critério de "é avulso" é `colaboradorNome === null`, e não
 * `loteRotulo !== null`: um lote avulso pode não ter rótulo, e um convite
 * pode ter perdido o lote (`palestra_convite.lote_id` é `on delete set
 * null`). Quem manda é a ausência do colaborador, que é o que a coluna
 * anulável do banco significa.
 */
export function origemDoConvite(convite: ConviteComOrigem): Origem {
  if (convite.colaboradorNome !== null) {
    return {
      titulo: convite.colaboradorNome,
      detalhe: convite.lojaNome,
      avulso: false,
    };
  }
  return {
    titulo: ORIGEM_AVULSA,
    detalhe: convite.loteRotulo ?? ROTULO_AVULSO_PADRAO,
    avulso: true,
  };
}

/** "Administração · Imprensa", para uma linha só (PDF, CSV, resultado do check-in). */
export function origemEmUmaLinha(convite: ConviteComOrigem): string {
  const { titulo, detalhe } = origemDoConvite(convite);
  return detalhe ? `${titulo} · ${detalhe}` : titulo;
}
