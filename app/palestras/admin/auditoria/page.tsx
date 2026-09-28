import type { Metadata } from 'next';

import {
  Aviso,
  Botao,
  Cabecalho,
  Campo,
  Celula,
  CelulaDeTitulo,
  Grupo,
  LinkBotao,
  Selecao,
  Sobrancelha,
  Tabela,
  Titulo,
  Vazio,
} from '@/components/ui';
import { listarAuditoria, opcoesDeAuditoria } from '@/lib/palestras/consultas';
import { exigirPapel } from '@/lib/palestras/sessao';
import { deHoraLocal, formatarCarimbo } from '@/lib/tempo';

export const metadata: Metadata = { title: 'Auditoria' };
export const dynamic = 'force-dynamic';

type Filtros = {
  ator?: string;
  acao?: string;
  entidade?: string;
  de?: string;
  ate?: string;
};

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
      de: f.de ? deHoraLocal(`${f.de}T00:00:00`) : undefined,
      ate: f.ate ? deHoraLocal(`${f.ate}T23:59:59`) : undefined,
    }),
    opcoesDeAuditoria(escopo),
  ]);

  const temFiltro = Boolean(f.ator || f.acao || f.entidade || f.de || f.ate);

  return (
    <>
      <Sobrancelha>Rastro</Sobrancelha>
      <Titulo>Auditoria</Titulo>
      <p className="mt-2 mb-6 max-w-prosa font-corpo text-corpo-lg text-texto">
        Registro imutável de toda ação sensível. A tabela recusa alteração e
        exclusão no próprio banco — nem a aplicação consegue mexer.
      </p>

      <Aviso tom="informacao" className="mb-6">
        <p>
          Os payloads nunca trazem CPF completo, senha, código de verificação
          nem token de ingresso. O CPF aparece mascarado, como{' '}
          <code className="font-mono">529.***.***-25</code>, o bastante para
          rastrear e insuficiente para identificar.
        </p>
      </Aviso>

      {/* Filtro por GET: o link do resultado pode ser copiado e colado. */}
      <form method="get" className="mb-6 grid gap-4 sm:grid-cols-5">
        <Grupo rotulo="Ator" htmlFor="f-ator" className="mb-0">
          <Selecao id="f-ator" name="ator" defaultValue={f.ator ?? ''}>
            <option value="">Todos</option>
            {opcoes.atores.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </Selecao>
        </Grupo>
        <Grupo rotulo="Ação" htmlFor="f-acao" className="mb-0">
          <Selecao id="f-acao" name="acao" defaultValue={f.acao ?? ''}>
            <option value="">Todas</option>
            {opcoes.acoes.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </Selecao>
        </Grupo>
        <Grupo rotulo="Entidade" htmlFor="f-entidade" className="mb-0">
          <Selecao
            id="f-entidade"
            name="entidade"
            defaultValue={f.entidade ?? ''}
          >
            <option value="">Todas</option>
            {opcoes.entidades.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </Selecao>
        </Grupo>
        <Grupo rotulo="De" htmlFor="f-de" className="mb-0">
          <Campo id="f-de" name="de" type="date" defaultValue={f.de ?? ''} />
        </Grupo>
        <Grupo rotulo="Até" htmlFor="f-ate" className="mb-0">
          <Campo id="f-ate" name="ate" type="date" defaultValue={f.ate ?? ''} />
        </Grupo>

        <div className="flex items-end gap-3 sm:col-span-5">
          <Botao type="submit">Filtrar</Botao>
          {temFiltro ? (
            <LinkBotao href="/palestras/admin/auditoria" variante="texto">
              Limpar filtros
            </LinkBotao>
          ) : null}
          <span className="ml-auto font-corpo text-corpo text-texto-suave">
            {registros.length} registro(s)
            {registros.length === 300 ? ' (300 mais recentes)' : ''}
          </span>
        </div>
      </form>

      {registros.length === 0 ? (
        <Vazio titulo="Nenhum registro no filtro escolhido." />
      ) : (
        <Tabela>
          <Cabecalho>
            <tr>
              <CelulaDeTitulo>Quando</CelulaDeTitulo>
              <CelulaDeTitulo>Ator</CelulaDeTitulo>
              <CelulaDeTitulo>Ação</CelulaDeTitulo>
              <CelulaDeTitulo>Entidade</CelulaDeTitulo>
              <CelulaDeTitulo>Dados</CelulaDeTitulo>
            </tr>
          </Cabecalho>
          <tbody>
            {registros.map((r) => (
              <tr key={r.id}>
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
                    <details>
                      <summary className="cursor-pointer font-corpo text-corpo-sm text-terra-700 underline underline-offset-4">
                        ver
                      </summary>
                      <pre className="mt-2 max-w-[48ch] overflow-x-auto rounded-controle bg-superficie-alt p-3 font-mono text-corpo-sm">
                        {JSON.stringify(r.dadosJson, null, 2)}
                      </pre>
                    </details>
                  ) : (
                    <span className="text-texto-suave">—</span>
                  )}
                </Celula>
              </tr>
            ))}
          </tbody>
        </Tabela>
      )}
    </>
  );
}
