import type { Metadata } from 'next';
import Link from 'next/link';

import { CabecalhoDeTela } from '@/components/palestras/cabecalho-de-tela';
import { GraficoDeConfirmacoesPorDia } from '@/components/palestras/grafico-de-confirmacoes-por-dia';
import { GraficoDoFunil } from '@/components/palestras/grafico-do-funil';
import {
  AbaSegmentada,
  AbasSegmentadas,
  Aviso,
  Cabecalho,
  Cartao,
  Celula,
  CelulaDeTitulo,
  Selo,
  Subtitulo,
  Tabela,
  TituloDoCartao,
  Vazio,
} from '@/components/ui';
import type { Evento } from '@/lib/db/schema';
import { contextoDePalestra } from '@/lib/palestras/contexto-de-palestra';
import {
  lojasNoEscopo,
  resumoNoEscopo,
  resumoPorColaborador,
  resumoPorRegional,
  type ResumoDeColaborador,
  type ResumoDeLoja,
  type ResumoDeRegional,
} from '@/lib/palestras/dados';
import {
  colaboradoresSemDistribuicao,
  funilDoConvite,
  lojasComMelhorConversao,
  serieDiariaDeConfirmacoes,
} from '@/lib/palestras/metricas';
import { exigirPapel } from '@/lib/palestras/sessao';
import { calcularTaxas, formatarTaxa, totalGerados } from '@/lib/palestras/taxas';
import { agora, formatarData, formatarHorario, mesmoDiaCivil, venceu } from '@/lib/tempo';

export const metadata: Metadata = { title: 'Métricas' };
export const dynamic = 'force-dynamic';

type Filtros = { palestra?: string; visao?: string };

/* =========================================================
   /palestras/painel/metricas (tarefas 4.3 e 4.4)

   Só para quem gerencia (requisito 1 da spec `metricas-do-circuito`):
   `exigirPapel` recusa no servidor, antes de qualquer consulta, o mesmo
   trio que já enxerga a tela de Equipe. O colaborador (alcance `proprios`)
   e a recepção (alcance `nenhum`) recebem 403, não uma versão vazia da
   tela, e o item de menu, escondido para eles por `alcanceDe`, é só
   cortesia de navegação (D3 do design), nunca a proteção real.

   A palestra em contexto vem da barra de topo, como em `convites` e
   `equipe`. "Todas as palestras" é um modo à parte desta tela
   (`?visao=todas`), porque o seletor da barra de topo só escolhe uma
   palestra por vez: decisão registrada no relatório desta tarefa.
   ========================================================= */

const PAPEIS_DA_TELA = ['admin', 'gerente_regional', 'gerente_loja'] as const;

function situacaoDaPalestra(
  palestra: Pick<Evento, 'dataHora' | 'prazoConfirmacao'>,
  referencia: Date,
): string {
  if (palestra.dataHora.getTime() < referencia.getTime()) return 'realizada';
  if (mesmoDiaCivil(palestra.dataHora, referencia)) return 'hoje';
  if (venceu(palestra.prazoConfirmacao, referencia)) return 'prazo encerrado';
  if (mesmoDiaCivil(palestra.prazoConfirmacao, referencia)) return 'prazo vence hoje';
  return `em ${formatarData(palestra.dataHora)}`;
}

/** Barra horizontal simples (HTML, não SVG): mesmo desenho de `equipe/page.tsx`, para as duas telas ficarem consistentes. */
function BarraDeTaxa({ taxa }: { taxa: number | null }) {
  const percentual = taxa === null ? 0 : Math.round(taxa * 1000) / 10;
  return (
    <span className="flex items-center gap-2">
      <span className="h-1.5 flex-1 rounded-pilula bg-lima-100">
        <span
          className="block h-1.5 rounded-pilula bg-lima-700"
          style={{ width: `${Math.min(100, Math.max(0, percentual))}%` }}
        />
      </span>
      <span className="font-corpo text-corpo-sm font-bold tabular-nums text-texto-forte">
        {formatarTaxa(taxa)}
      </span>
    </span>
  );
}

function Indicador({
  rotulo,
  valor,
  nota,
}: {
  rotulo: string;
  valor: React.ReactNode;
  nota?: React.ReactNode;
}) {
  return (
    <Cartao superficie="interna">
      <p className="m-0 font-corpo text-corpo-sm text-texto-suave">{rotulo}</p>
      <p className="m-0 mt-1 font-corpo text-t2 font-bold leading-none text-texto-forte">
        {valor}
      </p>
      {nota ? <p className="m-0 mt-2 font-corpo text-corpo-sm text-texto-suave">{nota}</p> : null}
    </Cartao>
  );
}

type Alerta = { tom: 'atencao' | 'informacao'; texto: React.ReactNode; href: string; rotuloDoLink: string };

export default async function Metricas({
  searchParams,
}: {
  searchParams: Promise<Filtros>;
}) {
  const { escopo } = await exigirPapel([...PAPEIS_DA_TELA]);
  const f = await searchParams;

  const { eventos, atual: palestraAtual } = await contextoDePalestra(f.palestra);
  const referencia = agora();
  const visaoTodas = f.visao === 'todas' || !palestraAtual;
  const eventoId = visaoTodas ? undefined : palestraAtual.id;

  const eventosNoContexto = visaoTodas
    ? eventos
    : eventos.filter((e) => e.id === palestraAtual?.id);
  const algumaJaRealizada = eventosNoContexto.some(
    (e) => e.dataHora.getTime() < referencia.getTime(),
  );

  function comFiltro(mudancas: Partial<Filtros>): string {
    const proximo: Filtros = { palestra: f.palestra, visao: f.visao, ...mudancas };
    const params = new URLSearchParams();
    for (const [chave, valor] of Object.entries(proximo)) {
      if (valor) params.set(chave, valor);
    }
    const texto = params.toString();
    return texto ? `?${texto}` : '';
  }

  const [resumo, funil, serie, semDistribuicao] = await Promise.all([
    resumoNoEscopo(escopo, eventoId),
    funilDoConvite(escopo, { eventoId }),
    serieDiariaDeConfirmacoes(escopo, { eventoId }),
    colaboradoresSemDistribuicao(escopo),
  ]);

  const taxas = calcularTaxas(resumo);
  const gerados = totalGerados(resumo);
  const confirmados = resumo.confirmado + resumo.presente;

  // Nome da regional para a coluna "Regional" da tabela de lojas (artboard
  // aprovado): só o Admin enxerga o comparativo entre regionais, por isso
  // só para ele montamos o mapa a partir do que `resumoPorRegional` já
  // trouxe, sem consulta nova.
  let nomeDaRegional: Map<string, string> | null = null;

  // Desempenho por regional e por loja: cada papel vê o recorte que a
  // spec (requisito 5) autoriza. O gerente de loja não tem "outras lojas"
  // para comparar: para ele, o recorte é a própria loja e os
  // colaboradores dela, mesma regra de `painel/equipe`.
  let regionais: ResumoDeRegional[] | null = null;
  let lojasTop: ResumoDeLoja[] | null = null;
  let colaboradoresDaLoja: ResumoDeColaborador[] | null = null;
  let minhaLojaNome: string | null = null;

  if (escopo.papel === 'admin') {
    [regionais, lojasTop] = await Promise.all([
      resumoPorRegional(escopo, { eventoId }),
      lojasComMelhorConversao(escopo, { eventoId, limite: 6 }),
    ]);
    nomeDaRegional = new Map(regionais.map((r) => [r.regionalId, r.regionalNome]));
  } else if (escopo.papel === 'gerente_regional') {
    lojasTop = await lojasComMelhorConversao(escopo, { eventoId, limite: 6 });
  } else {
    const minhasLojas = await lojasNoEscopo(escopo);
    const minhaLoja = minhasLojas[0];
    if (minhaLoja) {
      minhaLojaNome = `${minhaLoja.codigo} · ${minhaLoja.nome}`;
      colaboradoresDaLoja = (await resumoPorColaborador(escopo, minhaLoja.id, { eventoId }))
        .slice()
        .sort((a, b) => {
          const ta = calcularTaxas(a.resumo).confirmacao ?? -1;
          const tb = calcularTaxas(b.resumo).confirmacao ?? -1;
          return tb - ta;
        });
    }
  }

  // Alertas acionáveis (requisito 7): prazo vencendo hoje com disponíveis
  // ainda no escopo, e colaboradores sem nenhum convite distribuído.
  const alertasDePrazo: Alerta[] = [];
  for (const palestra of eventos) {
    if (!mesmoDiaCivil(palestra.prazoConfirmacao, referencia)) continue;
    if (venceu(palestra.prazoConfirmacao, referencia)) continue;
    const resumoDaPalestra = await resumoNoEscopo(escopo, palestra.id);
    if (resumoDaPalestra.disponivel <= 0) continue;
    alertasDePrazo.push({
      tom: 'atencao',
      texto: (
        <>
          <strong className="text-texto-forte">
            {palestra.cidade}: prazo de confirmação vence hoje, às{' '}
            {formatarHorario(palestra.prazoConfirmacao)}.
          </strong>{' '}
          {resumoDaPalestra.disponivel} convite{resumoDaPalestra.disponivel === 1 ? '' : 's'}{' '}
          disponíve{resumoDaPalestra.disponivel === 1 ? 'l' : 'is'} no seu escopo vão expirar com
          o prazo.
        </>
      ),
      href: `/palestras/painel/convites?estado=disponivel&palestra=${palestra.id}`,
      rotuloDoLink: 'Ver os convites',
    });
  }

  const alertas: Alerta[] = [...alertasDePrazo];
  if (semDistribuicao.total > 0) {
    alertas.push({
      tom: 'informacao',
      texto: (
        <>
          <strong className="text-texto-forte">
            {semDistribuicao.total} colaborador{semDistribuicao.total === 1 ? '' : 'es'} não
            distribuí{semDistribuicao.total === 1 ? 'u' : 'ram'} nenhum convite
          </strong>{' '}
          em nenhuma palestra do seu escopo.
        </>
      ),
      href: '/palestras/painel/equipe',
      rotuloDoLink: 'Ver a equipe',
    });
  }

  return (
    <>
      <CabecalhoDeTela sobrancelha="Painel" titulo="Métricas" />

      {eventos.length > 1 ? (
        <AbasSegmentadas className="mb-6">
          <AbaSegmentada href={`/palestras/painel/metricas${comFiltro({ visao: undefined })}`} ativo={!visaoTodas}>
            Esta palestra
          </AbaSegmentada>
          <AbaSegmentada href={`/palestras/painel/metricas${comFiltro({ visao: 'todas' })}`} ativo={visaoTodas}>
            Todas as palestras
          </AbaSegmentada>
        </AbasSegmentadas>
      ) : null}

      {/* Indicadores (requisito 2) */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Indicador rotulo="Gerados" valor={gerados} />
        <Indicador rotulo="Disponíveis" valor={resumo.disponivel} />
        <Indicador
          rotulo="Confirmados"
          valor={confirmados}
          nota={
            <>
              <strong className="text-sucesso">{formatarTaxa(taxas.confirmacao)}</strong> dos
              gerados (confirmados dividido por gerados, cancelados inclusos)
            </>
          }
        />
        <Indicador
          rotulo="Presentes"
          valor={resumo.presente}
          nota={
            algumaJaRealizada ? (
              <>
                <strong className="text-texto-forte">{formatarTaxa(taxas.comparecimento)}</strong>{' '}
                dos confirmados (presentes dividido por confirmados)
              </>
            ) : (
              'Taxa de comparecimento ainda não medida: a palestra ainda não aconteceu.'
            )
          }
        />
        <Indicador rotulo="Cancelados" valor={resumo.cancelado} />
        <Indicador rotulo="Expirados" valor={resumo.expirado} />
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-5">
        {/* Confirmações por dia (requisito 4) */}
        <section className="lg:col-span-3">
          <Cartao superficie="interna" className="h-full">
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
              <TituloDoCartao>Confirmações por dia</TituloDoCartao>
              <p className="m-0 font-corpo text-corpo-sm text-texto-suave">
                Últimos {serie.pontos.length} dias · {serie.totalNoPeriodo} confirmações no
                período, no fuso de Porto Velho
              </p>
            </div>
            <GraficoDeConfirmacoesPorDia serie={serie} />
          </Cartao>
        </section>

        {/* Funil do convite (requisito 3) */}
        <section className="lg:col-span-2">
          <Cartao superficie="interna" className="h-full">
            <TituloDoCartao>Funil do convite</TituloDoCartao>
            <p className="m-0 mt-1 mb-4 font-corpo text-corpo-sm text-texto-suave">
              Cada etapa, em relação à etapa anterior
            </p>
            <GraficoDoFunil funil={funil} />
            <p className="m-0 mt-4 border-t border-linha pt-3 font-corpo text-corpo-sm text-texto-suave">
              Cancelados continuam dentro de gerados: é o total que já saiu, não o que ainda
              vale.
            </p>
          </Cartao>
        </section>
      </div>

      {/* Desempenho por regional e por loja (requisito 5) */}
      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        {regionais ? (
          <Cartao superficie="interna">
            <TituloDoCartao>Confirmados por regional</TituloDoCartao>
            <p className="m-0 mt-1 mb-4 font-corpo text-corpo-sm text-texto-suave">
              Taxa sobre os convites gerados na regional
            </p>
            {regionais.length === 0 ? (
              <Vazio titulo="Nenhum convite ainda no escopo." />
            ) : (
              <ul className="m-0 flex list-none flex-col gap-3 p-0">
                {regionais.map((r) => {
                  const t = calcularTaxas(r.resumo);
                  return (
                    <li key={r.regionalId}>
                      <div className="mb-1 flex items-baseline justify-between gap-2">
                        <span className="font-corpo text-corpo text-texto">{r.regionalNome}</span>
                        <span className="font-corpo text-corpo tabular-nums text-texto-forte">
                          {r.resumo.confirmado + r.resumo.presente}
                        </span>
                      </div>
                      <BarraDeTaxa taxa={t.confirmacao} />
                    </li>
                  );
                })}
              </ul>
            )}
            <p className="m-0 mt-4">
              <Link
                href="/palestras/painel/equipe"
                className="font-corpo text-corpo-sm font-bold text-terra-700 underline underline-offset-4"
              >
                Abrir na tela de Equipe
              </Link>
            </p>
          </Cartao>
        ) : null}

        {colaboradoresDaLoja ? (
          <Cartao superficie="interna">
            <TituloDoCartao>
              Colaboradores {minhaLojaNome ? `da loja ${minhaLojaNome}` : 'da sua loja'}
            </TituloDoCartao>
            <p className="m-0 mt-1 mb-4 font-corpo text-corpo-sm text-texto-suave">
              Taxa de confirmação sobre os convites gerados por cada colaborador
            </p>
            {colaboradoresDaLoja.length === 0 ? (
              <Vazio titulo="Nenhum colaborador com convites ainda." />
            ) : (
              <ul className="m-0 flex list-none flex-col gap-3 p-0">
                {colaboradoresDaLoja.map((c) => {
                  const t = calcularTaxas(c.resumo);
                  return (
                    <li key={c.colaboradorId}>
                      <div className="mb-1 flex items-baseline justify-between gap-2">
                        <span className="font-corpo text-corpo text-texto">
                          {c.colaboradorNome}
                        </span>
                        <span className="font-corpo text-corpo tabular-nums text-texto-forte">
                          {c.resumo.confirmado + c.resumo.presente}
                        </span>
                      </div>
                      <BarraDeTaxa taxa={t.confirmacao} />
                    </li>
                  );
                })}
              </ul>
            )}
          </Cartao>
        ) : null}

        {lojasTop ? (
          <Cartao superficie="interna" className={colaboradoresDaLoja ? undefined : 'lg:col-span-2'}>
            <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
              <TituloDoCartao>Lojas com melhor conversão</TituloDoCartao>
              <Link
                href="/palestras/painel/equipe"
                className="font-corpo text-corpo-sm font-bold text-terra-700 underline underline-offset-4"
              >
                Ver todas na Equipe
              </Link>
            </div>
            {lojasTop.length === 0 ? (
              <Vazio titulo="Nenhuma loja com convites ainda." />
            ) : (
              <Tabela superficie="interna">
                <Cabecalho superficie="interna">
                  <tr>
                    <CelulaDeTitulo>Loja</CelulaDeTitulo>
                    {nomeDaRegional ? <CelulaDeTitulo>Regional</CelulaDeTitulo> : null}
                    <CelulaDeTitulo className="text-right">Gerados</CelulaDeTitulo>
                    <CelulaDeTitulo className="text-right">Confirmados</CelulaDeTitulo>
                    <CelulaDeTitulo>Taxa</CelulaDeTitulo>
                  </tr>
                </Cabecalho>
                <tbody>
                  {lojasTop.map((l) => {
                    const t = calcularTaxas(l.resumo);
                    return (
                      <tr key={l.lojaId}>
                        <Celula className="font-bold text-texto-forte">
                          {l.lojaCodigo} · {l.lojaNome}
                        </Celula>
                        {nomeDaRegional ? (
                          <Celula>{nomeDaRegional.get(l.regionalId) ?? l.regionalId}</Celula>
                        ) : null}
                        <Celula className="text-right tabular-nums">{totalGerados(l.resumo)}</Celula>
                        <Celula className="text-right font-bold tabular-nums">
                          {l.resumo.confirmado + l.resumo.presente}
                        </Celula>
                        <Celula>
                          <BarraDeTaxa taxa={t.confirmacao} />
                        </Celula>
                      </tr>
                    );
                  })}
                </tbody>
              </Tabela>
            )}
          </Cartao>
        ) : null}
      </div>

      {/* Situação de cada palestra, para orientar quem está com "todas" no contexto */}
      {visaoTodas && eventos.length > 0 ? (
        <div className="mb-6">
          <Subtitulo className="mb-3 text-t3">Situação de cada palestra</Subtitulo>
          <Tabela superficie="interna">
            <Cabecalho superficie="interna">
              <tr>
                <CelulaDeTitulo>Palestra</CelulaDeTitulo>
                <CelulaDeTitulo>Situação</CelulaDeTitulo>
              </tr>
            </Cabecalho>
            <tbody>
              {eventos.map((palestra) => (
                <tr key={palestra.id}>
                  <Celula className="font-bold text-texto-forte">
                    {palestra.cidade} · {formatarData(palestra.dataHora)}
                  </Celula>
                  <Celula>
                    <Selo tom={situacaoDaPalestra(palestra, referencia) === 'hoje' ? 'positivo' : 'neutro'}>
                      {situacaoDaPalestra(palestra, referencia)}
                    </Selo>
                  </Celula>
                </tr>
              ))}
            </tbody>
          </Tabela>
        </div>
      ) : null}

      {/* Alertas acionáveis (requisito 7) */}
      <section>
        <Subtitulo className="mb-3 text-t3">Onde olhar agora</Subtitulo>
        {alertas.length === 0 ? (
          <Aviso tom="informacao">
            <p>Nenhum prazo vencendo hoje e nenhum colaborador parado no seu escopo.</p>
          </Aviso>
        ) : (
          <div className="flex flex-col gap-3">
            {alertas.map((alerta, indice) => (
              <Aviso key={indice} tom={alerta.tom}>
                <p>
                  {alerta.texto}{' '}
                  <Link href={alerta.href} className="font-bold underline underline-offset-4">
                    {alerta.rotuloDoLink}
                  </Link>
                </p>
              </Aviso>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
