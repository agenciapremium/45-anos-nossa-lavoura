import type { Metadata } from 'next';
import { Fragment } from 'react';

import { CabecalhoDeTela } from '@/components/palestras/cabecalho-de-tela';
import {
  Aviso,
  Botao,
  Cabecalho,
  Campo,
  Celula,
  CelulaDeTitulo,
  LinkBotao,
  Selecao,
  Selo,
  Tabela,
  Vazio,
} from '@/components/ui';
import { IconeEscudo } from '@/components/ui/icones';
import { listarAuditoria, opcoesDeAuditoria } from '@/lib/palestras/consultas';
import { exigirPapel } from '@/lib/palestras/sessao';
import { deHoraLocal, formatarCarimbo } from '@/lib/tempo';

import { BotaoCopiarLink } from './copiar-link';

export const metadata: Metadata = { title: 'Auditoria' };
export const dynamic = 'force-dynamic';

const CAMINHO = '/palestras/admin/auditoria';

type Filtros = {
  ator?: string;
  acao?: string;
  entidade?: string;
  /** Estreita para o rastro de um registro específico (tarefa 5.8): outra
   *  tela pode linkar direto para cá com `?entidadeId=<id>`. */
  entidadeId?: string;
  de?: string;
  ate?: string;
  /** Id do registro cujo payload está expandido na própria linha. */
  expandir?: string;
};

/* =========================================================
   /palestras/admin/auditoria (tarefa 5.7)

   Rastro imutável de toda ação sensível: a tabela recusa alteração e
   exclusão no próprio banco, nem a aplicação consegue mexer. Esta tela só
   reorganiza a apresentação, `listarAuditoria` e `opcoesDeAuditoria`
   continuam exatamente como estavam.

   O filtro é por GET, como o resto do painel (o link do resultado pode
   ser copiado e colado), e o payload de cada registro expande na própria
   linha, por um link que liga/desliga `?expandir=<id>` preservando os
   demais filtros: nenhum estado de cliente, funciona antes do script
   carregar, é o mesmo padrão dos chips de estado em `painel/convites`.
   ========================================================= */

export default async function Auditoria({
  searchParams,
}: {
  searchParams: Promise<Filtros>;
}) {
  const { escopo } = await exigirPapel(['admin']);
  const f = await searchParams;

  const [registros, opcoes] = await Promise.all([
    listarAuditoria(escopo, {
      ator: f.ator || undefined,
      acao: f.acao || undefined,
      entidade: f.entidade || undefined,
      entidadeId: f.entidadeId || undefined,
      de: f.de ? deHoraLocal(`${f.de}T00:00:00`) : undefined,
      ate: f.ate ? deHoraLocal(`${f.ate}T23:59:59`) : undefined,
    }),
    opcoesDeAuditoria(escopo),
  ]);

  const temFiltro = Boolean(
    f.ator || f.acao || f.entidade || f.entidadeId || f.de || f.ate,
  );

  function comFiltro(mudancas: Partial<Filtros>): string {
    const proximo: Filtros = {
      ator: f.ator,
      acao: f.acao,
      entidade: f.entidade,
      entidadeId: f.entidadeId,
      de: f.de,
      ate: f.ate,
      expandir: f.expandir,
      ...mudancas,
    };
    const params = new URLSearchParams();
    for (const [chave, valor] of Object.entries(proximo)) {
      if (valor) params.set(chave, valor);
    }
    const texto = params.toString();
    return texto ? `${CAMINHO}?${texto}` : CAMINHO;
  }

  return (
    <>
      <CabecalhoDeTela
        sobrancelha="Administração · rastro"
        titulo="Auditoria"
        acao={<BotaoCopiarLink />}
      />

      <p className="mt-0 mb-6 max-w-prosa font-corpo text-corpo-lg text-texto">
        Registro imutável de toda ação sensível do circuito: quem fez, o quê,
        quando e sobre qual registro. A tabela recusa alteração e exclusão no
        próprio banco.
      </p>

      <Aviso tom="informacao" className="mb-6">
        <p>
          Nenhum registro traz CPF completo, senha, código de verificação nem
          token de ingresso. O CPF aparece mascarado, como{' '}
          <code className="font-mono">529.***.***-25</code>: o bastante para
          rastrear e insuficiente para identificar.
        </p>
      </Aviso>

      {f.entidadeId ? (
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <Selo tom="acento" ponto={false}>
            <IconeEscudo className="size-3.5" /> Rastro do registro {f.entidadeId}
          </Selo>
          <LinkBotao
            href={comFiltro({ entidadeId: undefined })}
            variante="texto"
            tamanho="sm"
          >
            Ver toda a auditoria
          </LinkBotao>
        </div>
      ) : null}

      {/* Filtro por GET: o link do resultado pode ser copiado e colado. */}
      <form method="get" className="mb-6 grid gap-4 sm:grid-cols-5">
        {f.entidadeId ? (
          <input type="hidden" name="entidadeId" value={f.entidadeId} />
        ) : null}

        <label className="min-w-0">
          <span className="mb-1 block font-corpo text-corpo-sm font-bold text-texto-forte">
            Quem fez
          </span>
          <Selecao name="ator" defaultValue={f.ator ?? ''}>
            <option value="">Todos</option>
            {opcoes.atores.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </Selecao>
        </label>

        <label className="min-w-0">
          <span className="mb-1 block font-corpo text-corpo-sm font-bold text-texto-forte">
            Ação
          </span>
          <Selecao name="acao" defaultValue={f.acao ?? ''}>
            <option value="">Todas</option>
            {opcoes.acoes.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </Selecao>
        </label>

        <label className="min-w-0">
          <span className="mb-1 block font-corpo text-corpo-sm font-bold text-texto-forte">
            Entidade
          </span>
          <Selecao name="entidade" defaultValue={f.entidade ?? ''}>
            <option value="">Todas</option>
            {opcoes.entidades.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </Selecao>
        </label>

        <label className="min-w-0">
          <span className="mb-1 block font-corpo text-corpo-sm font-bold text-texto-forte">
            De
          </span>
          <Campo name="de" type="date" defaultValue={f.de ?? ''} />
        </label>

        <label className="min-w-0">
          <span className="mb-1 block font-corpo text-corpo-sm font-bold text-texto-forte">
            Até
          </span>
          <Campo name="ate" type="date" defaultValue={f.ate ?? ''} />
        </label>

        <div className="flex items-end gap-3 sm:col-span-5">
          <Botao type="submit" tamanho="sm">
            Filtrar
          </Botao>
          {temFiltro ? (
            <LinkBotao href={CAMINHO} variante="texto" tamanho="sm">
              Limpar filtros
            </LinkBotao>
          ) : null}
          <span className="ml-auto font-corpo text-corpo-sm text-texto-suave">
            {registros.length} registro{registros.length === 1 ? '' : 's'} no filtro
            {registros.length === 300 ? ' (300 mais recentes)' : ''}
          </span>
        </div>
      </form>

      {registros.length === 0 ? (
        <Vazio titulo="Nenhum registro no filtro escolhido." />
      ) : (
        <Tabela superficie="interna">
          <Cabecalho superficie="interna">
            <tr>
              <CelulaDeTitulo>Quando</CelulaDeTitulo>
              <CelulaDeTitulo>Quem</CelulaDeTitulo>
              <CelulaDeTitulo>Ação</CelulaDeTitulo>
              <CelulaDeTitulo>Entidade</CelulaDeTitulo>
              <CelulaDeTitulo>Dados</CelulaDeTitulo>
            </tr>
          </Cabecalho>
          <tbody>
            {registros.map((r) => {
              const expandido = f.expandir === r.id;
              return (
                <Fragment key={r.id}>
                  <tr>
                    <Celula className="whitespace-nowrap tabular-nums">
                      {formatarCarimbo(r.criadoEm)}
                    </Celula>
                    <Celula>{r.atorNome ?? 'rotina automática'}</Celula>
                    <Celula className="font-mono text-corpo-sm">{r.acao}</Celula>
                    <Celula className="font-mono text-corpo-sm">
                      {r.entidade}
                      {r.entidadeId ? (
                        <span className="block text-texto-suave">
                          {r.entidadeId.slice(0, 8)}…
                        </span>
                      ) : null}
                    </Celula>
                    <Celula>
                      {r.dadosJson ? (
                        <LinkBotao
                          href={comFiltro({ expandir: expandido ? undefined : r.id })}
                          variante={expandido ? 'secundario' : 'contorno'}
                          tamanho="sm"
                          aria-expanded={expandido}
                        >
                          {expandido ? 'Ocultar' : 'Ver dados'}
                        </LinkBotao>
                      ) : (
                        <span className="font-corpo text-corpo-sm text-texto-suave">
                          Sem dados adicionais.
                        </span>
                      )}
                    </Celula>
                  </tr>
                  {expandido && r.dadosJson ? (
                    <tr>
                      <Celula colSpan={5} className="pt-0">
                        <pre className="max-w-full overflow-x-auto rounded-controle bg-inverso-fundo p-4 font-mono text-corpo-sm text-lima-100">
                          {JSON.stringify(r.dadosJson, null, 2)}
                        </pre>
                      </Celula>
                    </tr>
                  ) : null}
                </Fragment>
              );
            })}
          </tbody>
        </Tabela>
      )}
    </>
  );
}
