import type { Metadata } from 'next';
import Link from 'next/link';

import { BarraDaSessao } from '@/components/palestras/barra-da-sessao';
import { CabecalhoDoCircuito } from '@/components/palestras/selo';
import { Cartao, Selecao, Selo, Titulo, TituloDoCartao } from '@/components/ui';
import { listarPalestrasAtivas } from '@/lib/palestras/consultas';
import { resumoNoEscopo, resumoPorLoja, type ResumoDeContagem } from '@/lib/palestras/dados';
import { permitido, type Escopo } from '@/lib/palestras/escopo';
import { ROTULO_DO_PAPEL } from '@/lib/palestras/papeis';
import { exigirPapel } from '@/lib/palestras/sessao';
import { calcularTaxas, formatarTaxa, totalGerados } from '@/lib/palestras/taxas';
import { agora, formatarData, formatarHorario, mesmoDiaCivil } from '@/lib/tempo';

export const metadata: Metadata = {
  title: 'Relatórios',
  robots: { index: false, follow: false, nocache: true },
};
export const dynamic = 'force-dynamic';

/**
 * `/palestras/relatorios` — hub de lista impressa, CSV e números por
 * palestra (spec `indicadores-palestra`). O middleware já restringe o
 * prefixo a admin, gerentes e recepção; `exigirPapel` repete a checagem e
 * devolve o escopo.
 */
export default async function PaginaDeRelatorios({
  searchParams,
}: {
  searchParams: Promise<{ palestra?: string }>;
}) {
  const atual = await exigirPapel(['admin', 'gerente_regional', 'gerente_loja', 'recepcao']);
  const { escopo } = atual;
  const { palestra } = await searchParams;

  const palestras = await listarPalestrasAtivas();
  if (palestras.length === 0) {
    return (
      <Casca nome={atual.nome} papel={atual.papel}>
        <Titulo>Relatórios</Titulo>
        <p className="mt-4 font-corpo text-corpo text-texto">
          Nenhuma palestra cadastrada ainda.
        </p>
      </Casca>
    );
  }

  const agoraRef = agora();
  const padrao = palestras.find((p) => mesmoDiaCivil(agoraRef, p.dataHora)) ?? palestras[0]!;
  const selecionada = palestras.find((p) => p.id === palestra) ?? padrao;

  const podeExportarCsv = permitido(escopo, 'exportarCsv');

  return (
    <Casca nome={atual.nome} papel={atual.papel}>
      <Titulo>Relatórios</Titulo>
      <p className="mt-2 mb-6 max-w-prosa font-corpo text-corpo-lg text-texto">
        Lista para impressão e exportação CSV por palestra, com os números de
        cada uma dentro do seu escopo.
      </p>

      <form method="get" className="mb-8 flex flex-wrap items-end gap-3">
        <label className="min-w-0 flex-1 sm:max-w-sm">
          <span className="mb-1 block font-corpo text-corpo-sm font-bold text-texto-forte">
            Palestra
          </span>
          <Selecao name="palestra" defaultValue={selecionada.id}>
            {palestras.map((p) => (
              <option key={p.id} value={p.id}>
                {p.cidade} — {formatarData(p.dataHora)} às {formatarHorario(p.dataHora)}
              </option>
            ))}
          </Selecao>
        </label>
        <button
          type="submit"
          className="min-h-12 cursor-pointer rounded-controle border-2 border-terra-700 bg-terra-700 px-6 font-corpo text-corpo font-bold uppercase tracking-[0.06em] text-creme-500"
        >
          Ver
        </button>
      </form>

      <div className="mb-8 flex flex-wrap gap-3">
        <Link
          href={`/palestras/relatorios/lista?palestra=${selecionada.id}`}
          className="inline-flex min-h-12 items-center justify-center rounded-controle border-2 border-terra-700 bg-lima-500 px-6 font-corpo text-corpo font-bold uppercase tracking-[0.06em] text-terra-900 no-underline"
        >
          Lista para impressão
        </Link>
        {podeExportarCsv ? (
          <a
            href={`/palestras/relatorios/csv?palestra=${selecionada.id}`}
            className="inline-flex min-h-12 items-center justify-center rounded-controle border-2 border-terra-700 bg-transparent px-6 font-corpo text-corpo font-bold uppercase tracking-[0.06em] text-terra-700 no-underline hover:bg-terra-700 hover:text-creme-500"
          >
            Exportar CSV
          </a>
        ) : null}
      </div>

      {escopo.papel === 'recepcao' ? (
        <p className="font-corpo text-corpo text-texto-suave">
          A recepção usa a lista impressa como contingência da porta. Números e CSV
          são de gerentes e do Admin.
        </p>
      ) : (
        <NumerosDaPalestra escopo={escopo} eventoId={selecionada.id} papel={escopo.papel} />
      )}
    </Casca>
  );
}

async function NumerosDaPalestra({
  escopo,
  eventoId,
  papel,
}: {
  escopo: Escopo;
  eventoId: string;
  papel: string;
}) {
  const total = await resumoNoEscopo(escopo, eventoId);
  const porLoja =
    papel === 'admin' || papel === 'gerente_regional'
      ? await resumoPorLoja(escopo, { eventoId })
      : null;

  return (
    <div className="flex flex-col gap-6">
      <Cartao>
        <TituloDoCartao>Total no seu escopo, nesta palestra</TituloDoCartao>
        <ContagemPorEstado resumo={total} />
        <DefinicaoDasTaxas resumo={total} />
      </Cartao>

      {porLoja ? (
        <div>
          <h2 className="m-0 mb-3 font-titulo text-t3 font-bold text-texto-forte">
            Por loja
          </h2>
          {porLoja.length === 0 ? (
            <p className="font-corpo text-corpo text-texto-suave">
              Nenhuma loja com convites nesta palestra, no seu escopo.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {porLoja.map((l) => (
                <Cartao key={l.lojaId}>
                  <TituloDoCartao>
                    {l.lojaCodigo} · {l.lojaNome}
                  </TituloDoCartao>
                  <ContagemPorEstado resumo={l.resumo} />
                  <DefinicaoDasTaxas resumo={l.resumo} compacto />
                </Cartao>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

function ContagemPorEstado({ resumo }: { resumo: ResumoDeContagem }) {
  return (
    <ul className="m-0 mt-2 flex list-none flex-wrap gap-1.5 p-0">
      <li>
        <Selo tom="neutro">{totalGerados(resumo)} gerados</Selo>
      </li>
      <li>
        <Selo tom="neutro">{resumo.disponivel} disponíveis</Selo>
      </li>
      <li>
        <Selo tom="positivo">{resumo.confirmado} confirmados</Selo>
      </li>
      <li>
        <Selo tom="acento">{resumo.presente} presentes</Selo>
      </li>
      <li>
        <Selo tom="negativo">{resumo.cancelado} cancelados</Selo>
      </li>
      <li>
        <Selo tom="atencao">{resumo.expirado} expirados</Selo>
      </li>
    </ul>
  );
}

/**
 * Task 9.4: a definição de cada taxa fica visível na tela, para não haver
 * dúvida sobre o que entra no denominador — em especial, que cancelados
 * continuam no total de gerados.
 */
function DefinicaoDasTaxas({
  resumo,
  compacto = false,
}: {
  resumo: ResumoDeContagem;
  compacto?: boolean;
}) {
  const taxas = calcularTaxas(resumo);
  return (
    <div className="mt-3">
      <p className="m-0 font-corpo text-corpo-sm text-texto-suave">
        Taxa de confirmação (confirmados ÷ gerados, cancelados incluídos em
        gerados):{' '}
        <strong className="text-texto-forte">{formatarTaxa(taxas.confirmacao)}</strong>
      </p>
      {!compacto ? (
        <p className="m-0 font-corpo text-corpo-sm text-texto-suave">
          Taxa de comparecimento (presentes ÷ confirmados, incluindo quem já é
          presente):{' '}
          <strong className="text-texto-forte">{formatarTaxa(taxas.comparecimento)}</strong>
        </p>
      ) : (
        <p className="m-0 font-corpo text-corpo-sm text-texto-suave">
          Comparecimento:{' '}
          <strong className="text-texto-forte">{formatarTaxa(taxas.comparecimento)}</strong>
        </p>
      )}
    </div>
  );
}

function Casca({
  nome,
  papel,
  children,
}: {
  nome: string;
  papel: keyof typeof ROTULO_DO_PAPEL;
  children: React.ReactNode;
}) {
  return (
    <>
      <CabecalhoDoCircuito titulo="Relatórios">
        <BarraDaSessao nome={nome} papel={ROTULO_DO_PAPEL[papel]} />
      </CabecalhoDoCircuito>
      <main className="mx-auto w-full max-w-conteudo flex-1 px-[var(--gutter-page)] py-8">
        {children}
      </main>
    </>
  );
}
