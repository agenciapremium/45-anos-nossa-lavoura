'use client';

import { useState } from 'react';

import { Botao, Cartao, TituloDoCartao } from '@/components/ui';
import type { EstadoDeConvite } from '@/lib/db/schema';
import { PainelDeCancelamento } from '../linha';

/**
 * Cancelamento em duas etapas no detalhe do convite (tarefa 3.4/3.3).
 *
 * Client Component só por causa do estado de aberto/fechado do painel de
 * confirmação; a decisão de MOSTRAR este bloco (alcance de `cancelarConvite`
 * e estado do convite) continua no servidor, em `page.tsx`.
 */
export function CancelamentoDoDetalhe({
  codigo,
  estado,
  titular,
}: {
  codigo: string;
  estado: EstadoDeConvite;
  titular: string | null;
}) {
  const [aberto, setAberto] = useState(false);

  if (aberto) {
    return <PainelDeCancelamento codigo={codigo} estado={estado} titular={titular} onFechar={() => setAberto(false)} />;
  }

  return (
    <Cartao superficie="interna">
      <TituloDoCartao>Cancelar convite</TituloDoCartao>
      <p className="m-0 mt-2 font-corpo text-corpo-sm text-texto-suave">
        Ação definitiva: o convite não volta a ficar disponível.
      </p>
      <div className="mt-3">
        <Botao variante="contorno" tamanho="sm" onClick={() => setAberto(true)}>
          Cancelar este convite
        </Botao>
      </div>
    </Cartao>
  );
}
