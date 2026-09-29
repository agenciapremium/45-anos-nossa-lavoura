import { renderToBuffer } from '@react-pdf/renderer';
import type { NextRequest } from 'next/server';

import { ACOES, registrarAuditoria } from '@/lib/palestras/auditoria';
import { DocumentoDeDistribuicao } from '@/lib/palestras/pdf/documento';
import { montarDadosDoPdf, nomeDoArquivo } from '@/lib/palestras/pdf/montar';
import { autorizarRota } from '@/lib/palestras/sessao';

/**
 * PDF de distribuição de um colaborador, montado no momento do pedido e
 * nunca armazenado (D6 do design).
 *
 * `runtime = 'nodejs'` é obrigatório: `@react-pdf/renderer` usa APIs de
 * Node (fontes e imagens do disco) que não existem no Edge Runtime.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(pedido: NextRequest) {
  const parametros = pedido.nextUrl.searchParams;
  const colaboradorId = parametros.get('colaborador');
  const eventoIds = parametros.getAll('palestra').filter(Boolean);

  if (!colaboradorId) {
    return Response.json(
      { erro: 'Informe o colaborador.' },
      { status: 400 },
    );
  }

  /*
     A verificação é por RECURSO, não só por papel: o Admin baixa o PDF de
     qualquer colaborador; o colaborador, só o próprio (matriz do PRD). A
     conferência acontece aqui, e não na tela, porque o identificador vem
     na query — é o caso "identificador fora do escopo em requisição" da
     spec de controle de acesso.
  */
  const acesso = await autorizarRota('baixarPdfDeColaborador', {
    colaboradorId,
  });
  if (!acesso.ok) return acesso.resposta;
  const { ator } = acesso;

  const dados = await montarDadosDoPdf(acesso.atual.escopo, colaboradorId, eventoIds);

  // PDF vazio não é entregue: o Admin precisa saber que não há o que
  // distribuir, e não receber um arquivo em branco.
  if (!dados) {
    return Response.json(
      {
        erro:
          'Este colaborador não tem convites disponíveis nas palestras escolhidas. ' +
          'Gere um novo lote antes de distribuir.',
      },
      { status: 409, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  const buffer = await renderToBuffer(
    <DocumentoDeDistribuicao dados={dados} />,
  );

  await registrarAuditoria({
    ator,
    acao: ACOES.pdfGerado,
    entidade: 'user',
    entidadeId: colaboradorId,
    dados: {
      colaborador: dados.colaborador,
      palestras: dados.blocos.map((b) => b.cidade),
      convites: dados.blocos.reduce((s, b) => s + b.convites.length, 0),
    },
  });

  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${nomeDoArquivo(dados.loja, dados.colaborador)}"`,
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  });
}
