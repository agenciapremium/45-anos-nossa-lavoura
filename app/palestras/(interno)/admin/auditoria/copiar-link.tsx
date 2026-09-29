'use client';

import { useState } from 'react';

import { Botao } from '@/components/ui';

/**
 * Copia a URL atual (com os filtros aplicados) para a área de transferência,
 * para o link poder ser compartilhado exatamente como está na tela.
 *
 * Único motivo de ser um Client Component: `navigator.clipboard` e
 * `window.location` não existem no servidor.
 */
export function BotaoCopiarLink() {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Navegador sem permissão de área de transferência: o endereço
      // continua visível na barra do navegador para copiar à mão.
      setCopiado(false);
    }
  }

  return (
    <Botao
      type="button"
      variante="contorno"
      tamanho="sm"
      onClick={copiar}
      aria-live="polite"
    >
      {copiado ? 'Link copiado' : 'Copiar link do filtro'}
    </Botao>
  );
}
