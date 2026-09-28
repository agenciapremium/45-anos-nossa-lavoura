'use client';

import { Botao } from '@/components/ui';

/** Único motivo de existir: `window.print()` não roda num Server Component. */
export function BotaoImprimir() {
  return (
    <Botao type="button" onClick={() => window.print()}>
      Imprimir
    </Botao>
  );
}
