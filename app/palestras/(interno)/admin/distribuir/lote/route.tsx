import { renderToBuffer } from '@react-pdf/renderer';
import archiver from 'archiver';
import { inArray } from 'drizzle-orm';
import { PassThrough, Readable } from 'node:stream';
import type { NextRequest } from 'next/server';

import { db } from '@/lib/db';
import { user } from '@/lib/db/schema';
import { ACOES, registrarAuditoria } from '@/lib/palestras/auditoria';
import { DocumentoDeDistribuicao } from '@/lib/palestras/pdf/documento';
import { montarDadosDoPdf, nomeDoArquivo } from '@/lib/palestras/pdf/montar';
import { LIMITE_POR_LOTE } from '@/lib/palestras/pdf/limites';
import { autorizarRota } from '@/lib/palestras/sessao';
import { paraCampoData } from '@/lib/tempo';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * `.zip` com um PDF por colaborador.
 *
 * Quem não tem convite disponível é **pulado** e aparece num `LEIA-ME.txt`
 * dentro do próprio `.zip`, com nome e motivo. O aviso vai no arquivo, e não
 * num header de resposta, porque os headers são enviados antes do primeiro
 * PDF ficar pronto — só depois de montar todos é que se sabe quem ficou de
 * fora. A tela também antecipa a contagem, para o Admin não ter surpresa.
 */
export async function GET(pedido: NextRequest) {
  /*
     O lote só existe para o Admin: por definição alcança colaboradores
     diferentes, e o único alcance que cobre "de qualquer um" na matriz do
     PRD é o dele.
  */
  const acesso = await autorizarRota('baixarPdfDeColaborador');
  if (!acesso.ok) return acesso.resposta;
  if (acesso.atual.papel !== 'admin') {
    return new Response('Forbidden', {
      status: 403,
      headers: { 'Cache-Control': 'no-store' },
    });
  }
  const { ator } = acesso;

  const parametros = pedido.nextUrl.searchParams;
  const colaboradores = parametros.getAll('colaborador').filter(Boolean);
  const eventoIds = parametros.getAll('palestra').filter(Boolean);
  const rotulo = parametros.get('rotulo') ?? 'convites';

  if (colaboradores.length === 0) {
    return Response.json(
      { erro: 'Selecione ao menos um colaborador.' },
      { status: 400 },
    );
  }
  if (colaboradores.length > LIMITE_POR_LOTE) {
    return Response.json(
      {
        erro:
          `São ${colaboradores.length} colaboradores e o limite por operação é ${LIMITE_POR_LOTE}. ` +
          'Divida por loja e gere um lote de cada vez.',
      },
      { status: 413 },
    );
  }

  // Nomes antes de começar a transmitir: o LEIA-ME precisa dizer quem ficou
  // de fora, e um id cru não ajuda ninguém.
  const nomes = new Map(
    (
      await db()
        .select({ id: user.id, nome: user.name })
        .from(user)
        .where(inArray(user.id, colaboradores))
    ).map((u) => [u.id, u.nome]),
  );

  const arquivador = archiver('zip', { zlib: { level: 6 } });
  const saida = new PassThrough();
  arquivador.pipe(saida);

  const pulados: string[] = [];
  const incluidos: string[] = [];
  let convites = 0;

  // Montagem em streaming: cada PDF é escrito no zip assim que fica pronto,
  // em vez de acumular dezenas de buffers antes de responder.
  const montagem = (async () => {
    for (const id of colaboradores) {
      const dados = await montarDadosDoPdf(acesso.atual.escopo, id, eventoIds);
      if (!dados) {
        pulados.push(id);
        continue;
      }
      const buffer = await renderToBuffer(
        <DocumentoDeDistribuicao dados={dados} />,
      );
      arquivador.append(buffer, {
        name: nomeDoArquivo(dados.loja, dados.colaborador),
      });
      incluidos.push(dados.colaborador);
      convites += dados.blocos.reduce((s, b) => s + b.convites.length, 0);
    }

    if (pulados.length) {
      arquivador.append(
        [
          'Circuito de Palestras Acelera no Campo 3.0',
          `Lote gerado em ${new Date().toISOString()}`,
          '',
          `Colaboradores com PDF: ${incluidos.length}`,
          `Colaboradores pulados: ${pulados.length}`,
          '',
          'Os colaboradores abaixo foram pulados porque não tinham nenhum',
          'convite disponível no momento da geração — todos já usados,',
          'cancelados ou com o prazo vencido. Gere um novo lote para eles',
          'antes de distribuir.',
          '',
          ...pulados.map((id) => `- ${nomes.get(id) ?? id}`),
        ].join('\n'),
        { name: 'LEIA-ME.txt' },
      );
    }

    await arquivador.finalize();
  })();

  montagem.catch((erro) => {
    arquivador.abort();
    saida.destroy(erro as Error);
  });

  await registrarAuditoria({
    ator,
    acao: ACOES.pdfLoteGerado,
    entidade: 'palestra_evento',
    entidadeId: eventoIds[0] ?? null,
    dados: {
      solicitados: colaboradores.length,
      nomes: colaboradores.map((id) => nomes.get(id) ?? id),
      palestras: eventoIds.length,
      rotulo,
    },
  });

  const nome = `${rotulo}-${paraCampoData(new Date())}.zip`;

  return new Response(
    Readable.toWeb(saida) as unknown as ReadableStream<Uint8Array>,
    {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${nome}"`,
        'Cache-Control': 'no-store',
        'X-Robots-Tag': 'noindex, nofollow',
      },
    },
  );
}
