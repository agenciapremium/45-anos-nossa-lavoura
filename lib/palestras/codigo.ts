import { randomInt } from 'node:crypto';

/**
 * Código curto do convite (D5 do design).
 *
 * Alfabeto de 31 símbolos, sem `0`, `O`, `1`, `I` e `L` — os pares que as
 * pessoas confundem ao ler em voz alta ou digitar de um papel. Seis
 * caracteres dão ~887 milhões de combinações para um universo esperado na
 * casa dos milhares: a densidade é baixíssima, e a defesa contra varredura é
 * complementada pelo bloqueio por IP que entra em `auth-e-papeis`.
 */
export const ALFABETO_DO_CODIGO = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
export const TAMANHO_DO_CODIGO = 6;

/** Quantas vezes o gerador re-sorteia antes de desistir numa colisão. */
export const MAX_TENTATIVAS_DE_CODIGO = 12;

/**
 * Sorteia um código com gerador criptográfico.
 *
 * `randomInt` é usado em vez de `random() * n` porque ele rejeita e
 * re-sorteia os valores que cairiam na faixa enviesada — com 31 símbolos,
 * um módulo simples tornaria alguns caracteres mais prováveis que outros, e
 * um código previsível é um código adivinhável.
 */
export function gerarCodigo(tamanho: number = TAMANHO_DO_CODIGO): string {
  let saida = '';
  for (let i = 0; i < tamanho; i++) {
    saida += ALFABETO_DO_CODIGO[randomInt(ALFABETO_DO_CODIGO.length)];
  }
  return saida;
}

/** Gera `quantidade` códigos distintos entre si. */
export function gerarCodigosDistintos(quantidade: number): string[] {
  const vistos = new Set<string>();
  let tentativas = 0;
  const limite = quantidade * MAX_TENTATIVAS_DE_CODIGO + 100;
  while (vistos.size < quantidade) {
    vistos.add(gerarCodigo());
    if (++tentativas > limite) {
      throw new Error(
        `não foi possível gerar ${quantidade} códigos distintos em ${tentativas} tentativas`,
      );
    }
  }
  return [...vistos];
}

/** O texto tem a forma de um código válido? */
export function pareceCodigo(valor: string): boolean {
  if (valor.length !== TAMANHO_DO_CODIGO) return false;
  for (const c of valor) if (!ALFABETO_DO_CODIGO.includes(c)) return false;
  return true;
}

/**
 * Normaliza o que a pessoa digitou: maiúsculas, sem espaço nem hífen.
 *
 * Não corrige `O` para `0` nem coisa parecida — o alfabeto já não tem os
 * ambíguos, então `O` digitado é `O` mesmo, e não existe código com `O`.
 */
export function normalizarCodigo(valor: string): string {
  return valor.trim().toUpperCase().replace(/[\s-]/g, '');
}
