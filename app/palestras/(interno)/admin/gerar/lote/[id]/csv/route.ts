import { ACOES, registrarAuditoria } from '@/lib/palestras/auditoria';
import { montarCsv } from '@/lib/palestras/csv';
import { loteAvulsoNoEscopo } from '@/lib/palestras/dados';
import { env } from '@/lib/env';
import { urlDoConvite } from '@/lib/palestras/mensagem';
import { ORIGEM_AVULSA, ROTULO_AVULSO_PADRAO } from '@/lib/palestras/origem';
import { autorizarRota } from '@/lib/palestras/sessao';
import { formatarData } from '@/lib/tempo';

/**
 * CSV de um lote avulso (tarefa 5.3): uma linha por convite, com o código e
 * o endereço completo.
 *
 * É a exportação do LOTE, não da palestra: quem quer a planilha inteira do
 * evento continua usando `/palestras/relatorios/csv`, que já traz o avulso
 * junto com o resto, com "Administração" nas colunas de origem. Aqui o
 * recorte é o lote, que é a unidade que o Admin entrega a um destino.
 *
 * Nenhuma coluna de titular, CPF ou WhatsApp: este arquivo existe para
 * distribuir links, e a planilha que sai de uma tela de distribuição
 * circula por e-mail. Quem precisa do dado do convidado usa o CSV da
 * palestra, que respeita o mascaramento de CPF do papel.
 */
export const dynamic = 'force-dynamic';

const CABECALHOS = ['palestra', 'origem', 'rotulo', 'codigo_convite', 'estado', 'endereco'];

export async function GET(
  _pedido: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const acesso = await autorizarRota('gerarLotes');
  if (!acesso.ok) return acesso.resposta;
  // Mesma dupla checagem do PDF do lote: `gerarLotes` também alcança o
  // gerente regional, e a geração avulsa é só do Admin.
  if (acesso.atual.papel !== 'admin') {
    return new Response('Forbidden', {
      status: 403,
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
    });
  }

  const lote = await loteAvulsoNoEscopo(acesso.atual.escopo, id);
  if (!lote) {
    return Response.json({ erro: 'Lote avulso não encontrado.' }, { status: 404 });
  }

  const origem = env().APP_BASE_URL;
  const rotulo = lote.rotulo ?? ROTULO_AVULSO_PADRAO;
  const rotuloDaPalestra = `${lote.eventoCidade} - ${formatarData(lote.eventoDataHora)}`;

  const csv = montarCsv(
    CABECALHOS,
    lote.convites.map((c) => [
      rotuloDaPalestra,
      ORIGEM_AVULSA,
      rotulo,
      c.codigo,
      c.estado,
      urlDoConvite(origem, c.codigo),
    ]),
  );

  await registrarAuditoria({
    ator: acesso.ator,
    acao: ACOES.csvExportado,
    entidade: 'palestra_lote',
    entidadeId: id,
    dados: {
      avulso: true,
      rotulo,
      palestra: lote.eventoCidade,
      linhas: lote.convites.length,
    },
  });

  const nomeDoArquivo = `lote-${rotulo}-${lote.eventoCidade}.csv`
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9.\-]+/g, '-');

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${nomeDoArquivo}"`,
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  });
}
