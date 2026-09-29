import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { CabecalhoDeTela } from '@/components/palestras/cabecalho-de-tela';
import {
  Aviso,
  Cabecalho,
  Cartao,
  Celula,
  CelulaDeTitulo,
  LinkBotao,
  Selo,
  Tabela,
  TituloDoCartao,
} from '@/components/ui';
import { loteAvulsoNoEscopo } from '@/lib/palestras/dados';
import { env } from '@/lib/env';
import { urlDoConvite } from '@/lib/palestras/mensagem';
import { ORIGEM_AVULSA, ROTULO_AVULSO_PADRAO } from '@/lib/palestras/origem';
import { exigirPapel } from '@/lib/palestras/sessao';
import { totalGerados } from '@/lib/palestras/taxas';
import { formatarCarimbo, formatarData, formatarHorario } from '@/lib/tempo';
import { ROTULO_DO_ESTADO, TOM_DO_ESTADO } from '../../../../painel/convites/linha';
import { BotaoCopiarConvite, BotaoCopiarTodos } from './acoes-do-lote';

export const metadata: Metadata = { title: 'Lote avulso' };
export const dynamic = 'force-dynamic';

/* =========================================================
   /palestras/admin/gerar/lote/[id] · entrega dos links (tarefa 5.1)

   É onde a geração avulsa termina: os convites com código e endereço em
   texto, copiar um a um e copiar todos, mais PDF e CSV do lote. A tela
   continua acessível depois pela lista de lotes da palestra (requisito
   "Admin volta ao lote depois"), então não é uma tela de confirmação
   descartável: é o endereço permanente daquele lote.

   `loteAvulsoNoEscopo` recusa quem não é Admin e devolve `null` para lote
   de colaborador — o PDF de distribuição é a tela daquele caso, e esta
   rota não é um caminho alternativo para chegar nele.
   ========================================================= */

export default async function LoteAvulso({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ novo?: string }>;
}) {
  const { escopo } = await exigirPapel(['admin']);
  const { id } = await params;
  const { novo } = await searchParams;

  const lote = await loteAvulsoNoEscopo(escopo, id);
  if (!lote) notFound();

  const origem = env().APP_BASE_URL;
  const comUrl = lote.convites.map((c) => ({ ...c, url: urlDoConvite(origem, c.codigo) }));
  const urlsDisponiveis = comUrl
    .filter((c) => c.estado === 'disponivel')
    .map((c) => c.url);

  const rotuloDoLote = lote.rotulo ?? ROTULO_AVULSO_PADRAO;
  const total = totalGerados(lote.resumo);

  return (
    <>
      <CabecalhoDeTela
        voltar={{
          href: `/palestras/admin/gerar/lotes?palestra=${lote.eventoId}`,
          rotulo: 'Voltar para os lotes desta palestra',
        }}
        sobrancelha={`${ORIGEM_AVULSA} · ${lote.eventoCidade}`}
        titulo={rotuloDoLote}
        extra={<Selo tom="acento">{total} convites</Selo>}
        acao={
          <div className="flex flex-wrap items-center gap-2">
            <BotaoCopiarTodos urls={urlsDisponiveis} />
            <LinkBotao
              href={`/palestras/admin/gerar/lote/${lote.id}/pdf`}
              variante="contorno"
              tamanho="sm"
            >
              PDF do lote
            </LinkBotao>
            <LinkBotao
              href={`/palestras/admin/gerar/lote/${lote.id}/csv`}
              variante="contorno"
              tamanho="sm"
            >
              CSV do lote
            </LinkBotao>
          </div>
        }
      />

      {novo ? (
        <Aviso tom="sucesso" className="mb-6">
          <p>
            <strong>
              {lote.quantidade} convite{lote.quantidade === 1 ? '' : 's'} gerado
              {lote.quantidade === 1 ? '' : 's'}.
            </strong>{' '}
            Copie os links abaixo, ou baixe o PDF e o CSV. Este lote continua aqui depois: ele
            aparece na lista de lotes da palestra.
          </p>
        </Aviso>
      ) : null}

      <div className="mb-6 grid gap-4 lg:grid-cols-[1fr_320px]">
        <Cartao superficie="interna">
          <TituloDoCartao className="mb-3">Palestra</TituloDoCartao>
          <p className="m-0 font-corpo text-corpo-lg font-bold text-texto-forte">
            {lote.eventoCidade}
          </p>
          <p className="m-0 mt-1 font-corpo text-corpo text-texto">
            {formatarData(lote.eventoDataHora)}, às {formatarHorario(lote.eventoDataHora)} ·{' '}
            {lote.eventoLocalNome}
          </p>
          <p className="m-0 mt-3 border-t border-linha pt-3 font-corpo text-corpo-sm text-texto-suave">
            Confirmações até {formatarCarimbo(lote.eventoPrazo)}. Depois do prazo, os convites
            deste lote que ninguém usou passam a expirados.
          </p>
        </Cartao>

        <div className="rounded-cartao bg-inverso-fundo p-5 text-texto-inverso">
          <p className="m-0 mb-4 font-corpo text-rotulo font-bold uppercase tracking-sobrancelha text-lima-500">
            Este lote
          </p>
          <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 font-corpo text-corpo-sm">
            <dt className="text-texto-inverso-suave">Origem</dt>
            <dd className="m-0 font-bold text-texto-inverso">{ORIGEM_AVULSA}</dd>
            <dt className="text-texto-inverso-suave">Rótulo</dt>
            <dd className="m-0 font-bold text-texto-inverso">{rotuloDoLote}</dd>
            <dt className="text-texto-inverso-suave">Gerado em</dt>
            <dd className="m-0 text-texto-inverso">{formatarCarimbo(lote.criadoEm)}</dd>
            <dt className="text-texto-inverso-suave">Por</dt>
            <dd className="m-0 text-texto-inverso">{lote.criadoPorNome ?? ORIGEM_AVULSA}</dd>
            <dt className="text-texto-inverso-suave">Disponíveis</dt>
            <dd className="m-0 font-bold tabular-nums text-lima-500">{lote.resumo.disponivel}</dd>
            <dt className="text-texto-inverso-suave">Confirmados</dt>
            <dd className="m-0 font-bold tabular-nums text-texto-inverso">
              {lote.resumo.confirmado + lote.resumo.presente}
            </dd>
          </dl>
        </div>
      </div>

      <Tabela superficie="interna">
        <Cabecalho superficie="interna">
          <tr>
            <CelulaDeTitulo>Código</CelulaDeTitulo>
            <CelulaDeTitulo>Endereço do convite</CelulaDeTitulo>
            <CelulaDeTitulo>Estado</CelulaDeTitulo>
            <CelulaDeTitulo className="text-right">Copiar</CelulaDeTitulo>
          </tr>
        </Cabecalho>
        <tbody>
          {comUrl.map((c) => (
            <tr key={c.id}>
              <Celula className="font-mono font-bold text-texto-forte">{c.codigo}</Celula>
              <Celula className="font-mono text-corpo-sm break-all text-texto">{c.url}</Celula>
              <Celula>
                <Selo tom={TOM_DO_ESTADO[c.estado]}>{ROTULO_DO_ESTADO[c.estado]}</Selo>
                {c.titular ? (
                  <span className="mt-1 block font-corpo text-corpo-sm text-texto-suave">
                    {c.titular}
                  </span>
                ) : null}
              </Celula>
              <Celula className="text-right">
                {c.estado === 'disponivel' ? (
                  <BotaoCopiarConvite url={c.url} codigo={c.codigo} />
                ) : (
                  <span className="font-corpo text-corpo-sm text-texto-suave">
                    já utilizado
                  </span>
                )}
              </Celula>
            </tr>
          ))}
        </tbody>
      </Tabela>

      <p className="mt-4 mb-0 max-w-prosa font-corpo text-corpo-sm text-texto-suave">
        Não existe botão de WhatsApp nesta tela, e não é esquecimento: a mensagem do sistema é
        assinada pelo colaborador que envia, e o convite avulso não tem remetente. Copie o
        endereço e mande pelo canal que fizer sentido para cada convidado. O mesmo link não serve
        para duas pessoas: ele trava no primeiro CPF que confirmar.
      </p>
    </>
  );
}
