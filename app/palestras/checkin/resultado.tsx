'use client';

import type { ResultadoDoCheckin } from '@/lib/palestras/servicos/checkin';

/* =========================================================
   Três cores, uma decisão (D5 do design)

   O operador não lê parágrafo na porta: vê a cor, confere o nome, libera.
   Por isso o veredito (ENTROU / JÁ UTILIZADO / NÃO ENTRA) vem em corpo
   gigante, e todo detalhe — loja, colaborador, horário do primeiro
   check-in — fica abaixo da dobra, em corpo menor.

   A cor nunca é o único sinal: cada resultado também tem um símbolo e uma
   palavra (✓ / ! / ×), para continuar legível em daltonismo e sob luz
   ruim. O amarelo usa texto escuro (não creme) porque o `--status-warning`
   do design system é claro demais para texto claro em cima manter
   contraste a um braço de distância.
   ========================================================= */

const ESTILO: Record<
  ResultadoDoCheckin['cor'],
  { fundo: string; texto: string; rotulo: string; simbolo: string }
> = {
  verde: { fundo: 'bg-sucesso', texto: 'text-creme-500', rotulo: 'ENTROU', simbolo: '✓' },
  amarelo: {
    fundo: 'bg-atencao',
    texto: 'text-terra-900',
    rotulo: 'JÁ UTILIZADO',
    simbolo: '!',
  },
  vermelho: { fundo: 'bg-perigo', texto: 'text-creme-500', rotulo: 'NÃO ENTRA', simbolo: '×' },
};

export function ResultadoGrande({
  resultado,
  tempoMs,
  onContinuar,
}: {
  resultado: ResultadoDoCheckin;
  tempoMs: number | null;
  onContinuar: () => void;
}) {
  const estilo = ESTILO[resultado.cor];

  return (
    <button
      type="button"
      onClick={onContinuar}
      autoFocus
      className={`flex min-h-[70vh] w-full cursor-pointer flex-col rounded-cartao border-2 border-terra-700 p-6 text-left shadow-laje-sm ${estilo.fundo} ${estilo.texto}`}
    >
      <p
        role="status"
        aria-live="assertive"
        className="m-0 font-titulo text-destaque font-bold leading-justo tracking-destaque text-balance"
      >
        <span aria-hidden="true">{estilo.simbolo} </span>
        {estilo.rotulo}
      </p>

      {resultado.cor === 'verde' ? (
        <div className="mt-6 flex flex-col gap-3">
          <p className="m-0 font-titulo text-t2 font-bold leading-justo">{resultado.titular}</p>
          <p className="m-0 font-corpo text-corpo-lg font-bold">
            {resultado.acompanhante
              ? `+ acompanhante: ${resultado.acompanhante}`
              : 'Sem acompanhante — entrada só do titular.'}
          </p>
          <p className="m-0 font-corpo text-corpo-lg">
            Este convite vale para {resultado.acompanhante ? 'duas pessoas' : 'uma pessoa'}: o
            titular{resultado.acompanhante ? ' e o acompanhante' : ''}.
          </p>
          <p className="m-0 mt-2 font-corpo text-corpo-sm opacity-80">
            Loja: {resultado.lojaNome ?? '—'} · Colaborador de origem: {resultado.colaboradorNome}
          </p>
        </div>
      ) : (
        <p className="mt-6 font-corpo text-corpo-lg font-bold text-balance">{resultado.mensagem}</p>
      )}

      <p className="m-0 mt-auto pt-8 font-corpo text-corpo-sm opacity-80">
        {tempoMs !== null ? `Resultado em ${tempoMs} ms · ` : ''}
        Toque em qualquer lugar para ler o próximo.
      </p>
    </button>
  );
}
