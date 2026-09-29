'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * Um item do menu lateral, com o realce de "página atual".
 *
 * Client Component só por `usePathname()`: é o único jeito de saber qual
 * item está ativo sem o `layout.tsx` receber o caminho (o App Router só
 * entrega `searchParams` a `page.tsx`). O resto do menu ( `MenuLateral` )
 * continua sendo montado no servidor, a partir da matriz de papéis (D3).
 *
 * `exato`: "Início" aponta para a raiz da casca (`/palestras/admin` ou
 * `/palestras/painel`), que é prefixo de todo o resto do menu — por isso
 * ele só acende em correspondência exata, nunca por `startsWith`.
 */
export function ItemDoMenu({
  href,
  exato = false,
  icone,
  children,
}: {
  href: string;
  exato?: boolean;
  icone: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const ativo = exato ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      aria-current={ativo ? 'page' : undefined}
      className={cn(
        'relative flex min-h-11 items-center gap-2.5 rounded-controle px-3 font-corpo text-corpo-sm no-underline transition-colors',
        ativo
          ? 'bg-inverso font-bold text-texto-inverso'
          : 'text-texto-inverso-suave hover:bg-inverso hover:text-texto-inverso',
      )}
    >
      {ativo ? (
        <span
          aria-hidden="true"
          className="absolute inset-y-2 left-0 w-[3px] rounded-pilula bg-acento"
        />
      ) : null}
      {icone}
      <span className="min-w-0 flex-1 truncate">{children}</span>
    </Link>
  );
}
