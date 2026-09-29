import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/*
 * O `tailwind-merge` precisa conhecer a escala tipográfica do design
 * system.
 *
 * Ele resolve conflito por grupo de classe, e decide o grupo pelo formato
 * do valor: `text-sm` é tamanho, `text-red-500` é cor. Nossa escala não
 * tem esse formato (`text-corpo-sm`, `text-t2`, `text-rotulo`), então ele
 * chutava "cor" para todas e concluía que `text-corpo-sm` e
 * `text-texto-inverso` brigavam pela mesma propriedade. Resultado: em todo
 * `cn('… text-corpo-sm', 'text-texto-inverso')` o tamanho era descartado
 * em silêncio, e o componente renderizava com o tamanho herdado.
 *
 * Declarando a escala aqui, tamanho e cor voltam a ser grupos distintos e
 * os dois sobrevivem.
 */
const ESCALA_DE_TEXTO = [
  'heroi',
  'destaque',
  't1',
  't2',
  't3',
  'chamada',
  'corpo-lg',
  'corpo',
  'corpo-sm',
  'rotulo',
] as const;

const juntar = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [{ text: [...ESCALA_DE_TEXTO] }],
    },
  },
});

/** Junta classes resolvendo conflitos do Tailwind. Convenção do shadcn/ui. */
export function cn(...entradas: ClassValue[]) {
  return juntar(clsx(entradas));
}

/** `1 convite` / `12 convites` — sem o "(s)". */
export function plural(n: number, singular: string, plural_: string): string {
  return `${n} ${n === 1 ? singular : plural_}`;
}
