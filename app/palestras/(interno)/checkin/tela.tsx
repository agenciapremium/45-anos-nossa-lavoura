'use client';

import { useCallback, useState } from 'react';

import { AbasSegmentadas, Cartao, Selecao } from '@/components/ui';
import type { ResultadoDoCheckin } from '@/lib/palestras/servicos/checkin';

import { confirmarCheckinManual, verificarQr } from './acoes';
import { BuscaManual } from './busca';
import { Leitor } from './leitor';
import { ResultadoGrande } from './resultado';

/* =========================================================
   Tela de check-in (`/palestras/checkin`, tarefa 6.3)

   Orquestra o leitor de QR e a busca manual, alternando entre os dois sem
   sair da tela (D1 do design). O tempo entre a leitura/confirmação e o
   resultado é medido no cliente, com `performance.now()`, e mostrado junto
   do resultado.

   Alvo de 48 px em todo controle desta tela (select de palestra, abas,
   campo e botões da busca): é a porta do evento, usada em pé, com o
   celular na mão e pressa na fila.
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
        <Selecao
          value={eventoId}
          onChange={(e) => trocarPalestra(e.target.value)}
          className="min-h-12 border-2 border-terra-700 font-bold"
        >
          {opcoes.map((o) => (
            <option key={o.id} value={o.id}>
              {o.rotulo}
            </option>
          ))}
        </Selecao>
      </label>

      {/* D1: leitor e busca manual na MESMA tela, a um toque, nunca uma rota
          separada nem um passo a mais, porque câmera falha, permissão é
          negada, a tela do convidado está escura e o QR impresso amassa. */}
      <AbasSegmentadas aria-label="Como localizar o convite" className="w-full">
        <button
          type="button"
          role="tab"
          aria-selected={modo === 'leitor'}
          onClick={() => setModo('leitor')}
          className="min-h-12 flex-1 cursor-pointer rounded-controle border-0 bg-transparent font-corpo text-corpo-sm font-bold uppercase tracking-[0.04em] text-texto-suave aria-selected:bg-cartao aria-selected:text-texto-forte aria-selected:shadow-suave"
        >
          Leitor de QR
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={modo === 'busca'}
          onClick={() => setModo('busca')}
          className="min-h-12 flex-1 cursor-pointer rounded-controle border-0 bg-transparent font-corpo text-corpo-sm font-bold uppercase tracking-[0.04em] text-texto-suave aria-selected:bg-cartao aria-selected:text-texto-forte aria-selected:shadow-suave"
        >
          Busca manual
        </button>
      </AbasSegmentadas>

      {modo === 'leitor' ? (
        <Leitor key={eventoId} onLido={aoLerQr} ocupado={ocupado} />
      ) : (
        <BuscaManual eventoId={eventoId} ocupado={ocupado} onConfirmar={aoConfirmarManual} />
      )}

      {/* D1: a busca manual não é plano B escondido, fica a um toque das
          abas acima. Este aviso só faz sentido no modo leitor, porque no
          modo busca a própria tela já é o caminho alternativo. */}
      {modo === 'leitor' ? (
        <Cartao superficie="interna" className="bg-superficie-alt">
          <p className="m-0 font-corpo text-corpo text-texto-suave">
            Câmera não abriu, tela apagada ou QR amassado? A{' '}
            <strong className="text-texto-forte">busca manual</strong> está a um toque,
            ali em cima. Não é plano B escondido.
          </p>
        </Cartao>
      ) : null}

      {ocupado ? (
        <p className="m-0 font-corpo text-corpo-sm text-texto-suave" role="status">
          Confirmando…
        </p>
      ) : null}

      {resultado ? (
        <ResultadoGrande resultado={resultado} tempoMs={tempoMs} onContinuar={continuar} />
      ) : null}
    </div>
  );
}
