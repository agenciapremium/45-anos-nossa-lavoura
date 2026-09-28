/**
 * CPF: validação por dígito verificador, normalização e exibição.
 *
 * O armazenamento é sempre só com dígitos (convenção do projeto, reforçada
 * por um CHECK no banco). A máscara é coisa de tela.
 */

/** Só os dígitos. `123.456.789-09` -> `12345678909`. */
export function somenteDigitos(valor: string): string {
  return valor.replace(/\D/g, '');
}

/**
 * Valida o CPF pelo dígito verificador.
 *
 * Rejeita também as onze repetições (`00000000000`, `11111111111`, …): elas
 * passam na conta do verificador, mas nenhuma é CPF de ninguém, e são
 * exatamente o que alguém digita para "preencher o campo".
 */
export function cpfValido(valor: string): boolean {
  const d = somenteDigitos(valor);
  if (d.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(d)) return false;

  for (const [ate, posicao] of [
    [9, 9],
    [10, 10],
  ] as const) {
    let soma = 0;
    for (let i = 0; i < ate; i++) {
      soma += Number(d[i]) * (ate + 1 - i);
    }
    const resto = (soma * 10) % 11;
    const digito = resto === 10 || resto === 11 ? 0 : resto;
    if (digito !== Number(d[posicao])) return false;
  }
  return true;
}

/** Normaliza para gravação. Lança quando o CPF é inválido. */
export function normalizarCpf(valor: string): string {
  const d = somenteDigitos(valor);
  if (!cpfValido(d)) {
    throw new Error('CPF inválido');
  }
  return d;
}

/** `12345678909` -> `123.456.789-09`. Só para o Admin. */
export function formatarCpf(valor: string): string {
  const d = somenteDigitos(valor);
  if (d.length !== 11) return valor;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

/**
 * `123.***.***-09` — o que aparece para quem não é Admin.
 *
 * Mantém os três primeiros e os dois últimos dígitos: o suficiente para a
 * pessoa reconhecer o próprio cadastro, insuficiente para identificar
 * alguém que ela não conheça.
 */
export function mascararCpfParaExibicao(valor: string): string {
  const d = somenteDigitos(valor);
  if (d.length !== 11) return '***';
  return `${d.slice(0, 3)}.***.***-${d.slice(9)}`;
}

/** Aplica a máscara enquanto a pessoa digita. */
export function mascaraProgressiva(valor: string): string {
  const d = somenteDigitos(valor).slice(0, 11);
  const p = [d.slice(0, 3), d.slice(3, 6), d.slice(6, 9)].filter(Boolean);
  let saida = p.join('.');
  if (d.length > 9) saida += `-${d.slice(9)}`;
  return saida;
}
