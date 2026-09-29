import { ACOES, registrarAuditoria } from '@/lib/palestras/auditoria';
import { buscarPalestra } from '@/lib/palestras/consultas';
import { montarCsv, valorDeTextoForcado } from '@/lib/palestras/csv';
import { dadosParaExportacaoCsv } from '@/lib/palestras/dados';
import { autorizarRota } from '@/lib/palestras/sessao';
import { formatarCarimbo, formatarData } from '@/lib/tempo';

/**
 * `/palestras/relatorios/csv?palestra=<id>` — exportação CSV por palestra
 * (tasks do grupo 8).
 *
 * Compatível com Excel em pt-BR (D7 do design): UTF-8 com BOM, separador
 * `;`, CPF forçado como texto. O escopo e o mascaramento de CPF são
 * resolvidos inteiramente por `dadosParaExportacaoCsv` — esta rota só
 * formata o que a consulta já devolveu certo.
 */
export const dynamic = 'force-dynamic';

const CABECALHOS = [
  'palestra',
  'codigo_convite',
  'estado',
  'regional',
  'loja',
  'colaborador',
  'titular_nome',
  'titular_cpf',
  'titular_whatsapp',
  'cidade',
  'propriedade',
  'atividade',
  'acompanhante_nome',
  'confirmado_em',
  'checkin_em',
  'cancelado_em',
];

export async function GET(pedido: Request) {
  const url = new URL(pedido.url);
  const eventoId = url.searchParams.get('palestra');

  const acesso = await autorizarRota('exportarCsv');
  if (!acesso.ok) {
    /*
       Spec `exportacao-csv`: "a tentativa é registrada para apuração".
       Só há o que registrar quando existe sessão (a recusa foi por papel
       ou por escopo, não por ausência de login) — sem sessão, o
       middleware já barrou o prefixo `/palestras/relatorios` inteiro
       antes de esta rota ser alcançada, e não haveria autor para nomear.
    */
    if (acesso.atual) {
      await registrarAuditoria({
        ator: { id: acesso.atual.usuarioId, nome: acesso.atual.nome },
        acao: ACOES.csvExportacaoRecusada,
        entidade: 'palestra_evento',
        entidadeId: eventoId,
        dados: { papel: acesso.atual.papel },
      });
    }
    return acesso.resposta;
  }
  const { atual, ator } = acesso;

  if (!eventoId) {
    return Response.json(
      { erro: 'Informe a palestra (parâmetro "palestra").' },
      { status: 400 },
    );
  }

  const palestraInfo = await buscarPalestra(eventoId);
  if (!palestraInfo) {
    return Response.json({ erro: 'Palestra não encontrada.' }, { status: 404 });
  }

  const linhas = await dadosParaExportacaoCsv(atual.escopo, eventoId);
  const rotuloDaPalestra = `${palestraInfo.cidade} - ${formatarData(palestraInfo.dataHora)}`;

  const csv = montarCsv(
    CABECALHOS,
    linhas.map((l) => [
      rotuloDaPalestra,
      l.codigo,
      l.estado,
      l.regionalNome,
      l.lojaNome,
      l.colaboradorNome,
      l.titularNome,
      // CPF: sempre entre aspas e forçado como texto (D7), inclusive
      // quando mascarado — `***.456.789-**` não é numérico, mas manter o
      // mesmo tratamento em toda a coluna evita uma regra por linha.
      l.titularCpf ? valorDeTextoForcado(l.titularCpf) : null,
      l.titularWhatsapp,
      l.cidade,
      l.propriedade,
      l.atividade,
      l.acompanhanteNome,
      l.confirmadoEm ? formatarCarimbo(l.confirmadoEm) : null,
      l.checkinEm ? formatarCarimbo(l.checkinEm) : null,
      l.canceladoEm ? formatarCarimbo(l.canceladoEm) : null,
    ]),
  );

  await registrarAuditoria({
    ator,
    acao: ACOES.csvExportado,
    entidade: 'palestra_evento',
    entidadeId: eventoId,
    dados: { palestra: palestraInfo.cidade, linhas: linhas.length },
  });

  const nomeDoArquivo = `palestra-${palestraInfo.cidade}-${formatarData(palestraInfo.dataHora).replace(/\//g, '-')}.csv`
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
