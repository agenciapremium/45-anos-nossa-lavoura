/**
 * Slug de palestra: `vilhena-13-10-2026`.
 *
 * Sai da cidade mais a data, porque é assim que a operação chama cada
 * palestra ("a de Vilhena", "a de 15"). Quando duas palestras caem na mesma
 * cidade e no mesmo dia, um sufixo numérico desempata.
 */
export function slugificar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // tira acentos
    .replace(/['’]/g, '') // d'Oeste -> dOeste, não d-Oeste
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** `vilhena-13-10-2026` a partir da cidade e da data local `DD/MM/AAAA`. */
export function slugDePalestra(cidade: string, dataLocalBr: string): string {
  return `${slugificar(cidade)}-${slugificar(dataLocalBr)}`;
}

/** Acrescenta `-2`, `-3`… até não colidir com os já usados. */
export function slugDisponivel(base: string, usados: Iterable<string>): string {
  const ocupados = new Set(usados);
  if (!ocupados.has(base)) return base;
  let n = 2;
  while (ocupados.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}
