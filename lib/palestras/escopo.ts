import {
  alcanceDe,
  type AcaoProtegida,
  type Alcance,
  type Papel,
} from '@/lib/palestras/papeis';

/* =========================================================
   Escopo do usuário

   D4 do design: a autorização tem duas camadas, e a que realmente protege é
   a segunda — o filtro de escopo na consulta. O middleware não sabe se o
   convite `K7Q2MX` pertence ao colaborador que o pediu; a consulta sabe.

   Daí a regra que este módulo existe para sustentar: **nenhuma função de
   acesso a dados de domínio roda sem receber um `Escopo`**. Não é
   convenção de revisão de código, é a assinatura da função — esquecer o
   escopo não compila.

   O módulo é puro de propósito: sem banco, sem `server-only`, sem Next. As
   decisões de acesso são o ponto mais sensível do sistema e precisam ser
   testáveis sem infraestrutura.
   ========================================================= */

/**
 * Quem está pedindo e a que ele está vinculado.
 *
 * Montado uma vez por requisição, a partir da sessão verificada, e passado
 * adiante. Nunca montado a partir de dado que venha do cliente.
 */
export type Escopo = {
  usuarioId: string;
  papel: Papel;
  /** Vínculo do gerente regional. */
  regionalId: string | null;
  /** Vínculo do gerente de loja e do colaborador. */
  lojaId: string | null;
};

/**
 * O recurso que se quer alcançar, descrito pelo que ele tem de vínculo.
 *
 * Os campos são opcionais porque nem todo recurso tem os três: um convite
 * tem colaborador (e, por ele, loja e regional); uma loja tem regional.
 */
export type Recurso = {
  /** Dono do convite / do PDF / da confirmação. */
  colaboradorId?: string | null;
  lojaId?: string | null;
  regionalId?: string | null;
};

/** Motivo da recusa. Serve ao log; **não** ao usuário. */
export type MotivoDaRecusa = 'papel' | 'escopo';

export type Decisao =
  | { permitido: true; alcance: Alcance }
  | { permitido: false; motivo: MotivoDaRecusa };

/**
 * Pode este escopo executar esta ação sobre este recurso?
 *
 * Duas perguntas em sequência, e a ordem importa:
 *
 * 1. O **papel** permite a ação? (matriz do PRD)
 * 2. O **recurso** está dentro do alcance desse papel?
 *
 * Um gerente regional passa na primeira para "ver convites" e reprova na
 * segunda quando o convite é de outra regional. As duas recusas produzem o
 * mesmo 403 para quem pediu — a distinção só existe no registro.
 */
export function decidir(
  escopo: Escopo,
  acao: AcaoProtegida,
  recurso?: Recurso,
): Decisao {
  const alcance = alcanceDe(escopo.papel, acao);
  if (alcance === 'nenhum') return { permitido: false, motivo: 'papel' };

  // Sem recurso nomeado, a pergunta é só sobre o papel: "posso abrir esta
  // tela?". O filtro por escopo entra depois, na consulta.
  if (!recurso) return { permitido: true, alcance };

  if (alcance === 'todos' || alcance === 'palestra') {
    return { permitido: true, alcance };
  }

  if (alcance === 'proprios') {
    return recurso.colaboradorId && recurso.colaboradorId === escopo.usuarioId
      ? { permitido: true, alcance }
      : { permitido: false, motivo: 'escopo' };
  }

  if (alcance === 'loja') {
    return recurso.lojaId && recurso.lojaId === escopo.lojaId
      ? { permitido: true, alcance }
      : { permitido: false, motivo: 'escopo' };
  }

  // regional
  return recurso.regionalId && recurso.regionalId === escopo.regionalId
    ? { permitido: true, alcance }
    : { permitido: false, motivo: 'escopo' };
}

/** Atalho booleano de `decidir`. */
export function permitido(
  escopo: Escopo,
  acao: AcaoProtegida,
  recurso?: Recurso,
): boolean {
  return decidir(escopo, acao, recurso).permitido;
}

/**
 * Erro lançado quando a decisão é negativa.
 *
 * Carrega o motivo para o registro, e **nada** do recurso: a mensagem que
 * chega ao usuário é sempre a mesma, e a spec é explícita em que o 403 não
 * pode revelar dado nenhum do que ele tentou alcançar.
 */
export class SemAcesso extends Error {
  readonly motivo: MotivoDaRecusa;
  readonly acao: AcaoProtegida;

  constructor(acao: AcaoProtegida, motivo: MotivoDaRecusa) {
    super('Sem acesso');
    this.name = 'SemAcesso';
    this.acao = acao;
    this.motivo = motivo;
  }
}

/** Exige a permissão ou lança `SemAcesso`. */
export function exigir(
  escopo: Escopo,
  acao: AcaoProtegida,
  recurso?: Recurso,
): Alcance {
  const decisao = decidir(escopo, acao, recurso);
  if (!decisao.permitido) throw new SemAcesso(acao, decisao.motivo);
  return decisao.alcance;
}

/**
 * Um escopo está bem formado quando o vínculo que o papel exige existe.
 *
 * Um gerente de loja sem `lojaId` enxergaria "a loja nula", o que em SQL
 * mal escrito vira "todas as lojas". Aqui ele simplesmente não enxerga
 * nada, e o problema aparece como cadastro incompleto, não como vazamento.
 */
export function escopoCompleto(escopo: Escopo): boolean {
  if (escopo.papel === 'gerente_regional') return Boolean(escopo.regionalId);
  if (escopo.papel === 'gerente_loja' || escopo.papel === 'colaborador') {
    return Boolean(escopo.lojaId);
  }
  return true;
}

/** O escopo enxerga o CPF completo do convidado? Só o Admin (D6). */
export function veCpfCompleto(escopo: Escopo): boolean {
  return alcanceDe(escopo.papel, 'verCpfCompleto') === 'todos';
}
