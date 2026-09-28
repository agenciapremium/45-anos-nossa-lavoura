import { renderToBuffer } from '@react-pdf/renderer';
import type { NextRequest } from 'next/server';

import { ACOES, registrarAuditoria } from '@/lib/palestras/auditoria';
import { escopoCompleto } from '@/lib/palestras/escopo';
import { DocumentoDeDistribuicao } from '@/lib/palestras/pdf/documento';
import { montarDadosDoPdf, nomeDoArquivo } from '@/lib/palestras/pdf/montar';
import { atorDe, sessaoAtual } from '@/lib/palestras/sessao';

/* =========================================================
   PDF do colaborador, pelo próprio painel (spec `pdf-proprio`)

   Mesmo gerador de `fundacao` (`montarDadosDoPdf`), com o mesmo documento
   (`DocumentoDeDistribuicao`) e a mesma mensagem de WhatsApp — é o que
   garante o "conteúdo idêntico ao do Admin" da spec: não há uma segunda
   implementação para divergir.

   D1 do design: quando é o colaborador, o alvo é sempre ele mesmo. Por
   isso esta rota nem lê um identificador de colaborador da requisição — ao
   contrário da rota do Admin (`/palestras/admin/distribuir/pdf`), que
   recebe `?colaborador=`, aqui não existe esse parâmetro. Um colaborador
   que tentasse informar o id de outra pessoa não tem como: o único alvo
   possível é a própria sessão. Gerentes nunca chegam a esta linha — a rota
   é fechada a qualquer papel que não seja `colaborador`.
   ========================================================= */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const RECUSA = () =>
  new Response('Forbidden', {
    status: 403,
    headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' },
  });

export async function GET(pedido: NextRequest) {
  // `forbidden()` (usado por `exigirEscopo`) é uma interrupção de
  // renderização de PÁGINA — não serve a uma rota que devolve PDF. Por
  // isso a checagem aqui é manual, no mesmo padrão de `autorizarRota`.
  const atual = await sessaoAtual();
  if (!atual || !escopoCompleto(atual.escopo)) return RECUSA();

  // Só o colaborador baixa o próprio PDF por aqui. O Admin já tem a rota
  // dedicada em `/palestras/admin/distribuir`, que mira em qualquer um;
  // gerentes não baixam PDF de convite algum (matriz do PRD).
  if (atual.papel !== 'colaborador') return RECUSA();

  const eventoIds = pedido.nextUrl.searchParams.getAll('palestra').filter(Boolean);

  const dados = await montarDadosDoPdf(atual.escopo, null, eventoIds);

  if (!dados) {
    return Response.json(
      {
        erro:
          'Você não tem convites disponíveis nas palestras escolhidas. ' +
          'Fale com a administração se esperava ter recebido um lote novo.',
      },
      { status: 409, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  const buffer = await renderToBuffer(<DocumentoDeDistribuicao dados={dados} />);

  await registrarAuditoria({
    ator: atorDe(atual),
    acao: ACOES.pdfGerado,
    entidade: 'user',
    entidadeId: atual.usuarioId,
    dados: {
      colaborador: dados.colaborador,
      palestras: dados.blocos.map((b) => b.cidade),
      convites: dados.blocos.reduce((s, b) => s + b.convites.length, 0),
      origem: 'painel',
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
