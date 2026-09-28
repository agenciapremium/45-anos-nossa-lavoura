import type { Metadata } from 'next';
import { forbidden } from 'next/navigation';
import Link from 'next/link';

import { Cartao, Selecao, Selo, Sobrancelha, Tabela, Cabecalho, Celula, CelulaDeTitulo, Titulo, TituloDoCartao, Vazio } from '@/components/ui';
import {
  confirmacoesNoEscopo,
  resumoPorColaborador,
  resumoPorLoja,
  resumoPorRegional,
  type ResumoDeContagem,
} from '@/lib/palestras/dados';
import { SemAcesso } from '@/lib/palestras/escopo';
import { listarPalestrasAtivas } from '@/lib/palestras/consultas';
import { calcularTaxas, formatarTaxa, totalGerados } from '@/lib/palestras/taxas';
import { exigirPapel } from '@/lib/palestras/sessao';
import { formatarData } from '@/lib/tempo';

export const metadata: Metadata = { title: 'Equipe' };
export const dynamic = 'force-dynamic';

type Filtros = { palestra?: string; regional?: string; loja?: string };

function ContagemPorEstado({ resumo }: { resumo: ResumoDeContagem }) {
  return (
    <ul className="m-0 mt-2 flex list-none flex-wrap gap-1.5 p-0">
      <li>
        <Selo tom="neutro">{totalGerados(resumo)} gerados</Selo>
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

function CartaoDeTaxas({ resumo }: { resumo: ResumoDeContagem }) {
  const taxas = calcularTaxas(resumo);
  return (
    <p className="m-0 mt-2 font-corpo text-corpo-sm text-texto-suave">
      Confirmação: <strong className="text-texto-forte">{formatarTaxa(taxas.confirmacao)}</strong>
      {' · '}
      Comparecimento:{' '}
      <strong className="text-texto-forte">{formatarTaxa(taxas.comparecimento)}</strong>
    </p>
  );
}

export default async function Equipe({
  searchParams,
}: {
  searchParams: Promise<Filtros>;
}) {
  const { escopo } = await exigirPapel(['admin', 'gerente_regional', 'gerente_loja']);
  const f = await searchParams;

  const palestras = await listarPalestrasAtivas();
  const eventoId = f.palestra && palestras.some((p) => p.id === f.palestra) ? f.palestra : undefined;

  function comFiltro(mudancas: Partial<Filtros>): string {
    const params = new URLSearchParams();
    if (f.palestra) params.set('palestra', f.palestra);
    const proximo = { regional: f.regional, loja: f.loja, ...mudancas };
    if (proximo.regional) params.set('regional', proximo.regional);
    if (proximo.loja) params.set('loja', proximo.loja);
    const q = params.toString();
    return q ? `?${q}` : '';
  }

  // O gerente de loja só tem a própria loja: não há nível "por loja" para
  // ele, vai direto para colaboradores (D2 — a restrição já vem da consulta).
  const nivelPedido: 'regional' | 'loja' | 'colaborador' =
    escopo.papel === 'gerente_loja'
      ? 'colaborador'
      : f.loja
        ? 'colaborador'
        : f.regional || escopo.papel === 'gerente_regional'
          ? 'loja'
          : 'regional';

  const lojaAlvo = escopo.papel === 'gerente_loja' ? (escopo.lojaId ?? '') : (f.loja ?? '');

  try {
    if (nivelPedido === 'regional') {
      const linhas = await resumoPorRegional(escopo, { eventoId });
      return (
        <Layout titulo="Equipe" palestras={palestras} filtro={f}>
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
                  <Cartao className="h-full hover:border-lima-500">
                    <TituloDoCartao>{l.regionalNome}</TituloDoCartao>
                    <ContagemPorEstado resumo={l.resumo} />
                    <CartaoDeTaxas resumo={l.resumo} />
                  </Cartao>
                </Link>
              ))}
            </div>
          )}
        </Layout>
      );
    }

    if (nivelPedido === 'loja') {
      const linhas = await resumoPorLoja(escopo, {
        eventoId,
        regionalId: f.regional || undefined,
      });
      return (
        <Layout
          titulo="Equipe"
          palestras={palestras}
          filtro={f}
          voltar={
            escopo.papel === 'admin' && f.regional
              ? { href: '/palestras/painel/equipe', rotulo: 'Todas as regionais' }
              : undefined
          }
        >
          {linhas.length === 0 ? (
            <Vazio titulo="Nenhuma loja com convites neste filtro." />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {linhas.map((l) => (
                <Link
                  key={l.lojaId}
                  href={`/palestras/painel/equipe${comFiltro({ regional: l.regionalId, loja: l.lojaId })}`}
                  className="no-underline"
                >
                  <Cartao className="h-full hover:border-lima-500">
                    <TituloDoCartao>
                      {l.lojaCodigo} · {l.lojaNome}
                    </TituloDoCartao>
                    <ContagemPorEstado resumo={l.resumo} />
                    <CartaoDeTaxas resumo={l.resumo} />
                  </Cartao>
                </Link>
              ))}
            </div>
          )}
        </Layout>
      );
    }

    // colaborador
    if (!lojaAlvo) {
      return (
        <Layout titulo="Equipe" palestras={palestras} filtro={f}>
          <Vazio titulo="Sem loja para mostrar." />
        </Layout>
      );
    }

    const [linhas, confirmados] = await Promise.all([
      resumoPorColaborador(escopo, lojaAlvo, { eventoId }),
      confirmacoesNoEscopo(escopo, { eventoId, lojaId: lojaAlvo }),
    ]);

    return (
      <Layout
        titulo="Equipe"
        palestras={palestras}
        filtro={f}
        voltar={
          escopo.papel === 'admin' || escopo.papel === 'gerente_regional'
            ? {
                href: `/palestras/painel/equipe${comFiltro({ loja: undefined })}`,
                rotulo: 'Voltar para as lojas',
              }
            : undefined
        }
      >
        {linhas.length === 0 ? (
          <Vazio titulo="Nenhum colaborador com convites nesta loja." />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {linhas.map((l) => (
              <Cartao key={l.colaboradorId}>
                <TituloDoCartao>{l.colaboradorNome}</TituloDoCartao>
                <ContagemPorEstado resumo={l.resumo} />
                <CartaoDeTaxas resumo={l.resumo} />
              </Cartao>
            ))}
          </div>
        )}

        <div className="mt-10">
          <h2 className="m-0 mb-4 font-titulo text-t3 font-bold text-texto-forte">
            Confirmados desta loja
          </h2>
          {confirmados.length === 0 ? (
            <Vazio titulo="Ninguém confirmado ainda nesta loja." />
          ) : (
            <Tabela>
              <Cabecalho>
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
                    <Celula>{c.titular}</Celula>
                    <Celula>{c.acompanhante ?? '—'}</Celula>
                    <Celula className="font-mono">{c.cpf}</Celula>
                    <Celula>{c.colaboradorNome}</Celula>
                  </tr>
                ))}
              </tbody>
            </Tabela>
          )}
        </div>
      </Layout>
    );
  } catch (erro) {
    // `resumoPorLoja`/`resumoPorColaborador` lançam `SemAcesso` quando o
    // `lojaId`/`regionalId` da URL está fora do escopo (D2 e a spec:
    // "Escopo não vaza por URL" -> 403). Um id de outra regional/loja na
    // query nunca chega a devolver dado nenhum.
    if (erro instanceof SemAcesso) forbidden();
    throw erro;
  }
}

function Layout({
  titulo,
  palestras,
  filtro,
  voltar,
  children,
}: {
  titulo: string;
  palestras: { id: string; cidade: string; dataHora: Date }[];
  filtro: Filtros;
  voltar?: { href: string; rotulo: string };
  children: React.ReactNode;
}) {
  return (
    <>
      <Sobrancelha>Somente leitura</Sobrancelha>
      <Titulo>{titulo}</Titulo>
      <p className="mt-2 mb-6 max-w-prosa font-corpo text-corpo-lg text-texto">
        Números por consulta agregada, sem cadastro nem envio por aqui.
        Cancelados continuam contando em "gerados" — é o total de convites
        que já saíram, não o que ainda vale.
      </p>

      <form method="get" className="mb-6 flex flex-wrap items-end gap-3">
        {filtro.regional ? <input type="hidden" name="regional" value={filtro.regional} /> : null}
        {filtro.loja ? <input type="hidden" name="loja" value={filtro.loja} /> : null}
        <label className="min-w-0 flex-1 sm:max-w-xs">
          <span className="mb-1 block font-corpo text-corpo-sm font-bold text-texto-forte">
            Palestra
          </span>
          <Selecao name="palestra" defaultValue={filtro.palestra ?? ''}>
            <option value="">Todas</option>
            {palestras.map((p) => (
              <option key={p.id} value={p.id}>
                {p.cidade} — {formatarData(p.dataHora)}
              </option>
            ))}
          </Selecao>
        </label>
        <button
          type="submit"
          className="min-h-12 cursor-pointer rounded-controle border-2 border-terra-700 bg-terra-700 px-6 font-corpo text-corpo font-bold uppercase tracking-[0.06em] text-creme-500"
        >
          Filtrar
        </button>
      </form>

      {voltar ? (
        <div className="mb-4">
          <Link
            href={voltar.href}
            className="font-corpo text-corpo-sm text-terra-700 underline underline-offset-4"
          >
            ← {voltar.rotulo}
          </Link>
        </div>
      ) : null}

      {children}
    </>
  );
}
