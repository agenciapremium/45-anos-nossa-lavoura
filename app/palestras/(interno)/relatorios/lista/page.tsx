import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { SeloDoCircuito } from '@/components/palestras/selo';
import { ACOES, registrarAuditoria } from '@/lib/palestras/auditoria';
import { buscarPalestra } from '@/lib/palestras/consultas';
import { listaDeImpressao, totalDePessoasEsperadas } from '@/lib/palestras/dados';
import { atorAutorizado } from '@/lib/palestras/sessao';
import { formatarCarimbo, formatarData, formatarHorario } from '@/lib/tempo';

import { BotaoImprimir } from './botao-imprimir';
import './impressao.css';

export const metadata: Metadata = {
  title: 'Lista para impressão',
  robots: { index: false, follow: false, nocache: true },
};
export const dynamic = 'force-dynamic';

/**
 * `/palestras/relatorios/lista?palestra=<id>`: página de impressão em A4
 * retrato dos confirmados de uma palestra (tarefa 6.2).
 *
 * `atorAutorizado('listaImpressaECsv')` é a mesma ação da matriz do PRD que
 * `listaDeImpressao()` confere de novo na consulta: reforço em camadas, não
 * decoração. Um colaborador nunca chega aqui, o middleware já barra o
 * prefixo `/palestras/relatorios` inteiro para esse papel (403 antes de
 * qualquer linha deste componente rodar).
 */
export default async function ListaParaImpressao({
  searchParams,
}: {
  searchParams: Promise<{ palestra?: string }>;
}) {
  const { atual, ator } = await atorAutorizado('listaImpressaECsv');
  const { palestra: eventoId } = await searchParams;
  if (!eventoId) notFound();

  const palestraInfo = await buscarPalestra(eventoId);
  if (!palestraInfo) notFound();

  const linhas = await listaDeImpressao(atual.escopo, eventoId);
  // Total de pessoas = titulares + acompanhantes (spec "cabeçalho da
  // lista"). Cancelados já não entram: `listaDeImpressao` só traz
  // `confirmado`/`presente`. Mesma conta de `relatorios` (tarefa 6.7).
  const totalDePessoas = totalDePessoasEsperadas(linhas);
  const geradoEm = formatarCarimbo(new Date());

  await registrarAuditoria({
    ator,
    acao: ACOES.listaImpressaGerada,
    entidade: 'palestra_evento',
    entidadeId: eventoId,
    dados: {
      palestra: palestraInfo.cidade,
      confirmados: linhas.length,
      pessoas: totalDePessoas,
    },
  });

  return (
    <>
      <div className="mx-auto flex w-full max-w-conteudo items-center justify-between gap-3 px-[var(--gutter-page)] py-4 print:hidden">
        <Link
          href={`/palestras/relatorios?palestra=${eventoId}`}
          className="font-corpo text-corpo-sm text-terra-700 underline underline-offset-4"
        >
          ← Voltar para relatórios
        </Link>
        <BotaoImprimir />
      </div>

      <div className="folha-de-impressao">
        <header className="cabecalho-impressao">
          <SeloDoCircuito tamanho={72} className="flex-none" />
          <div className="cabecalho-textos min-w-0 flex-1">
            <p className="selo-texto">Circuito de Palestras Acelera no Campo 3.0</p>
            <h1>{palestraInfo.cidade} · lista de confirmados</h1>
            <p>
              {formatarData(palestraInfo.dataHora)} às {formatarHorario(palestraInfo.dataHora)} ·{' '}
              {palestraInfo.localNome}
            </p>
          </div>
          <dl className="cabecalho-totais">
            <dt>Confirmados</dt>
            <dd>{linhas.length}</dd>
            <dt>Pessoas (titulares e acompanhantes)</dt>
            <dd>{totalDePessoas}</dd>
          </dl>
        </header>

        <table className="tabela-de-impressao">
          <thead>
            <tr>
              <th className="col-numero">Nº</th>
              <th>Titular</th>
              <th>CPF</th>
              <th>Acompanhante</th>
              <th>Loja</th>
              <th>Colaborador</th>
              <th className="col-marca">Presença</th>
            </tr>
          </thead>
          <tbody>
            {linhas.length === 0 ? (
              <tr>
                <td colSpan={7}>Nenhum confirmado nesta palestra, no seu escopo.</td>
              </tr>
            ) : (
              linhas.map((l, indice) => (
                <tr key={l.conviteId}>
                  <td className="col-numero">{indice + 1}</td>
                  <td>{l.titular}</td>
                  <td>{l.cpf}</td>
                  <td>{l.acompanhante ?? 'Sem acompanhante'}</td>
                  <td>{l.lojaNome ?? 'Não informada'}</td>
                  <td>{l.colaboradorNome}</td>
                  <td className="col-marca">
                    <span className="caixa-de-marcacao" aria-hidden="true" />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <p className="rodape-fixo">Gerado em {geradoEm}.</p>
      </div>

      <p className="mx-auto w-full max-w-conteudo px-[var(--gutter-page)] pb-8 font-corpo text-corpo-sm text-texto-suave print:hidden">
        Gerado em {geradoEm}. Na impressão, a data e a numeração de página aparecem
        no rodapé de cada folha.
      </p>
    </>
  );
}
