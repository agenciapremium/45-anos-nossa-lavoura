import type { SerieDiariaDeConfirmacoes } from '@/lib/palestras/metricas';

/* =========================================================
   Gráfico de confirmações por dia (tarefa 4.4)

   SVG escrito à mão, em Server Component, sem biblioteca de gráfico (D5 do
   design): linha de 2px, área a 10%, grade de 1px em `--creme-700`. Uma
   série só, por isso sem legenda de cor: a cor de dado é o passo escuro da
   rampa lima (`--lima-700`), nunca uma cor de estado (selo e aviso são os
   únicos lugares onde sucesso/atenção/perigo aparecem). O rótulo direto
   fica na ponta: o último dia da série, que é o mais recente.
   ========================================================= */

const LARGURA = 700;
const ALTURA = 200;
const ALTURA_TOTAL = ALTURA + 22;
const MARGEM_ESQUERDA = 42;
const MARGEM_SUPERIOR = 18;
const MARGEM_INFERIOR = 26;
const ALTURA_UTIL = ALTURA - MARGEM_SUPERIOR - MARGEM_INFERIOR;
const LARGURA_UTIL = LARGURA - MARGEM_ESQUERDA;
const FRACOES_DA_GRADE = [0, 0.25, 0.5, 0.75, 1];

/** Próximo múltiplo "redondo" acima do maior valor, para o eixo Y não terminar exatamente no pico. */
function tetoDoEixo(maiorValor: number): number {
  if (maiorValor <= 0) return 4;
  const grandeza = 10 ** Math.floor(Math.log10(maiorValor));
  const passo = Math.max(1, grandeza / 2);
  return Math.ceil((maiorValor * 1.15) / passo) * passo;
}

export function GraficoDeConfirmacoesPorDia({
  serie,
}: {
  serie: SerieDiariaDeConfirmacoes;
}) {
  const { pontos } = serie;
  if (pontos.length === 0) return null;

  const maiorValor = Math.max(...pontos.map((p) => p.total));
  const menorValor = Math.min(...pontos.map((p) => p.total));
  const topo = tetoDoEixo(maiorValor);
  const passoX = pontos.length > 1 ? LARGURA_UTIL / (pontos.length - 1) : 0;
  const baseY = MARGEM_SUPERIOR + ALTURA_UTIL;

  const coordenadas = pontos.map((ponto, indice) => ({
    ...ponto,
    x: MARGEM_ESQUERDA + passoX * indice,
    y: MARGEM_SUPERIOR + ALTURA_UTIL * (1 - ponto.total / topo),
  }));

  const pontosDaLinha = coordenadas
    .map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`)
    .join(' ');
  const caminhoDaArea =
    `M${coordenadas[0]!.x.toFixed(1)},${baseY} ` +
    coordenadas.map((c) => `L${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ') +
    ` L${coordenadas[coordenadas.length - 1]!.x.toFixed(1)},${baseY} Z`;

  const ultimo = coordenadas[coordenadas.length - 1]!;
  const primeiro = coordenadas[0]!;

  const descricao =
    `Confirmações por dia, de ${primeiro.rotulo} a ${ultimo.rotulo}: ` +
    `de ${menorValor} a ${maiorValor} confirmações por dia, ${ultimo.total} no último dia, ` +
    `${serie.totalNoPeriodo} no período.`;

  return (
    <svg
      viewBox={`0 0 ${LARGURA} ${ALTURA_TOTAL}`}
      role="img"
      aria-label={descricao}
      className="block h-auto w-full"
    >
      <g className="stroke-creme-700" strokeWidth={1}>
        {FRACOES_DA_GRADE.map((fracao) => {
          const y = MARGEM_SUPERIOR + ALTURA_UTIL * fracao;
          return <line key={fracao} x1={MARGEM_ESQUERDA} y1={y} x2={LARGURA} y2={y} />;
        })}
      </g>

      <g className="font-corpo fill-texto-suave text-rotulo" textAnchor="end">
        {FRACOES_DA_GRADE.map((fracao) => (
          <text key={fracao} x={MARGEM_ESQUERDA - 8} y={MARGEM_SUPERIOR + ALTURA_UTIL * (1 - fracao) + 3}>
            {Math.round(topo * fracao)}
          </text>
        ))}
      </g>

      <path d={caminhoDaArea} className="fill-lima-700/10" />
      <polyline
        points={pontosDaLinha}
        fill="none"
        className="stroke-lima-700"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <circle cx={ultimo.x} cy={ultimo.y} r={4} className="fill-lima-700 stroke-cartao" strokeWidth={2} />
      <text
        x={ultimo.x}
        y={Math.max(MARGEM_SUPERIOR - 4, ultimo.y - 10)}
        textAnchor="end"
        className="font-corpo fill-texto-forte text-corpo-sm font-bold"
      >
        {ultimo.total}
      </text>

      <g className="font-corpo fill-texto-suave text-rotulo" textAnchor="middle">
        {coordenadas.map((c, indice) =>
          indice % 2 === 0 || indice === coordenadas.length - 1 ? (
            <text key={c.data} x={c.x} y={ALTURA + 14}>
              {c.rotulo}
            </text>
          ) : null,
        )}
      </g>
    </svg>
  );
}
