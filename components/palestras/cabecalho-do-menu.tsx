import type * as React from 'react';

import { SeloDoCircuito } from '@/components/palestras/selo';

/** Selo + nome do circuito, no topo do menu (fixo e gaveta). */
export function CabecalhoDoMenu({
  acaoFechar,
}: {
  acaoFechar?: React.ReactNode;
}) {
  return (
    <div className="flex flex-none items-center gap-3 border-b border-linha-inversa p-4">
      <SeloDoCircuito tamanho={40} className="flex-none" />
      <span className="min-w-0 flex-1">
        <span className="block font-titulo text-corpo-sm font-bold leading-tight text-texto-inverso">
          Acelera no Campo
        </span>
        <span className="mt-0.5 block font-corpo text-[10px] font-bold uppercase tracking-sobrancelha text-lima-600">
          3.0 · 2026
        </span>
      </span>
      {acaoFechar}
    </div>
  );
}
