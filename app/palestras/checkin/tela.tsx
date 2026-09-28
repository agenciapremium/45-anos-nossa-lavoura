'use client';

import { useCallback, useState } from 'react';

import { Botao, Selecao } from '@/components/ui';
import type { ResultadoDoCheckin } from '@/lib/palestras/servicos/checkin';

import { confirmarCheckinManual, verificarQr } from './acoes';
import { BuscaManual } from './busca';
import { Leitor } from './leitor';
import { ResultadoGrande } from './resultado';

/* =========================================================
   Tela de check-in (`/palestras/checkin`)

   Orquestra o leitor de QR e a busca manual, alternando entre os dois sem
   sair da tela (task 2.3, D1). O tempo entre a leitura/confirmação e o
   resultado é medido no cliente, com `performance.now()`, e mostrado junto
   do resultado — é a meta de até 2 segundos (task 3.5) e a base da
   simulação de fila (task 11.4).
   ========================================================= */

type Opcao = { id: string; rotulo: string };
type Modo = 'leitor' | 'busca';

export function TelaDeCheckin({
  opcoes,
  eventoPadrao,
}: {
  opcoes: Opcao[];
  eventoPadrao: string;
}) {
  const [eventoId, setEventoId] = useState(eventoPadrao);
  const [modo, setModo] = useState<Modo>('leitor');
  const [resultado, setResultado] = useState<ResultadoDoCheckin | null>(null);
  const [tempoMs, setTempoMs] = useState<number | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const aoLerQr = useCallback(
    (token: string) => {
      setOcupado(true);
      const inicio = performance.now();
      void verificarQr(eventoId, token).then((r) => {
        setTempoMs(Math.round(performance.now() - inicio));
        setResultado(r);
        setOcupado(false);
      });
    },
    [eventoId],
  );

  const aoConfirmarManual = useCallback(
    (conviteId: string) => {
      setOcupado(true);
      const inicio = performance.now();
      void confirmarCheckinManual(eventoId, conviteId).then((r) => {
        setTempoMs(Math.round(performance.now() - inicio));
        setResultado(r);
        setOcupado(false);
      });
    },
    [eventoId],
  );

  function continuar() {
    setResultado(null);
    setTempoMs(null);
  }

  function trocarPalestra(novoEventoId: string) {
    setEventoId(novoEventoId);
    setResultado(null);
    setTempoMs(null);
  }

  return (
    <div className="flex flex-col gap-5">
      <label className="block">
        <span className="mb-1 block font-corpo text-corpo-sm font-bold text-texto-forte">
          Palestra
        </span>
        <Selecao value={eventoId} onChange={(e) => trocarPalestra(e.target.value)}>
          {opcoes.map((o) => (
            <option key={o.id} value={o.id}>
              {o.rotulo}
            </option>
          ))}
        </Selecao>
      </label>

      {resultado ? (
        <ResultadoGrande resultado={resultado} tempoMs={tempoMs} onContinuar={continuar} />
      ) : (
        <>
          {/* D1: leitor e busca manual na MESMA tela, a um toque — nunca uma
              rota separada nem um passo a mais, porque câmera falha,
              permissão é negada, a tela do convidado está escura e o QR
              impresso amassa. */}
          <div className="flex gap-2" role="tablist" aria-label="Como localizar o convite">
            <Botao
              type="button"
              variante={modo === 'leitor' ? 'primario' : 'contorno'}
              onClick={() => setModo('leitor')}
              aria-pressed={modo === 'leitor'}
              className="flex-1"
            >
              Leitor de QR
            </Botao>
            <Botao
              type="button"
              variante={modo === 'busca' ? 'primario' : 'contorno'}
              onClick={() => setModo('busca')}
              aria-pressed={modo === 'busca'}
              className="flex-1"
            >
              Busca manual
            </Botao>
          </div>

          {modo === 'leitor' ? (
            <Leitor key={eventoId} onLido={aoLerQr} ocupado={ocupado} />
          ) : (
            <BuscaManual eventoId={eventoId} ocupado={ocupado} onConfirmar={aoConfirmarManual} />
          )}

          {ocupado ? (
            <p className="m-0 font-corpo text-corpo-sm text-texto-suave" role="status">
              Confirmando…
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}
