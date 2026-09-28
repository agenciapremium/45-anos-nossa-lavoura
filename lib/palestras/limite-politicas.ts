/* =========================================================
   Políticas de limite · valores puros

   Separado de `limite.ts` porque números de política merecem teste sem
   banco: o limiar por IP **precisa** ser maior que o por CPF, e isso é uma
   afirmação verificável (ver Risks do design e `tests/limite.test.ts`).
   ========================================================= */

export type Politica = {
  /** Quantas tentativas cabem na janela antes do bloqueio. */
  maximo: number;
  /** Tamanho da janela, em segundos. É também a duração do bloqueio. */
  janelaSegundos: number;
};

export const QUINZE_MINUTOS = 15 * 60;

/**
 * Tentativas de login erradas para o **mesmo CPF**.
 *
 * PRD: "bloqueio de 15 minutos após 5 tentativas erradas por CPF ou por IP".
 */
export const LOGIN_POR_CPF: Politica = {
  maximo: 5,
  janelaSegundos: QUINZE_MINUTOS,
};

/**
 * Tentativas de login erradas a partir do **mesmo IP**.
 *
 * O limiar é maior que o do CPF de propósito, e isso não é folga: uma loja
 * inteira sai pelo mesmo IP (ver Risks do design). Com o mesmo teto de 5,
 * três colegas errando a senha uma vez cada bloqueariam a loja toda. Vinte
 * tentativas continuam sendo um número que ninguém alcança digitando de
 * boa-fé, e ainda contém varredura: quem tenta CPFs diferentes esgota o
 * limite do IP antes de encostar no segundo CPF.
 */
export const LOGIN_POR_IP: Politica = {
  maximo: 20,
  janelaSegundos: QUINZE_MINUTOS,
};

/**
 * Envio de link mágico, código por CPF e redefinição de senha, por
 * identificador. Três em dez minutos: o suficiente para quem não recebeu o
 * primeiro e-mail, pouco para quem quer usar o sistema como disparador.
 */
export const ENVIO_POR_IDENTIFICADOR: Politica = {
  maximo: 3,
  janelaSegundos: 10 * 60,
};

/** Envio a partir do mesmo IP. Mesma lógica de limiar mais alto do login. */
export const ENVIO_POR_IP: Politica = {
  maximo: 10,
  janelaSegundos: 10 * 60,
};

/**
 * Intervalo mínimo entre dois envios para o mesmo identificador.
 *
 * Existe além do limite por janela porque resolve outro problema: o clique
 * duplo no botão "reenviar", que invalidaria o código recém-enviado.
 */
export const INTERVALO_MINIMO_DE_ENVIO_SEGUNDOS = 60;

/** Varredura de códigos de convite inexistentes, por IP (spec de abuso). */
export const CODIGOS_INEXISTENTES_POR_IP: Politica = {
  maximo: 10,
  janelaSegundos: QUINZE_MINUTOS,
};

/** Validade do código de 6 dígitos enviado por e-mail. PRD: 10 minutos. */
export const VALIDADE_DO_CODIGO_SEGUNDOS = 10 * 60;

/** Tentativas de digitar o mesmo código antes de ele ser invalidado. */
export const TENTATIVAS_POR_CODIGO = 5;

/** Validade do link mágico. PRD: 15 minutos, uso único. */
export const VALIDADE_DO_LINK_MAGICO_SEGUNDOS = 15 * 60;

/** Validade do link de definição/redefinição de senha. */
export const VALIDADE_DO_LINK_DE_SENHA_SEGUNDOS = 60 * 60;

/**
 * Quanto tempo falta, em minutos arredondados para cima, até a liberação.
 *
 * Arredondar para cima evita a mensagem "espere 0 minutos", que é pior que
 * inútil: manda a pessoa tentar de novo e falhar.
 */
export function minutosAte(liberadoEm: Date | null, agora: Date): number {
  if (!liberadoEm) return 0;
  const faltam = liberadoEm.getTime() - agora.getTime();
  if (faltam <= 0) return 0;
  return Math.max(1, Math.ceil(faltam / 60_000));
}

/**
 * Avaliação da janela, em forma pura.
 *
 * É a mesma conta que o SQL de `verificarLimite` faz; existir aqui em
 * TypeScript permite testá-la sem banco e serve de especificação executável
 * do que o SQL deve produzir.
 *
 * A âncora do bloqueio é a **última** tentativa, não a primeira. Com a
 * primeira como âncora, quem errasse uma vez no minuto 0 e mais quatro no
 * minuto 14 sairia do bloqueio 60 segundos depois — 15 minutos contados de
 * um erro que já não interessa a ninguém.
 */
export function avaliar(
  estado: { tentativas: number; ultimaTentativaEm: Date | null },
  politica: Politica,
  agora: Date,
): { permitido: boolean; tentativasRestantes: number; liberadoEm: Date | null } {
  const { maximo, janelaSegundos } = politica;
  const expiraEm = estado.ultimaTentativaEm
    ? new Date(estado.ultimaTentativaEm.getTime() + janelaSegundos * 1000)
    : null;

  // Janela vencida: a contagem não vale mais nada.
  if (!expiraEm || expiraEm.getTime() <= agora.getTime()) {
    return { permitido: true, tentativasRestantes: maximo, liberadoEm: null };
  }

  if (estado.tentativas >= maximo) {
    return { permitido: false, tentativasRestantes: 0, liberadoEm: expiraEm };
  }

  return {
    permitido: true,
    tentativasRestantes: Math.max(0, maximo - estado.tentativas),
    liberadoEm: null,
  };
}
