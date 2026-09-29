import type { Funil } from '@/lib/palestras/metricas';
import { formatarTaxa } from '@/lib/palestras/taxas';

/* =========================================================
   Gráfico do funil do convite (tarefa 4.4)

   SVG escrito à mão, em Server Component: uma barra por etapa, série
   única (sem legenda de cor), ponta arredondada de 4px no lado que aponta
   para o valor. O lado do rótulo fica quadrado, encostado no eixo, no
   mesmo desenho que o mockup aprovado usa para as barras horizontais.

   A LARGURA de cada barra é a fração sobre `gerados` (é o que faz o funil
   parecer um funil: cada etapa cabe dentro da anterior). O PERCENTUAL
   escrito sob a barra é o que a spec exige: sobre a etapa anterior, não
   sobre gerados (requisito 3 de `metricas-do-circuito`). As duas contas
   respondem perguntas diferentes e por isso não podem ser confundidas.
   ========================================================= */

const LARGURA = 640;
const ALTURA_DA_BARRA = 26;
const ESPACO_ENTRE_BARRAS = 22;
const RAIO = 4;

type EtapaVisivel = {
  rotulo: string;
  valor: number;
  taxaSobreAnterior: number | null;
  denominadorEmPalavras: string;
};

/** Caminho de um retângulo com o lado direito arredondado e o esquerdo quadrado. */
function caminhoDaBarra(largura: number, altura: number, raioPedido: number): string {
  if (largura <= 0) return `M0,0 L0,${altura} L0,0 Z`;
  const raio = Math.min(raioPedido, largura, altura / 2);
  return [
    `M0,0`,
    `L${(largura - raio).toFixed(1)},0`,
    `Q${largura.toFixed(1)},0 ${largura.toFixed(1)},${raio.toFixed(1)}`,
    `L${largura.toFixed(1)},${(altura - raio).toFixed(1)}`,
    `Q${largura.toFixed(1)},${altura} ${(largura - raio).toFixed(1)},${altura}`,
    `L0,${altura}`,
    'Z',
  ].join(' ');
}

export function GraficoDoFunil({ funil }: { funil: Funil }) {
  const etapas: EtapaVisivel[] = [
    {
      rotulo: 'Gerados',
      valor: funil.gerados,
      taxaSobreAnterior: null,
      denominadorEmPalavras: 'etapa inicial do funil',
    },
    {
      rotulo: 'Com anotação de envio',
      valor: funil.enviados,
      taxaSobreAnterior: funil.taxaEnviadosSobreGerados,
      denominadorEmPalavras: 'dos gerados',
    },
    {
      rotulo: 'Confirmados',
      valor: funil.confirmados,
      taxaSobreAnterior: funil.taxaConfirmadosSobreEnviados,
      denominadorEmPalavras: 'dos anotados como enviados',
    },
    {
      rotulo: 'Presentes',
      valor: funil.presentes,
      taxaSobreAnterior: funil.taxaPresentesSobreConfirmados,
      denominadorEmPalavras: 'dos confirmados',
    },
  ];

  const maior = Math.max(funil.gerados, 1);
  const alturaTotal = etapas.length * (ALTURA_DA_BARRA + ESPACO_ENTRE_BARRAS);

  const descricao = `Funil do convite: ${etapas
    .map((e) => `${e.rotulo} ${e.valor.toLocaleString('pt-BR')}`)
    .join(', ')}.`;

  return (
    <svg
      viewBox={`0 0 ${LARGURA} ${alturaTotal}`}
      role="img"
      aria-label={descricao}
      className="block h-auto w-full"
    >
      {etapas.map((etapa, indice) => {
        const y = indice * (ALTURA_DA_BARRA + ESPACO_ENTRE_BARRAS);
        const largura = Math.max(0, (etapa.valor / maior) * LARGURA);
        return (
          <g key={etapa.rotulo} transform={`translate(0, ${y})`}>
            <rect width={LARGURA} height={ALTURA_DA_BARRA} rx={RAIO} className="fill-lima-100" />
            <path d={caminhoDaBarra(largura, ALTURA_DA_BARRA, RAIO)} className="fill-lima-700" />
            <text
              x={10}
              y={ALTURA_DA_BARRA / 2}
              dominantBaseline="middle"
              className="font-corpo text-corpo-sm font-bold fill-texto-forte"
            >
              {etapa.rotulo}
            </text>
            <text
              x={LARGURA - 10}
              y={ALTURA_DA_BARRA / 2}
              dominantBaseline="middle"
              textAnchor="end"
              className="font-corpo text-corpo-sm font-bold fill-texto-forte"
            >
              {etapa.valor.toLocaleString('pt-BR')}
            </text>
            <text
              x={10}
              y={ALTURA_DA_BARRA + 15}
              className="font-corpo fill-texto-suave text-rotulo"
            >
              {etapa.taxaSobreAnterior === null
                ? etapa.denominadorEmPalavras
                : `${formatarTaxa(etapa.taxaSobreAnterior)} ${etapa.denominadorEmPalavras}`}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
