import type { Metadata } from 'next';

import { CabecalhoDeTela } from '@/components/palestras/cabecalho-de-tela';
import {
  Cabecalho,
  Celula,
  CelulaDeTitulo,
  LinkBotao,
  Tabela,
  Vazio,
} from '@/components/ui';
import { contextoDePalestra } from '@/lib/palestras/contexto-de-palestra';
import { lotesAvulsosDaPalestra } from '@/lib/palestras/dados';
import { ORIGEM_AVULSA, ROTULO_AVULSO_PADRAO } from '@/lib/palestras/origem';
import { exigirPapel } from '@/lib/palestras/sessao';
import { totalGerados } from '@/lib/palestras/taxas';
import { formatarCarimbo, formatarData } from '@/lib/tempo';

export const metadata: Metadata = { title: 'Lotes avulsos' };
export const dynamic = 'force-dynamic';

/* =========================================================
   /palestras/admin/gerar/lotes · voltar a um lote depois (tarefa 5.4)

   Requisito "Admin volta ao lote depois": encontrar o lote pela data, pelo
   rótulo e pela quantidade, e reabrir os mesmos links. A palestra vem do
   contexto da barra de topo, como nas outras telas.

   Duas colunas que parecem redundantes e não são: "pedidos" é a quantidade
   da geração e "hoje" é o que existe agora. Elas divergem quando um convite
   do lote é cancelado, e a divergência é informação: o Admin precisa saber
   que o lote de 20 da imprensa está com 19 links úteis.
   ========================================================= */

export default async function LotesAvulsos({
  searchParams,
}: {
  searchParams: Promise<{ palestra?: string }>;
}) {
  const { escopo } = await exigirPapel(['admin']);
  const { palestra } = await searchParams;

  const { atual: palestraAtual } = await contextoDePalestra(palestra);

  const acao = (
    <LinkBotao
      href={`/palestras/admin/gerar?modo=avulso${palestraAtual ? `&palestra=${palestraAtual.id}` : ''}`}
      variante="secundario"
      tamanho="sm"
    >
      Gerar novo lote
    </LinkBotao>
  );

  if (!palestraAtual) {
    return (
      <>
        <CabecalhoDeTela
          sobrancelha={`${ORIGEM_AVULSA} · convites`}
          titulo="Lotes avulsos"
          acao={acao}
        />
        <Vazio titulo="Nenhuma palestra ativa">
          <p className="m-0">
            Cadastre e ative uma palestra antes de gerar convites avulsos.
          </p>
        </Vazio>
      </>
    );
  }

  const lotes = await lotesAvulsosDaPalestra(escopo, palestraAtual.id);

  return (
    <>
      <CabecalhoDeTela
        voltar={{ href: '/palestras/admin/gerar?modo=avulso', rotulo: 'Voltar para gerar convites' }}
        sobrancelha={`${ORIGEM_AVULSA} · ${palestraAtual.cidade} · ${formatarData(palestraAtual.dataHora)}`}
        titulo="Lotes avulsos"
        acao={acao}
      />

      <p className="mt-0 mb-6 max-w-prosa font-corpo text-corpo-lg text-texto">
        Cada linha é uma geração avulsa desta palestra. Abra o lote para copiar os links nos
        mesmos endereços de sempre, ou baixe o PDF e o CSV dele.
      </p>

      {lotes.length === 0 ? (
        <Vazio titulo="Nenhum lote avulso nesta palestra.">
          <p className="m-0">
            Convites avulsos são os gerados direto pela administração, sem colaborador de origem.
            Use a aba <strong>Avulso</strong> da tela de gerar convites.
          </p>
        </Vazio>
      ) : (
        <>
          <Tabela superficie="interna">
            <Cabecalho superficie="interna">
              <tr>
                <CelulaDeTitulo>Gerado em</CelulaDeTitulo>
                <CelulaDeTitulo>Rótulo</CelulaDeTitulo>
                <CelulaDeTitulo className="text-right">Pedidos</CelulaDeTitulo>
                <CelulaDeTitulo className="text-right">Hoje</CelulaDeTitulo>
                <CelulaDeTitulo className="text-right">Disponíveis</CelulaDeTitulo>
                <CelulaDeTitulo className="text-right">Confirmados</CelulaDeTitulo>
                <CelulaDeTitulo className="text-right">Ações</CelulaDeTitulo>
              </tr>
            </Cabecalho>
            <tbody>
              {lotes.map((l) => (
                <tr key={l.id}>
                  <Celula className="whitespace-nowrap">
                    {formatarCarimbo(l.criadoEm)}
                    {l.criadoPorNome ? (
                      <span className="block font-corpo text-corpo-sm text-texto-suave">
                        {l.criadoPorNome}
                      </span>
                    ) : null}
                  </Celula>
                  <Celula className="font-bold text-texto-forte">
                    {l.rotulo ?? ROTULO_AVULSO_PADRAO}
                  </Celula>
                  <Celula className="text-right tabular-nums">{l.quantidade}</Celula>
                  <Celula className="text-right tabular-nums">{totalGerados(l.resumo)}</Celula>
                  <Celula className="text-right tabular-nums font-bold">
                    {l.resumo.disponivel}
                  </Celula>
                  <Celula className="text-right tabular-nums font-bold">
                    {l.resumo.confirmado + l.resumo.presente}
                  </Celula>
                  <Celula className="text-right">
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <LinkBotao
                        href={`/palestras/admin/gerar/lote/${l.id}/csv`}
                        variante="contorno"
                        tamanho="sm"
                      >
                        CSV
                      </LinkBotao>
                      <LinkBotao
                        href={`/palestras/admin/gerar/lote/${l.id}/pdf`}
                        variante="contorno"
                        tamanho="sm"
                      >
                        PDF
                      </LinkBotao>
                      <LinkBotao
                        href={`/palestras/admin/gerar/lote/${l.id}`}
                        variante="secundario"
                        tamanho="sm"
                      >
                        Abrir os links
                      </LinkBotao>
                    </div>
                  </Celula>
                </tr>
              ))}
            </tbody>
          </Tabela>

          <p className="mt-4 mb-0 max-w-prosa font-corpo text-corpo-sm text-texto-suave">
            Somando todos os lotes desta palestra:{' '}
            <strong className="text-texto-forte">
              {lotes.reduce((s, l) => s + totalGerados(l.resumo), 0)} convites avulsos
            </strong>
            , dos quais{' '}
            <strong className="text-texto-forte">
              {lotes.reduce((s, l) => s + l.resumo.confirmado + l.resumo.presente, 0)} já
              confirmaram
            </strong>
            . Esse total entra no número da palestra, e não nos recortes por regional, loja e
            colaborador, onde aparece como a linha &quot;Avulsos&quot;.
          </p>
        </>
      )}
    </>
  );
}
