import 'server-only';

import { and, count, eq, sql, type SQL } from 'drizzle-orm';

import { db } from '@/lib/db';
import { convite, loja, user } from '@/lib/db/schema';
import {
  confirmacoesNoEscopo,
  convitesNoEscopo,
  resumoNoEscopo,
  resumoPorLoja,
  restricao,
  type ResumoDeLoja,
} from '@/lib/palestras/dados';
import { SemAcesso, type Escopo } from '@/lib/palestras/escopo';
import { alcanceDe, type AcaoProtegida } from '@/lib/palestras/papeis';
import { calcularTaxas, totalConfirmados, totalGerados } from '@/lib/palestras/taxas';
import { agora, dataCivil, deHoraLocal, formatarDataCurta } from '@/lib/tempo';

/* =========================================================
   Agregações da tela de métricas (D5 do design, tarefa 4.1)

   Mesma regra de `lib/palestras/dados.ts`: toda função daqui recebe o
   `Escopo` como **primeiro parâmetro**, sem valor padrão, e nenhuma
   consulta amplia o que o escopo já alcança: cada função reaproveita
   `confirmacoesNoEscopo`, `convitesNoEscopo`, `resumoNoEscopo` ou
   `resumoPorLoja`, que já filtram por escopo, em vez de montar um `where`
   novo. A única consulta nova (`colaboradoresSemDistribuicao`) reaproveita
   `restricao()`, o mesmo filtro que todas as outras usam.

   A tela de métricas exige mais que "o papel tem a ação": exige alcance
   **acima de `proprios`** (spec `metricas-do-circuito`, requisito 1): é o
   que tira o colaborador (que só vê os próprios convites) sem tirar quem
   gerencia. `exigirAlcanceGerencial` é essa regra, conferida de novo aqui
   como reforço, no mesmo espírito de `conferirPapel` em `dados.ts`: a
   página já chama `exigirPapel`, e esta camada continua barrando mesmo se
   alguma tela nova esquecer de checar.
   ========================================================= */

const ACAO_DE_METRICAS: AcaoProtegida = 'verConvitesEConfirmacoes';

function exigirAlcanceGerencial(escopo: Escopo): void {
  const alcance = alcanceDe(escopo.papel, ACAO_DE_METRICAS);
  if (alcance === 'nenhum' || alcance === 'proprios') {
    throw new SemAcesso(ACAO_DE_METRICAS, 'papel');
  }
}

/* ---------------------------------------------------------
   Percentual · base de todas as taxas do funil

   `null` quando o denominador é zero: a spec exige "indisponível", nunca
   uma exceção nem um 0% que confunda "não houve" com "ainda não mediu".
   --------------------------------------------------------- */

/** `(numerador, denominador) -> fração 0..1`, ou `null` sem denominador. */
export function percentual(numerador: number, denominador: number): number | null {
  if (denominador <= 0) return null;
  return numerador / denominador;
}

/* ---------------------------------------------------------
   Série diária de confirmações (requisito 4 da spec)

   `agruparConfirmacoesPorDia` é pura: recebe só as datas de confirmação
   (nunca titular, CPF ou WhatsApp, a função nem aceita esses campos) e
   devolve os últimos `dias` dias terminando na `referencia`, cada um com
   o total do dia, **incluindo os dias sem nenhuma confirmação como
   zero**. É a parte testável sem banco (tarefa 4.2).

   O corte de dia segue o fuso do evento (`dataCivil`, que já usa
   `America/Porto_Velho`): uma confirmação às 23h30 de 12/10 em Porto
   Velho cai no balde de 12/10, não no de 13/10 em UTC.
   --------------------------------------------------------- */

export const DIAS_DA_SERIE_PADRAO = 14;

export type PontoDaSerieDiaria = {
  /** `AAAA-MM-DD`, no fuso do evento. */
  data: string;
  /** `DD/MM`, para rótulo direto no gráfico. */
  rotulo: string;
  total: number;
};

export type SerieDiariaDeConfirmacoes = {
  pontos: PontoDaSerieDiaria[];
  totalNoPeriodo: number;
};

const UM_DIA_EM_MS = 86_400_000;

/** `AAAA-MM-DD` -> rótulo curto `DD/MM`, passando pelo meio-dia local para não cair em borda de fuso. */
function rotuloDoDia(dataCivilISO: string): string {
  return formatarDataCurta(deHoraLocal(`${dataCivilISO}T12:00:00`));
}

export function agruparConfirmacoesPorDia(
  confirmacoes: readonly { confirmadoEm: Date }[],
  opcoes: { dias?: number; referencia?: Date } = {},
): SerieDiariaDeConfirmacoes {
  const dias = opcoes.dias ?? DIAS_DA_SERIE_PADRAO;
  const referencia = opcoes.referencia ?? agora();

  // Os `dias` últimos dias civis terminando hoje, do mais antigo ao mais
  // recente. Como o fuso do evento é offset fixo (D8 do design), subtrair
  // N × 24h em UTC sempre cai no mesmo horário local do dia anterior.
  const chaves: string[] = [];
  for (let i = dias - 1; i >= 0; i -= 1) {
    chaves.push(dataCivil(new Date(referencia.getTime() - i * UM_DIA_EM_MS)));
  }

  const contagemPorDia = new Map<string, number>();
  for (const c of confirmacoes) {
    const chave = dataCivil(c.confirmadoEm);
    contagemPorDia.set(chave, (contagemPorDia.get(chave) ?? 0) + 1);
  }

  // Confirmações fora da janela dos últimos `dias` dias simplesmente não
  // têm balde em `chaves`: não precisam de filtro à parte.
  const pontos = chaves.map((data) => ({
    data,
    rotulo: rotuloDoDia(data),
    total: contagemPorDia.get(data) ?? 0,
  }));

  return {
    pontos,
    totalNoPeriodo: pontos.reduce((soma, p) => soma + p.total, 0),
  };
}

/** A série diária, dentro do escopo e (opcionalmente) de uma palestra. */
export async function serieDiariaDeConfirmacoes(
  escopo: Escopo,
  opcoes: { eventoId?: string; dias?: number; referencia?: Date } = {},
): Promise<SerieDiariaDeConfirmacoes> {
  exigirAlcanceGerencial(escopo);

  const confirmacoes = await confirmacoesNoEscopo(
    escopo,
    opcoes.eventoId ? { eventoId: opcoes.eventoId } : {},
  );

  // Só a data importa aqui: nome, CPF e WhatsApp do convidado nunca saem
  // desta função, mesmo por engano, porque o objeto que segue adiante não
  // os contém.
  return agruparConfirmacoesPorDia(
    confirmacoes.map((c) => ({ confirmadoEm: c.confirmadoEm })),
    { dias: opcoes.dias, referencia: opcoes.referencia },
  );
}

/* ---------------------------------------------------------
   Funil do convite (requisito 3 da spec)

   Quatro etapas: gerados, com anotação de envio, confirmados, presentes.
   `calcularFunil` é pura e testável: recebe os quatro totais já contados e
   devolve, junto, o percentual de cada etapa **sobre a etapa anterior**
   (é a definição da spec, diferente do percentual sobre gerados que a
   largura da barra do gráfico usa só para o desenho: ver
   `GraficoDoFunil`).
   --------------------------------------------------------- */

export type Funil = {
  gerados: number;
  enviados: number;
  confirmados: number;
  presentes: number;
  /** `null` sem gerados: nada para dividir. */
  taxaEnviadosSobreGerados: number | null;
  /** `null` sem enviados. */
  taxaConfirmadosSobreEnviados: number | null;
  /** `null` sem confirmados. */
  taxaPresentesSobreConfirmados: number | null;
};

export function calcularFunil(dados: {
  gerados: number;
  enviados: number;
  confirmados: number;
  presentes: number;
}): Funil {
  return {
    ...dados,
    taxaEnviadosSobreGerados: percentual(dados.enviados, dados.gerados),
    taxaConfirmadosSobreEnviados: percentual(dados.confirmados, dados.enviados),
    taxaPresentesSobreConfirmados: percentual(dados.presentes, dados.confirmados),
  };
}

/** O funil, dentro do escopo e (opcionalmente) de uma palestra. */
export async function funilDoConvite(
  escopo: Escopo,
  opcoes: { eventoId?: string } = {},
): Promise<Funil> {
  exigirAlcanceGerencial(escopo);

  const filtro = opcoes.eventoId ? { eventoId: opcoes.eventoId } : {};
  const [resumo, convites] = await Promise.all([
    resumoNoEscopo(escopo, opcoes.eventoId),
    convitesNoEscopo(escopo, filtro),
  ]);

  return calcularFunil({
    gerados: totalGerados(resumo),
    // "Com anotação de envio" é o lembrete pessoal do colaborador
    // (`enviadoPara`, D4 de `painel-colaborador`), não um evento de
    // sistema: é o dado que já existe para esta contagem.
    enviados: convites.filter((c) => c.enviadoPara !== null).length,
    confirmados: totalConfirmados(resumo),
    presentes: resumo.presente,
  });
}

/* ---------------------------------------------------------
   Colaboradores sem nenhum convite distribuído (requisito 7 da spec)

   "Distribuído" é o mesmo lembrete pessoal do funil acima: um convite com
   `enviadoPara` preenchido. Um colaborador entra nesta contagem quando TEM
   convites gerados (senão não há nada para ele distribuir, e o alerta não
   seria acionável) e NENHUM deles tem a anotação de envio, em qualquer
   palestra do circuito, não só na que está em contexto: o alerta é sobre
   o colaborador parado, não sobre uma palestra específica.
   --------------------------------------------------------- */

export type ColaboradoresSemDistribuicao = {
  total: number;
};

export async function colaboradoresSemDistribuicao(
  escopo: Escopo,
): Promise<ColaboradoresSemDistribuicao> {
  exigirAlcanceGerencial(escopo);

  const condicoes: (SQL | undefined)[] = [
    eq(user.papel, 'colaborador'),
    restricao(escopo, {
      colaboradorId: convite.colaboradorId,
      lojaId: user.lojaId,
      regionalId: loja.regionalId,
    }),
  ];

  const linhas = await db()
    .select({
      colaboradorId: user.id,
      // `count(convite.id)` ignora as linhas nulas do `left join`: um
      // colaborador sem nenhum convite gerado conta 0, não 1.
      gerados: count(convite.id),
      enviados: sql<number>`count(${convite.id}) filter (where ${convite.enviadoPara} is not null)`,
    })
    .from(user)
    .leftJoin(loja, eq(loja.id, user.lojaId))
    .leftJoin(convite, eq(convite.colaboradorId, user.id))
    .where(and(...condicoes.filter(Boolean)))
    .groupBy(user.id);

  const total = linhas.filter(
    (l) => Number(l.gerados) > 0 && Number(l.enviados) === 0,
  ).length;

  return { total };
}

/* ---------------------------------------------------------
   Lojas com melhor conversão (requisito 5 da spec)

   Reaproveita `resumoPorLoja` (que já filtra por escopo) e só ordena e
   recorta o resultado: nenhuma consulta nova. `resumoPorLoja` recusa o
   gerente de loja (só tem a própria, sem "ranking" que valha a pena): quem
   chama decide, antes de chamar esta função, se o papel tem mais de uma
   loja para comparar.
   --------------------------------------------------------- */

export async function lojasComMelhorConversao(
  escopo: Escopo,
  opcoes: { eventoId?: string; limite?: number } = {},
): Promise<ResumoDeLoja[]> {
  exigirAlcanceGerencial(escopo);

  const limite = opcoes.limite ?? 8;
  const lojas = await resumoPorLoja(escopo, { eventoId: opcoes.eventoId });

  return lojas
    .filter((l) => totalGerados(l.resumo) > 0)
    .sort((a, b) => {
      const taxaA = calcularTaxas(a.resumo).confirmacao ?? -1;
      const taxaB = calcularTaxas(b.resumo).confirmacao ?? -1;
      return taxaB - taxaA;
    })
    .slice(0, limite);
}
