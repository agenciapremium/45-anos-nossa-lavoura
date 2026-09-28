/* =========================================================
   Máscaras de exibição

   O mascaramento de CPF já existe em `cpf.ts`, na forma que o restante do
   sistema usa. Aqui ficam as duas máscaras que `auth-e-papeis` acrescenta:
   a de e-mail, exibida na tela do código, e a de CPF no formato reduzido
   que o PRD especifica para a recepção.
   ========================================================= */

/**
 * `maria@gmail.com` → `m*****@gmail.com`.
 *
 * O número de asteriscos é **fixo**, e não proporcional ao endereço. É
 * deliberado: com asteriscos proporcionais, a tela informaria o
 * comprimento exato do endereço a quem só digitou um CPF.
 *
 * Esta é a única exceção à resposta neutra em todo o fluxo (D3 do design),
 * e ela só aparece depois de o CPF ser aceito.
 */
export function mascararEmail(email: string): string {
  const limpo = email.trim();
  const arroba = limpo.lastIndexOf('@');
  if (arroba <= 0) return '*****';

  const local = limpo.slice(0, arroba);
  const dominio = limpo.slice(arroba + 1);
  const inicial = local[0] ?? '';
  return `${inicial.toLowerCase()}*****@${dominio.toLowerCase()}`;
}

/**
 * `12345678909` → `***.456.789-**`.
 *
 * Formato exato do PRD para a recepção: esconde os três primeiros dígitos
 * e os dois verificadores. Serve para conferir um documento na porta do
 * evento sem que a lista impressa vire um cadastro de CPFs.
 *
 * Diferente de `mascararCpfParaExibicao` (`123.***.***-09`), que preserva
 * o começo e o fim para a pessoa reconhecer o **próprio** cadastro. Os dois
 * formatos coexistem porque respondem a perguntas diferentes.
 */
export function mascararCpfParaRecepcao(valor: string): string {
  const d = valor.replace(/\D/g, '');
  if (d.length !== 11) return '***.***.***-**';
  return `***.${d.slice(3, 6)}.${d.slice(6, 9)}-**`;
}
