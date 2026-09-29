import type { EstadoDeConvite } from '@/lib/db/schema';
import type { ResumoDeContagem } from '@/lib/palestras/dados';

/* =========================================================
   Taxas de confirmação e comparecimento (`visao-gerencial`)

   Módulo puro, sem banco: a conta é a mesma em qualquer lugar que precise
   dela, e um cálculo puro é testável sem infraestrutura.

   Definições (conferidas contra os dois cenários da spec):
   - "gerados" é a soma de TODOS os estados. Cancelados continuam no
     denominador — a spec é explícita: "cancelados permanecem no
     denominador de gerados, e a tela diz isso".
   - "confirmados", para as duas taxas, é quem chegou a confirmar —
     estado `confirmado` OU `presente`. Um convite `presente` passou por
     `confirmado` a caminho; não contar os dois juntos subestimaria a
     confirmação e inflaria artificialmente o comparecimento.
     (Confere com o exemplo da spec: 40 confirmados dos quais 30 com
     check-in não são "40 mais 30" — são 40 no total, 30 já presentes.)
   - Divisor zero não é erro: a taxa fica indisponível (`null`), e quem
     exibe mostra "N/D", nunca "0%" nem uma exceção.
   ========================================================= */

export type Taxas = {
  /** `null` quando não há convites gerados — nada para dividir. */
  confirmacao: number | null;
  /** `null` quando não há confirmados — ninguém para comparecer. */
  comparecimento: number | null;
};

/** Quantos convites, de qualquer estado, este resumo contabiliza. */
export function totalGerados(resumo: Partial<ResumoDeContagem>): number {
  return (
    (resumo.disponivel ?? 0) +
    (resumo.confirmado ?? 0) +
    (resumo.presente ?? 0) +
    (resumo.expirado ?? 0) +
    (resumo.cancelado ?? 0)
  );
}

/** Quem confirmou, contando os dois estados que passaram pela confirmação. */
export function totalConfirmados(resumo: Partial<ResumoDeContagem>): number {
  return (resumo.confirmado ?? 0) + (resumo.presente ?? 0);
}

export function calcularTaxas(resumo: Partial<ResumoDeContagem>): Taxas {
  const gerados = totalGerados(resumo);
  const confirmados = totalConfirmados(resumo);
  const presentes = resumo.presente ?? 0;

  return {
    confirmacao: gerados > 0 ? confirmados / gerados : null,
    comparecimento: confirmados > 0 ? presentes / confirmados : null,
  };
}

/** `0.4` -> `"40%"`; `null` -> `"N/D"` (indisponível, sem erro, sem travessão). */
export function formatarTaxa(taxa: number | null): string {
  if (taxa === null) return 'N/D';
  return `${Math.round(taxa * 100)}%`;
}

/** Soma vários resumos — usado para o total de um nível agregado. */
export function somarResumos(
  resumos: Partial<ResumoDeContagem>[],
): ResumoDeContagem {
  const total: ResumoDeContagem = {
    disponivel: 0,
    confirmado: 0,
    presente: 0,
    expirado: 0,
    cancelado: 0,
  };
  const estados: EstadoDeConvite[] = [
    'disponivel',
    'confirmado',
    'presente',
    'expirado',
    'cancelado',
  ];
  for (const r of resumos) {
    for (const estado of estados) total[estado] += r[estado] ?? 0;
  }
  return total;
}
