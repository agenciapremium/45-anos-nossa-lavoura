import { renderToBuffer } from '@react-pdf/renderer';

import { ACOES, registrarAuditoria } from '@/lib/palestras/auditoria';
import { DocumentoDeDistribuicao } from '@/lib/palestras/pdf/documento';
import {
  montarDadosDoPdfDeLoteAvulso,
  nomeDoArquivoDoLote,
} from '@/lib/palestras/pdf/montar';
import { autorizarRota } from '@/lib/palestras/sessao';

/**
 * PDF de um lote avulso (tarefa 5.2), montado no momento do pedido e nunca
 * armazenado, como o PDF por colaborador.
 *
 * A autorização é dupla, de propósito: `autorizarRota('gerarLotes')` cobre
 * a ação da matriz, e o papel `admin` é conferido de novo porque a geração
 * avulsa é exclusiva dele (decisão da cliente, 29/09/2026) enquanto
 * `gerarLotes` também alcança o gerente regional em parte do escopo. Sem a
 * segunda checagem, um gerente que soubesse o id do lote baixaria os links.
 * `loteAvulsoNoEscopo`, dentro do montador, recusa de novo — três camadas,
 * nenhuma delas dependendo da tela.
 *
 * `runtime = 'nodejs'` é obrigatório: `@react-pdf/renderer` usa APIs de Node
 * (fontes e imagens do disco) que não existem no Edge Runtime.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  _pedido: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const acesso = await autorizarRota('gerarLotes');
  if (!acesso.ok) return acesso.resposta;
  if (acesso.atual.papel !== 'admin') {
    return new Response('Forbidden', {
      status: 403,
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
    });
  }

  const dados = await montarDadosDoPdfDeLoteAvulso(acesso.atual.escopo, id);

  // Sem convite disponível não há folha de distribuição: melhor dizer isso
  // que entregar um PDF em branco.
  if (!dados) {
    return Response.json(
      {
        erro:
          'Este lote não tem convites disponíveis para distribuir. ' +
          'Ou todos já foram usados, ou o prazo da palestra venceu.',
      },
      { status: 409, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  const buffer = await renderToBuffer(<DocumentoDeDistribuicao dados={dados} />);

  const bloco = dados.blocos[0];
  await registrarAuditoria({
    ator: acesso.ator,
    acao: ACOES.pdfGerado,
    entidade: 'palestra_lote',
    entidadeId: id,
    dados: {
      avulso: true,
      rotulo: dados.colaborador,
      palestra: bloco?.cidade ?? null,
      convites: bloco?.convites.length ?? 0,
    },
  });

  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${nomeDoArquivoDoLote(dados.colaborador, bloco?.cidade ?? '')}"`,
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  });
}
