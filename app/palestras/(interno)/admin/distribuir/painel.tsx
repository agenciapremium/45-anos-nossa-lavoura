'use client';

import { useMemo, useState } from 'react';

import {
  Aviso,
  Botao,
  Cabecalho,
  Cartao,
  Celula,
  CelulaDeTitulo,
  Grupo,
  LinkBotao,
  Selecao,
  Selo,
  Tabela,
  TituloDoCartao,
  Vazio,
} from '@/components/ui';
import { cn } from '@/lib/utils';

/* =========================================================
   Painel de distribuição de PDFs (tarefa 5.6)

   As duas rotas que fazem o trabalho de verdade (`lote/route.tsx`, que monta
   o `.zip`, e `pdf/route.tsx`, o PDF individual) e o limite por lote
   (`LIMITE_POR_LOTE`) continuam exatamente como estavam. Esta tela só
   organiza seleção, aviso de quem é pulado e o resumo em duas colunas, com
   o resumo do lote sempre visível ao lado da tabela, em vez de abaixo dela.
   ========================================================= */

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
  const [palestraId, setPalestraId] = useState<string>(palestras[0]?.id ?? '');
  const [regionalId, setRegionalId] = useState('');
  const [lojaId, setLojaId] = useState('');
  const [marcados, setMarcados] = useState<Set<string>>(new Set());

  const palestraEscolhida = palestras.find((p) => p.id === palestraId) ?? null;

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
  const selecionadosComConvites = selecionados.filter((l) => disponiveis(l) > 0);
  const selecionadosSemConvites = selecionados.filter((l) => disponiveis(l) === 0);
  const convitesNoLote = selecionadosComConvites.reduce((s, l) => s + disponiveis(l), 0);

  const todosVisiveisMarcados =
    visiveis.length > 0 && visiveis.every((l) => marcados.has(l.colaboradorId));

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
  const podeBaixarLote = selecionados.length > 0 && !excedeLimite;

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[1fr_340px]">
      <div className="flex min-w-0 flex-col gap-4">
        <div className="flex flex-wrap items-end gap-3">
          <Grupo rotulo="Palestra" htmlFor="dist-palestra" className="mb-0 w-56">
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

          <Grupo rotulo="Regional" htmlFor="dist-regional" className="mb-0 w-48">
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

          <Grupo rotulo="Loja" htmlFor="dist-loja" className="mb-0 w-52">
            <Selecao id="dist-loja" value={lojaId} onChange={(e) => setLojaId(e.target.value)}>
              <option value="">Todas</option>
              {lojasDoFiltro.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.codigo} · {l.nome}
                </option>
              ))}
            </Selecao>
          </Grupo>

          <Botao
            variante="contorno"
            onClick={() => setMarcados(new Set(comConvites.map((l) => l.colaboradorId)))}
          >
            Marcar os {comConvites.length} com convites
          </Botao>
          <Botao variante="texto" onClick={() => setMarcados(new Set())}>
            Desmarcar tudo
          </Botao>
        </div>

        {visiveis.length === 0 ? (
          <Vazio titulo="Nenhum colaborador neste filtro." />
        ) : (
          <Tabela superficie="interna">
            <Cabecalho superficie="interna">
              <tr>
                <CelulaDeTitulo className="w-11">
                  {/* 8.6: o quadradinho continua pequeno, mas o alvo de
                      toque (o `label`) tem os 44 px mínimos do interno. */}
                  <label className="flex size-11 -m-2 cursor-pointer items-center justify-center">
                    <input
                      type="checkbox"
                      aria-label="Selecionar todos os colaboradores visíveis"
                      checked={todosVisiveisMarcados}
                      className="size-5 accent-lima-500"
                      onChange={(e) =>
                        setMarcados((atual) => {
                          const proximo = new Set(atual);
                          for (const l of visiveis) {
                            if (e.target.checked) proximo.add(l.colaboradorId);
                            else proximo.delete(l.colaboradorId);
                          }
                          return proximo;
                        })
                      }
                    />
                  </label>
                </CelulaDeTitulo>
                <CelulaDeTitulo>Colaborador</CelulaDeTitulo>
                <CelulaDeTitulo>Loja</CelulaDeTitulo>
                <CelulaDeTitulo>Convites disponíveis</CelulaDeTitulo>
                <CelulaDeTitulo className="text-right">PDF</CelulaDeTitulo>
              </tr>
            </Cabecalho>
            <tbody>
              {visiveis.map((l) => {
                const n = disponiveis(l);
                const marcado = marcados.has(l.colaboradorId);
                return (
                  <tr key={l.colaboradorId} className={marcado ? 'bg-superficie-alt' : undefined}>
                    <Celula>
                      <label className="flex size-11 -m-2 cursor-pointer items-center justify-center">
                        <input
                          type="checkbox"
                          className="size-5 accent-lima-500"
                          checked={marcado}
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
                      </label>
                    </Celula>
                    <Celula className="font-bold text-texto-forte">{l.nome}</Celula>
                    <Celula className="text-corpo-sm">
                      {l.lojaCodigo} · {l.lojaNome}
                      <span className="block text-texto-suave">{l.regionalNome}</span>
                    </Celula>
                    <Celula>
                      {n > 0 ? (
                        <Selo tom="positivo">{n} convite{n === 1 ? '' : 's'}</Selo>
                      ) : (
                        <Selo tom="neutro">nenhum</Selo>
                      )}
                    </Celula>
                    <Celula className="text-right">
                      {n > 0 ? (
                        <LinkBotao href={urlIndividual(l.colaboradorId)} variante="contorno" tamanho="sm">
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
      </div>

      <div className="flex flex-col gap-4">
        <div className="rounded-cartao bg-inverso-fundo p-5 text-texto-inverso">
          <p className="m-0 mb-4 font-corpo text-rotulo font-bold uppercase tracking-sobrancelha text-lima-500">
            Lote a baixar
          </p>
          <dl className="m-0 flex flex-col gap-3">
            <div>
              <dt className="font-corpo text-corpo-sm text-texto-inverso-suave">Palestra</dt>
              <dd className="m-0 mt-0.5 font-corpo text-corpo-lg font-bold text-texto-inverso">
                {palestraEscolhida?.rotulo ?? 'Nenhuma escolhida'}
              </dd>
            </div>
            <div>
              <dt className="font-corpo text-corpo-sm text-texto-inverso-suave">Selecionados</dt>
              <dd className="m-0 mt-0.5 font-titulo text-t1 font-bold leading-none text-lima-500">
                {selecionados.length}
              </dd>
            </div>
            <div>
              <dt className="font-corpo text-corpo-sm text-texto-inverso-suave">
                Convites nos PDFs
              </dt>
              <dd className="m-0 mt-0.5 font-corpo text-corpo-lg font-bold text-texto-inverso">
                {convitesNoLote} em {selecionadosComConvites.length} arquivo
                {selecionadosComConvites.length === 1 ? '' : 's'}
              </dd>
            </div>
          </dl>
          <div className="mt-5">
            <LinkBotao
              href={podeBaixarLote ? urlDoLote() : '#'}
              tamanho="lg"
              className={cn('w-full justify-center', !podeBaixarLote && 'pointer-events-none opacity-50')}
              aria-disabled={!podeBaixarLote}
            >
              Baixar .zip com {selecionadosComConvites.length} PDF(s)
            </LinkBotao>
          </div>
          <p className="m-0 mt-3 font-corpo text-corpo-sm text-texto-inverso-suave">
            Limite de {limitePorLote} colaboradores por operação. Acima disso, filtre por loja
            e gere um lote por vez.
          </p>
        </div>

        {excedeLimite ? (
          <Aviso tom="erro">
            <p>
              São {selecionados.length} colaboradores e o limite por operação é{' '}
              {limitePorLote}. Filtre por loja e gere um lote de cada vez.
            </p>
          </Aviso>
        ) : null}

        {selecionadosSemConvites.length > 0 ? (
          <Aviso tom="atencao" titulo="Quem vai ser pulado">
            <p>
              {selecionadosSemConvites.length} pessoa
              {selecionadosSemConvites.length === 1 ? '' : 's'} selecionada
              {selecionadosSemConvites.length === 1 ? '' : 's'} não{' '}
              {selecionadosSemConvites.length === 1 ? 'tem' : 'têm'} convite disponível nesta
              palestra e não vai receber PDF:{' '}
              <strong>
                {selecionadosSemConvites
                  .slice(0, 6)
                  .map((l) => l.nome)
                  .join(', ')}
              </strong>
              {selecionadosSemConvites.length > 6 ? ' e outros' : ''}. A lista completa vai no{' '}
              <code className="font-mono">LEIA-ME.txt</code> dentro do{' '}
              <code className="font-mono">.zip</code>.
            </p>
          </Aviso>
        ) : null}

        <Cartao superficie="interna">
          <TituloDoCartao className="mb-2">O que vai em cada PDF</TituloDoCartao>
          <ul className="m-0 list-disc pl-5 font-corpo text-corpo text-texto">
            <li>Selo do circuito, cidade, data, horário e local</li>
            <li>Um bloco por convite, com o código e o link em texto puro</li>
            <li>Botão “Enviar via WhatsApp” já com a mensagem da palestra</li>
            <li>Instrução de uso para o colaborador, em uma linha</li>
          </ul>
          <p className="mt-3 mb-0 font-corpo text-corpo-sm text-texto-suave">
            O arquivo reflete o momento do download. Convite confirmado depois não sai do PDF
            antigo: a lista de convites no painel é a fonte da verdade.
          </p>
        </Cartao>
      </div>
    </div>
  );
}
