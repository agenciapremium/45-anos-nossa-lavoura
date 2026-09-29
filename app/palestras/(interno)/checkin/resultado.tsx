'use client';

import type { ResultadoDoCheckin } from '@/lib/palestras/servicos/checkin';

/* =========================================================
   Três cores, uma decisão (D5 do design, tarefa 6.3)

   O operador não lê parágrafo na porta: vê a cor, confere o nome, libera.
   Por isso o veredito (ENTROU / JÁ UTILIZADO / NÃO ENTRA) vem em corpo
   gigante, e todo detalhe (loja, colaborador, horário do primeiro
   check-in) fica abaixo da dobra, em corpo menor.

   "Tela cheia" é literal: o resultado cobre a viewport inteira, por cima
   do menu e da barra de topo (`fixed inset-0`), porque é o que se lê de
   relance, a um braço de distância, na fila da porta.

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
      className={`fixed inset-0 z-50 flex w-full cursor-pointer flex-col overflow-y-auto p-6 text-left sm:p-10 ${estilo.fundo} ${estilo.texto}`}
    >
      <p
        role="status"
        aria-live="assertive"
        className="m-0 flex items-center gap-4 font-titulo text-destaque font-bold leading-justo tracking-destaque text-balance"
      >
        <span
          aria-hidden="true"
          className="flex size-14 flex-none items-center justify-center rounded-pilula bg-cartao text-t2 leading-none text-texto-forte"
        >
          {estilo.simbolo}
        </span>
        {estilo.rotulo}
      </p>

      {resultado.cor === 'verde' ? (
        <div className="mt-8 flex flex-col gap-3">
          <p className="m-0 font-titulo text-t2 font-bold leading-justo">{resultado.titular}</p>
          <p className="m-0 font-corpo text-corpo-lg font-bold">
            {resultado.acompanhante
              ? `+ acompanhante: ${resultado.acompanhante}`
              : 'Sem acompanhante: entrada só do titular.'}
          </p>
          <p className="m-0 rounded-cartao bg-cartao/20 p-4 font-corpo text-corpo-lg font-bold">
            Pode entrar {resultado.acompanhante ? '2 pessoas' : '1 pessoa'}: o titular
            {resultado.acompanhante ? ' e o acompanhante' : ''}.
          </p>
          {/*
            Origem do convite. No convite avulso não há colaborador nem
            loja: as duas dizem "Administração", e o rótulo do lote entra
            como detalhe (D7 de `convites-avulsos`). A frase muda junto,
            porque "loja Administração, colaborador de origem Administração"
            seria verdade e ainda assim leitura ruim na porta.
          */}
          <p className="m-0 mt-2 font-corpo text-corpo-sm opacity-80">
            {resultado.rotuloDoLote !== null
              ? `Convite da ${resultado.colaboradorNome} · ${resultado.rotuloDoLote}`
              : `Loja ${resultado.lojaNome ?? 'não informada'}, colaborador de origem ${resultado.colaboradorNome}`}
          </p>
        </div>
      ) : (
        <p className="mt-8 font-corpo text-corpo-lg font-bold text-balance">
          {resultado.mensagem}
        </p>
      )}

      <p className="m-0 mt-auto pt-8 font-corpo text-corpo-sm opacity-80">
        {tempoMs !== null ? `Resultado em ${tempoMs} ms. ` : ''}
        Toque em qualquer lugar da tela para ler o próximo.
      </p>
    </button>
  );
}
