import { timingSafeEqual } from 'node:crypto';
import type { NextRequest } from 'next/server';

import { env } from '@/lib/env';
import { expirarConvitesVencidos } from '@/lib/palestras/expiracao';
import { limparLimitesAntigos } from '@/lib/palestras/limite';

/**
 * Rotina diária de expiração (D3 do design).
 *
 * Agendada em `vercel.json` para 04h05 UTC — 00h05 em Porto Velho, logo
 * depois da virada, para que um prazo das 23h59 seja consolidado ainda de
 * madrugada, antes de qualquer expediente.
 *
 * A correção NÃO depende desta rota: a expiração também é avaliada na
 * leitura. Se o cron falhar, ninguém confirma fora do prazo — só o estado
 * gravado fica atrasado.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function autorizado(pedido: NextRequest): boolean {
  const esperado = env().CRON_SECRET;

  // O Vercel Cron envia `Authorization: Bearer $CRON_SECRET`. O header
  // próprio existe para acionar a rotina à mão, pelo Admin.
  const cabecalho = pedido.headers.get('authorization') ?? '';
  const candidatos = [
    cabecalho.startsWith('Bearer ') ? cabecalho.slice(7) : null,
    pedido.headers.get('x-cron-secret'),
  ].filter((v): v is string => Boolean(v));

  for (const candidato of candidatos) {
    const a = Buffer.from(candidato, 'utf8');
    const b = Buffer.from(esperado, 'utf8');
    if (a.length === b.length && timingSafeEqual(a, b)) return true;
  }
  return false;
}

async function executar(pedido: NextRequest) {
  if (!autorizado(pedido)) {
    // 401, e não 404: aqui o segredo É o controle de acesso, e quem chama é
    // uma máquina que precisa distinguir "não autorizado" de "rota errada".
    return Response.json(
      { erro: 'CRON_SECRET ausente ou incorreto. Nada foi alterado.' },
      { status: 401, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  const resultado = await expirarConvitesVencidos();

  /*
     Varredura da tabela de limite, na carona da rotina diária (D7 do
     design, que escolheu a tabela no Neon em vez do Upstash justamente
     para não acrescentar serviço). A maior janela do sistema tem 15
     minutos; linhas de ontem não mudam decisão nenhuma.

     Uma falha aqui NÃO derruba a resposta: a expiração dos convites já
     aconteceu, e é ela que a rotina existe para fazer.
  */
  let limitesRemovidos: number | null = null;
  try {
    limitesRemovidos = await limparLimitesAntigos();
  } catch (erro) {
    console.error('[cron] falha ao limpar a tabela de limite', erro);
  }

  return Response.json(
    { ...resultado, limitesRemovidos },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}

export async function GET(pedido: NextRequest) {
  return executar(pedido);
}

export async function POST(pedido: NextRequest) {
  return executar(pedido);
}
