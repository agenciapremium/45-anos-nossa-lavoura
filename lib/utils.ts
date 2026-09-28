import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Junta classes resolvendo conflitos do Tailwind. Convenção do shadcn/ui. */
export function cn(...entradas: ClassValue[]) {
  return twMerge(clsx(entradas));
}

/** `1 convite` / `12 convites` — sem o "(s)". */
export function plural(n: number, singular: string, plural_: string): string {
  return `${n} ${n === 1 ? singular : plural_}`;
}
