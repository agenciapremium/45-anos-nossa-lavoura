'use client';

import { useMemo, useState } from 'react';

import {
  Aviso,
  Botao,
  Cabecalho,
  Celula,
  CelulaDeTitulo,
  Grupo,
  LinkBotao,
  Selecao,
  Selo,
  Tabela,
  Vazio,
} from '@/components/ui';

export type LinhaDeDistribuicao = {
  colaboradorId: string;
  nome: string;
  lojaId: string | null;
  lojaCodigo: string | null;
  lojaNome: string | null;
  regionalId: string | null;
  regionalNome: string | null;
  /** Convites disponíveis por palestra, já com a expiração avaliada. */
  disponiveisPorPalestra: Record<string, number>;
};

export function PainelDeDistribuicao({
  palestras,
  regionais,
  lojas,
  linhas,
  limitePorLote,
}: {
  palestras: { id: string; rotulo: string }[];
  regionais: { id: string; nome: string }[];
  lojas: { id: string; nome: string; codigo: string; regionalId: string }[];
  linhas: LinhaDeDistribuicao[];
  limitePorLote: number;
}) {
  const [palestraId, setPalestraId] = useState<string>(
    palestras[0]?.id ?? '',
  );
  const [regionalId, setRegionalId] = useState('');
  const [lojaId, setLojaId] = useState('');
  const [marcados, setMarcados] = useState<Set<string>>(new Set());

  const lojasDoFiltro = useMemo(
    () => (regionalId ? lojas.filter((l) => l.regionalId === regionalId) : lojas),
    [lojas, regionalId],
  );

  const visiveis = useMemo(
    () =>
      linhas.filter(
        (l) =>
          (!regionalId || l.regionalId === regionalId) &&
          (!lojaId || l.lojaId === lojaId),
      ),
    [linhas, regionalId, lojaId],
  );

  const disponiveis = (l: LinhaDeDistribuicao) =>
    palestraId ? (l.disponiveisPorPalestra[palestraId] ?? 0) : 0;

  const comConvites = visiveis.filter((l) => disponiveis(l) > 0);
  const selecionados = visiveis.filter((l) => marcados.has(l.colaboradorId));
  const selecionadosSemConvites = selecionados.filter(
    (l) => disponiveis(l) === 0,
  );

  const urlDoLote = () => {
    const p = new URLSearchParams();
    if (palestraId) p.append('palestra', palestraId);
    for (const l of selecionados) p.append('colaborador', l.colaboradorId);
    const loja = lojas.find((x) => x.id === lojaId);
    p.set('rotulo', loja ? `convites-${loja.codigo}` : 'convites');
    return `/palestras/admin/distribuir/lote?${p.toString()}`;
  };

  const urlIndividual = (id: string) => {
    const p = new URLSearchParams();
    if (palestraId) p.append('palestra', palestraId);
    p.append('colaborador', id);
    return `/palestras/admin/distribuir/pdf?${p.toString()}`;
  };

  const excedeLimite = selecionados.length > limitePorLote;

  return (
    <>
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Grupo rotulo="Palestra" htmlFor="dist-palestra">
          <Selecao
            id="dist-palestra"
            value={palestraId}
            onChange={(e) => setPalestraId(e.target.value)}
          >
            {palestras.map((p) => (
              <option key={p.id} value={p.id}>
                {p.rotulo}
              </option>
            ))}
          </Selecao>
        </Grupo>

        <Grupo rotulo="Regional" htmlFor="dist-regional">
          <Selecao
            id="dist-regional"
            value={regionalId}
            onChange={(e) => {
              setRegionalId(e.target.value);
              setLojaId('');
            }}
          >
            <option value="">Todas</option>
            {regionais.map((r) => (
              <option key={r.id} value={r.id}>
                {r.nome}
              </option>
            ))}
          </Selecao>
        </Grupo>

        <Grupo rotulo="Loja" htmlFor="dist-loja">
          <Selecao
            id="dist-loja"
            value={lojaId}
            onChange={(e) => setLojaId(e.target.value)}
          >
            <option value="">Todas</option>
            {lojasDoFiltro.map((l) => (
              <option key={l.id} value={l.id}>
                {l.codigo} · {l.nome}
              </option>
            ))}
          </Selecao>
        </Grupo>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Botao
          variante="contorno"
          onClick={() =>
            setMarcados(new Set(comConvites.map((l) => l.colaboradorId)))
          }
        >
          Marcar os {comConvites.length} com convites
        </Botao>
        <Botao variante="texto" onClick={() => setMarcados(new Set())}>
          Desmarcar tudo
        </Botao>
        <p className="m-0 ml-auto font-corpo text-corpo text-texto-suave">
          {selecionados.length} selecionado(s) · limite de {limitePorLote} por
          operação
        </p>
      </div>

      {selecionadosSemConvites.length > 0 ? (
        <Aviso tom="atencao" className="mb-4" titulo="Quem vai ser pulado">
          <p>
            {selecionadosSemConvites.length} colaborador(es) selecionado(s) não
            tem convite disponível nesta palestra e não vai receber PDF:{' '}
            {selecionadosSemConvites
              .slice(0, 8)
              .map((l) => l.nome)
              .join(', ')}
            {selecionadosSemConvites.length > 8 ? ' e outros' : ''}. A lista
            completa vai no <code className="font-mono">LEIA-ME.txt</code>{' '}
            dentro do <code className="font-mono">.zip</code>.
          </p>
        </Aviso>
      ) : null}

      {excedeLimite ? (
        <Aviso tom="erro" className="mb-4">
          <p>
            São {selecionados.length} colaboradores e o limite por operação é{' '}
            {limitePorLote}. Filtre por loja e gere um lote de cada vez.
          </p>
        </Aviso>
      ) : null}

      <div className="mb-6">
        <LinkBotao
          href={selecionados.length && !excedeLimite ? urlDoLote() : '#'}
          tamanho="lg"
          aria-disabled={selecionados.length === 0 || excedeLimite}
          className={
            selecionados.length === 0 || excedeLimite
              ? 'pointer-events-none opacity-50'
              : ''
          }
        >
          Baixar .zip com {selecionados.length} PDF(s)
        </LinkBotao>
      </div>

      {visiveis.length === 0 ? (
        <Vazio titulo="Nenhum colaborador neste filtro." />
      ) : (
        <Tabela>
          <Cabecalho>
            <tr>
              <CelulaDeTitulo className="w-10">
                <span className="sr-only">Selecionar</span>
              </CelulaDeTitulo>
              <CelulaDeTitulo>Colaborador</CelulaDeTitulo>
              <CelulaDeTitulo>Loja</CelulaDeTitulo>
              <CelulaDeTitulo>Convites disponíveis</CelulaDeTitulo>
              <CelulaDeTitulo>
                <span className="sr-only">PDF</span>
              </CelulaDeTitulo>
            </tr>
          </Cabecalho>
          <tbody>
            {visiveis.map((l) => {
              const n = disponiveis(l);
              return (
                <tr key={l.colaboradorId}>
                  <Celula>
                    <input
                      type="checkbox"
                      className="size-5 accent-lima-500"
                      checked={marcados.has(l.colaboradorId)}
                      aria-label={`Selecionar ${l.nome}`}
                      onChange={(e) =>
                        setMarcados((atual) => {
                          const proximo = new Set(atual);
                          if (e.target.checked) proximo.add(l.colaboradorId);
                          else proximo.delete(l.colaboradorId);
                          return proximo;
                        })
                      }
                    />
                  </Celula>
                  <Celula className="font-bold">{l.nome}</Celula>
                  <Celula className="text-corpo-sm">
                    {l.lojaCodigo} · {l.lojaNome}
                    <span className="block text-texto-suave">
                      {l.regionalNome}
                    </span>
                  </Celula>
                  <Celula>
                    {n > 0 ? (
                      <Selo tom="positivo">{n}</Selo>
                    ) : (
                      <Selo tom="neutro">nenhum</Selo>
                    )}
                  </Celula>
                  <Celula>
                    {n > 0 ? (
                      <LinkBotao
                        href={urlIndividual(l.colaboradorId)}
                        variante="contorno"
                        tamanho="sm"
                      >
                        Baixar PDF
                      </LinkBotao>
                    ) : (
                      <span className="font-corpo text-corpo-sm text-texto-suave">
                        Nada a distribuir
                      </span>
                    )}
                  </Celula>
                </tr>
              );
            })}
          </tbody>
        </Tabela>
      )}
    </>
  );
}
