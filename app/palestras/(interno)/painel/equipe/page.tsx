import type { Metadata } from 'next';
import Link from 'next/link';
import { Fragment } from 'react';
import { forbidden } from 'next/navigation';

import { CabecalhoDeTela } from '@/components/palestras/cabecalho-de-tela';
import {
  Cabecalho,
  Cartao,
  Celula,
  CelulaDeTitulo,
  Selo,
  Tabela,
  TituloDoCartao,
  Vazio,
} from '@/components/ui';
import { IconeChevron } from '@/components/ui/icones';
import { contextoDePalestra } from '@/lib/palestras/contexto-de-palestra';
import {
  confirmacoesNoEscopo,
  lojasNoEscopo,
  resumoPorColaborador,
  resumoPorLoja,
  resumoPorRegional,
  type ResumoDeColaborador,
  type ResumoDeContagem,
  type ResumoDeLoja,
} from '@/lib/palestras/dados';
import { SemAcesso } from '@/lib/palestras/escopo';
import type { Papel } from '@/lib/db/schema';
import { exigirPapel } from '@/lib/palestras/sessao';
import { calcularTaxas, somarResumos, totalGerados } from '@/lib/palestras/taxas';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Equipe' };
export const dynamic = 'force-dynamic';

type Filtros = { palestra?: string; regional?: string; lojaAberta?: string };

/* =========================================================
   /palestras/painel/equipe (tarefa 3.5)

   Somente leitura, agregada: nenhum cadastro, nenhum envio. A trilha de
   nível substitui a antiga tela separada de "colaboradores da loja X": em
   vez de navegar para outra página, a loja abre NO LUGAR, como uma linha
   expansível da própria tabela (`?lojaAberta=<id>`), reaproveitando
   `resumoPorColaborador` só quando alguma loja está aberta.

   D2 do design continua valendo: um `regionalId`/`lojaId` de fora do
   escopo lançado na URL não devolve dado nenhum. `resumoPorLoja` e
   `resumoPorColaborador` lançam `SemAcesso`, e a resposta é 403.
   ========================================================= */

function formatarPercentual(taxa: number | null): string {
  return taxa === null ? 'sem dados' : `${(taxa * 100).toFixed(1)}%`;
}

function BarraDeTaxa({ taxa }: { taxa: number | null }) {
  const percentual = taxa === null ? 0 : Math.round(taxa * 1000) / 10;
  return (
    <span className="flex items-center gap-2">
      <span className="h-2 flex-1 rounded-pilula bg-lima-100">
        <span
          className="block h-2 rounded-pilula bg-lima-700"
          style={{ width: `${Math.min(100, Math.max(0, percentual))}%` }}
        />
      </span>
      <span className="font-corpo text-corpo-sm font-bold tabular-nums text-texto-forte">
        {formatarPercentual(taxa)}
      </span>
    </span>
  );
}

function Indicadores({ total }: { total: ResumoDeContagem }) {
  const taxas = calcularTaxas(total);
  const perdidos = total.expirado + total.cancelado;
  return (
    <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Cartao superficie="interna">
        <p className="m-0 font-corpo text-corpo-sm text-texto-suave">Gerados</p>
        <p className="m-0 mt-1 font-corpo text-t1 font-bold leading-none text-texto-forte">
          {totalGerados(total)}
        </p>
      </Cartao>
      <Cartao superficie="interna">
        <p className="m-0 font-corpo text-corpo-sm text-texto-suave">Confirmados</p>
        <p className="m-0 mt-1 font-corpo text-t1 font-bold leading-none text-texto-forte">
          {total.confirmado + total.presente}
        </p>
        <p className="m-0 mt-2 font-corpo text-corpo-sm font-bold text-sucesso">
          {formatarPercentual(taxas.confirmacao)} de conversão
        </p>
      </Cartao>
      <Cartao superficie="interna">
        <p className="m-0 font-corpo text-corpo-sm text-texto-suave">Presentes</p>
        <p className="m-0 mt-1 font-corpo text-t1 font-bold leading-none text-texto-forte">
          {total.presente}
        </p>
      </Cartao>
      <Cartao superficie="interna">
        <p className="m-0 font-corpo text-corpo-sm text-texto-suave">Perdidos</p>
        <p className="m-0 mt-1 font-corpo text-t1 font-bold leading-none text-texto-forte">
          {perdidos}
        </p>
        <p className="m-0 mt-2 font-corpo text-corpo-sm text-texto-suave">
          {total.expirado} expirados · {total.cancelado} cancelados
        </p>
      </Cartao>
    </div>
  );
}

function ResumoRapido({ resumo }: { resumo: ResumoDeContagem }) {
  const taxas = calcularTaxas(resumo);
  return (
    <div className="mt-2">
      <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0">
        <li>
          <Selo tom="neutro">{totalGerados(resumo)} gerados</Selo>
        </li>
        <li>
          <Selo tom="positivo">{resumo.confirmado + resumo.presente} confirmados</Selo>
        </li>
        <li>
          <Selo tom="acento">{resumo.presente} presentes</Selo>
        </li>
      </ul>
      <p className="m-0 mt-2 font-corpo text-corpo-sm text-texto-suave">
        Confirmação:{' '}
        <strong className="text-texto-forte">{formatarPercentual(taxas.confirmacao)}</strong>
      </p>
    </div>
  );
}

function pluralDeLoja(n: number): string {
  return `${n} loja${n === 1 ? '' : 's'}`;
}

function PilulaDaTrilha({
  ativo,
  children,
}: {
  ativo?: boolean;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        // 8.6: esta pílula também é o alvo de toque de um link (a trilha de
        // nível), então precisa dos 44 px mínimos do interno.
        'inline-flex min-h-11 items-center gap-2 rounded-pilula border px-3 font-corpo text-corpo-sm font-bold',
        ativo ? 'border-terra-700 bg-terra-700 text-creme-500' : 'border-linha bg-cartao text-texto-forte',
      )}
    >
      {children}
    </span>
  );
}

/** Trilha de navegação por nível (3.5): regionais &gt; loja selecionada &gt; lojas. */
function TrilhaDeNivel({
  papel,
  regionalId,
  regionalNome,
  totalRegionais,
  totalLojas,
  comFiltro,
}: {
  papel: Papel;
  regionalId?: string;
  regionalNome?: string;
  totalRegionais: number;
  totalLojas: number;
  comFiltro: (mudancas: Partial<Filtros>) => string;
}) {
  if (papel === 'gerente_loja') return null;

  if (papel === 'gerente_regional') {
    return (
      <nav aria-label="Nível da visão" className="mb-4 flex flex-wrap items-center gap-2">
        <PilulaDaTrilha ativo>Sua regional</PilulaDaTrilha>
        <span aria-hidden="true" className="text-texto-suave">
          ›
        </span>
        <span className="font-corpo text-corpo-sm text-texto-suave">
          {pluralDeLoja(totalLojas)} · toque em uma loja para ver os colaboradores
        </span>
      </nav>
    );
  }

  return (
    <nav aria-label="Nível da visão" className="mb-4 flex flex-wrap items-center gap-2">
      <Link href="/palestras/painel/equipe" className="no-underline">
        <PilulaDaTrilha>{totalRegionais} regionais</PilulaDaTrilha>
      </Link>
      {regionalId ? (
        <>
          <span aria-hidden="true" className="text-texto-suave">
            ›
          </span>
          <Link href={`/palestras/painel/equipe${comFiltro({ regional: undefined, lojaAberta: undefined })}`} className="no-underline">
            <PilulaDaTrilha ativo>
              {regionalNome ?? 'Regional'}
              <span aria-hidden="true">×</span>
            </PilulaDaTrilha>
          </Link>
          <span aria-hidden="true" className="text-texto-suave">
            ›
          </span>
        </>
      ) : null}
      <span className="font-corpo text-corpo-sm text-texto-suave">
        {pluralDeLoja(totalLojas)} · toque em uma loja para ver os colaboradores
      </span>
    </nav>
  );
}

function SubtabelaDeColaboradores({
  colaboradores,
  eventoId,
}: {
  colaboradores: ResumoDeColaborador[];
  /** Carrega a palestra do contexto atual para o link "Ver" (mesma tela, filtrada). */
  eventoId?: string;
}) {
  if (colaboradores.length === 0) {
    return (
      <p className="m-0 font-corpo text-corpo-sm text-texto-suave">
        Nenhum colaborador com convites nesta loja.
      </p>
    );
  }
  return (
    <Tabela superficie="interna">
      <Cabecalho superficie="interna">
        <tr>
          <CelulaDeTitulo>Colaborador</CelulaDeTitulo>
          <CelulaDeTitulo className="text-right">Gerados</CelulaDeTitulo>
          <CelulaDeTitulo className="text-right">Confirmados</CelulaDeTitulo>
          <CelulaDeTitulo>Taxa</CelulaDeTitulo>
          <CelulaDeTitulo className="text-right">Convites</CelulaDeTitulo>
        </tr>
      </Cabecalho>
      <tbody>
        {colaboradores.map((c) => {
          const taxas = calcularTaxas(c.resumo);
          const paramsDoColaborador = new URLSearchParams({ colaborador: c.colaboradorId });
          if (eventoId) paramsDoColaborador.set('palestra', eventoId);
          return (
            <tr key={c.colaboradorId}>
              <Celula className="font-bold text-texto-forte">{c.colaboradorNome}</Celula>
              <Celula className="text-right tabular-nums">{totalGerados(c.resumo)}</Celula>
              <Celula className="text-right font-bold tabular-nums">
                {c.resumo.confirmado + c.resumo.presente}
              </Celula>
              <Celula>
                <BarraDeTaxa taxa={taxas.confirmacao} />
              </Celula>
              <Celula className="text-right">
                <Link
                  href={`/palestras/painel/convites?${paramsDoColaborador.toString()}`}
                  className="font-corpo text-corpo-sm font-bold text-terra-700 underline underline-offset-4"
                >
                  Ver
                </Link>
              </Celula>
            </tr>
          );
        })}
      </tbody>
    </Tabela>
  );
}

export default async function Equipe({
  searchParams,
}: {
  searchParams: Promise<Filtros>;
}) {
  const { escopo } = await exigirPapel(['admin', 'gerente_regional', 'gerente_loja']);
  const f = await searchParams;

  const { atual: palestraAtual } = await contextoDePalestra(f.palestra);
  const eventoId = palestraAtual?.id;

  function comFiltro(mudancas: Partial<Filtros>): string {
    const proximo: Filtros = {
      palestra: f.palestra,
      regional: f.regional,
      lojaAberta: f.lojaAberta,
      ...mudancas,
    };
    const params = new URLSearchParams();
    for (const [chave, valor] of Object.entries(proximo)) {
      if (valor) params.set(chave, valor);
    }
    const texto = params.toString();
    return texto ? `?${texto}` : '';
  }

  try {
    // Só o Admin enxerga mais de uma regional (o alcance `regional` do
    // gerente já restringe o dele à própria): para ele, e só para ele,
    // existe um nível "regional" antes do nível "loja".
    if (escopo.papel === 'admin' && !f.regional) {
      const linhas = await resumoPorRegional(escopo, { eventoId });
      const total = somarResumos(linhas.map((l) => l.resumo));

      return (
        <>
          <CabecalhoDeTela sobrancelha="Painel · somente leitura" titulo="Equipe" />
          <Indicadores total={total} />
          {linhas.length === 0 ? (
            <Vazio titulo="Nenhum convite ainda no seu escopo." />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {linhas.map((l) => (
                <Link
                  key={l.regionalId}
                  href={`/palestras/painel/equipe${comFiltro({ regional: l.regionalId })}`}
                  className="no-underline"
                >
                  <Cartao superficie="interna" className="h-full hover:border-linha-forte">
                    <TituloDoCartao>{l.regionalNome}</TituloDoCartao>
                    <ResumoRapido resumo={l.resumo} />
                  </Cartao>
                </Link>
              ))}
            </div>
          )}
        </>
      );
    }

    const regionaisParaTrilha =
      escopo.papel === 'admin' ? await resumoPorRegional(escopo, { eventoId }) : [];

    // `resumoPorLoja` recusa o gerente de loja (spec `visao-gerencial`: ele
    // não tem "números por loja", só a própria), por isso o caso dele é
    // resolvido à parte, somando os colaboradores da única loja que tem.
    let lojas: ResumoDeLoja[];
    let colaboradoresDaLojaUnica: ResumoDeColaborador[] | null = null;
    if (escopo.papel === 'gerente_loja') {
      const minhasLojas = await lojasNoEscopo(escopo);
      const minhaLoja = minhasLojas[0];
      if (minhaLoja) {
        colaboradoresDaLojaUnica = await resumoPorColaborador(escopo, minhaLoja.id, { eventoId });
        lojas = [
          {
            lojaId: minhaLoja.id,
            lojaNome: minhaLoja.nome,
            lojaCodigo: minhaLoja.codigo,
            regionalId: minhaLoja.regionalId,
            resumo: somarResumos(colaboradoresDaLojaUnica.map((c) => c.resumo)),
          },
        ];
      } else {
        lojas = [];
      }
    } else {
      lojas = await resumoPorLoja(escopo, { eventoId, regionalId: f.regional || undefined });
    }

    const total = somarResumos(lojas.map((l) => l.resumo));

    const lojaAbertaId =
      escopo.papel === 'gerente_loja'
        ? lojas[0]?.lojaId
        : lojas.some((l) => l.lojaId === f.lojaAberta)
          ? f.lojaAberta
          : undefined;
    const lojaAberta = lojas.find((l) => l.lojaId === lojaAbertaId) ?? null;

    const [colaboradores, confirmados] = lojaAberta
      ? await Promise.all([
          colaboradoresDaLojaUnica ?? resumoPorColaborador(escopo, lojaAberta.lojaId, { eventoId }),
          confirmacoesNoEscopo(escopo, { eventoId, lojaId: lojaAberta.lojaId }),
        ])
      : [[] as ResumoDeColaborador[], []];

    return (
      <>
        <CabecalhoDeTela sobrancelha="Painel · somente leitura" titulo="Equipe" />

        <TrilhaDeNivel
          papel={escopo.papel}
          regionalId={f.regional}
          regionalNome={regionaisParaTrilha.find((r) => r.regionalId === f.regional)?.regionalNome}
          totalRegionais={regionaisParaTrilha.length}
          totalLojas={lojas.length}
          comFiltro={comFiltro}
        />

        <Indicadores total={total} />

        {lojas.length === 0 ? (
          <Vazio titulo="Nenhuma loja com convites neste filtro." />
        ) : (
          <Tabela superficie="interna" containerClassName="mb-8">
            <Cabecalho superficie="interna">
              <tr>
                <CelulaDeTitulo>Loja</CelulaDeTitulo>
                <CelulaDeTitulo className="text-right">Gerados</CelulaDeTitulo>
                <CelulaDeTitulo className="text-right">Confirmados</CelulaDeTitulo>
                <CelulaDeTitulo>Taxa de confirmação</CelulaDeTitulo>
                <CelulaDeTitulo className="text-right">Presentes</CelulaDeTitulo>
              </tr>
            </Cabecalho>
            <tbody>
              {lojas.map((l) => {
                const aberta = l.lojaId === lojaAbertaId;
                const taxas = calcularTaxas(l.resumo);
                return (
                  <Fragment key={l.lojaId}>
                    <tr>
                      <Celula>
                        {escopo.papel === 'gerente_loja' ? (
                          <span className="font-corpo font-bold text-texto-forte">
                            {l.lojaCodigo} · {l.lojaNome}
                          </span>
                        ) : (
                          <Link
                            href={`/palestras/painel/equipe${comFiltro({ lojaAberta: aberta ? undefined : l.lojaId })}`}
                            aria-expanded={aberta}
                            className="inline-flex items-center gap-2 font-corpo font-bold text-texto-forte no-underline"
                          >
                            <IconeChevron
                              className={cn('size-4 transition-transform', aberta ? '' : '-rotate-90')}
                            />
                            {l.lojaCodigo} · {l.lojaNome}
                          </Link>
                        )}
                      </Celula>
                      <Celula className="text-right tabular-nums">{totalGerados(l.resumo)}</Celula>
                      <Celula className="text-right font-bold tabular-nums">
                        {l.resumo.confirmado + l.resumo.presente}
                      </Celula>
                      <Celula>
                        <BarraDeTaxa taxa={taxas.confirmacao} />
                      </Celula>
                      <Celula className="text-right tabular-nums">{l.resumo.presente}</Celula>
                    </tr>
                    {aberta ? (
                      <tr>
                        <Celula colSpan={5} className="bg-superficie-alt">
                          <SubtabelaDeColaboradores colaboradores={colaboradores} eventoId={eventoId} />
                        </Celula>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })}
            </tbody>
          </Tabela>
        )}

        {lojaAberta ? (
          <section>
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-3">
              <TituloDoCartao>
                Confirmados da loja {lojaAberta.lojaCodigo} · {lojaAberta.lojaNome}
              </TituloDoCartao>
              <p className="m-0 font-corpo text-corpo-sm text-texto-suave">
                {confirmados.length} pessoa{confirmados.length === 1 ? '' : 's'} · CPF sempre mascarado
              </p>
            </div>
            {confirmados.length === 0 ? (
              <Vazio titulo="Ninguém confirmado ainda nesta loja." />
            ) : (
              <Tabela superficie="interna">
                <Cabecalho superficie="interna">
                  <tr>
                    <CelulaDeTitulo>Titular</CelulaDeTitulo>
                    <CelulaDeTitulo>Acompanhante</CelulaDeTitulo>
                    <CelulaDeTitulo>CPF</CelulaDeTitulo>
                    <CelulaDeTitulo>Colaborador</CelulaDeTitulo>
                  </tr>
                </Cabecalho>
                <tbody>
                  {confirmados.map((c) => (
                    <tr key={c.conviteId}>
                      <Celula className="font-bold text-texto-forte">{c.titular}</Celula>
                      <Celula>{c.acompanhante ?? 'Sem acompanhante'}</Celula>
                      <Celula className="font-mono">{c.cpf}</Celula>
                      <Celula>{c.colaboradorNome}</Celula>
                    </tr>
                  ))}
                </tbody>
              </Tabela>
            )}
          </section>
        ) : null}
      </>
    );
  } catch (erro) {
    // `resumoPorLoja`/`resumoPorColaborador` lançam `SemAcesso` quando o
    // `regionalId`/`lojaId` da URL está fora do escopo (D2): um id de outra
    // regional ou loja na query nunca devolve dado nenhum.
    if (erro instanceof SemAcesso) forbidden();
    throw erro;
  }
}
