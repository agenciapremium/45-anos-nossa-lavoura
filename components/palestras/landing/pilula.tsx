import Link from 'next/link';

import { cn } from '@/lib/utils';

import estilo from './landing.module.css';

/**
 * A pílula "Arraste para o lado" do carrossel, virada em chamada de ação:
 * texto light e um círculo terra com a seta em lima. 56 px de altura,
 * acima dos 48 px que a spec `sistema-visual` pede nas telas do convidado.
 */
export function Pilula({
  href,
  children,
  paraBaixo = false,
}: {
  href: string;
  children: React.ReactNode;
  /** Seta apontando para baixo, para âncoras dentro da própria página. */
  paraBaixo?: boolean;
}) {
  return (
    <Link href={href} className={cn(estilo.pilula, paraBaixo && estilo.paraBaixo)}>
      {children}
      <span className={estilo.seta} aria-hidden="true">
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m9 5 7 7-7 7" />
        </svg>
      </span>
    </Link>
  );
}
