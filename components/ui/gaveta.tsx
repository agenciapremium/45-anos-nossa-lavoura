'use client';

import * as React from 'react';

import { cn } from '@/lib/utils';

import { IconeFechar } from './icones';
import { TituloDoCartao } from './index';

/* =========================================================
   Gaveta — painel que desliza sobre o conteúdo, com véu

   Primitiva de overlay compartilhada por duas telas do mockup: a
   navegação no celular (2.7, `aside` escuro à esquerda) e o painel
   lateral de cadastro (5.3, cartão claro à direita). O comportamento é o
   mesmo nos dois casos — véu que fecha ao toque, Esc fecha, alvo de
   44px — só a superfície muda, e isso fica a cargo de quem chama.

   Client Component porque exige estado (aberto/fechado) e tecla de
   atalho. É o único lugar do módulo em que isso é necessário: abas,
   filtros e o resto continuam vivendo na URL (D7).
   ========================================================= */
export function Gaveta({
  aberto,
  aoFechar,
  lado = 'esquerda',
  rotulo,
  className,
  children,
  ...props
}: {
  aberto: boolean;
  aoFechar: () => void;
  lado?: 'esquerda' | 'direita';
  rotulo: string;
  className?: string;
  children: React.ReactNode;
} & Omit<React.ComponentProps<'div'>, 'children' | 'className'>) {
  React.useEffect(() => {
    if (!aberto) return;
    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') aoFechar();
    };
    document.addEventListener('keydown', aoTeclar);
    return () => document.removeEventListener('keydown', aoTeclar);
  }, [aberto, aoFechar]);

  if (!aberto) return null;

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Fechar"
        onClick={aoFechar}
        className="absolute inset-0 h-full w-full cursor-default border-none bg-veu p-0"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={rotulo}
        className={cn(
          'absolute inset-y-0 flex w-full max-w-[320px] flex-col shadow-elevado',
          lado === 'esquerda' ? 'left-0' : 'right-0',
          className,
        )}
        {...props}
      >
        {children}
      </div>
    </div>
  );
}

/**
 * Painel lateral de cadastro (5.3): a mesma gaveta, do lado direito,
 * sobre a superfície interna. Fecha pelo X, pelo véu ou por Esc.
 */
export function PainelLateral({
  titulo,
  aberto,
  aoFechar,
  children,
  className,
}: {
  titulo: string;
  aberto: boolean;
  aoFechar: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Gaveta
      aberto={aberto}
      aoFechar={aoFechar}
      lado="direita"
      rotulo={titulo}
      className={cn('max-w-[420px] bg-cartao text-texto', className)}
    >
      <div className="flex flex-none items-center justify-between gap-3 border-b border-linha px-6 py-4">
        <TituloDoCartao>{titulo}</TituloDoCartao>
        <button
          type="button"
          aria-label="Fechar"
          onClick={aoFechar}
          className="inline-flex size-11 flex-none items-center justify-center rounded-controle text-texto-suave hover:bg-superficie-alt hover:text-texto-forte"
        >
          <IconeFechar className="size-5" />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>
    </Gaveta>
  );
}
