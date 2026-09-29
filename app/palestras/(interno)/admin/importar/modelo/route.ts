import { modeloCsv } from '@/lib/palestras/importacao';
import { autorizarRota } from '@/lib/palestras/sessao';

/**
 * Download do modelo `colaboradores.csv`.
 *
 * O BOM no começo é o que faz o Excel do Windows abrir o arquivo em UTF-8.
 * Sem ele, "Espigão" chega como "EspigÃ£o" e a pessoa acha que o sistema
 * está errado.
 */
export async function GET() {
  const acesso = await autorizarRota('cadastrarEImportarEstrutura');
  if (!acesso.ok) return acesso.resposta;

  return new Response(`﻿${modeloCsv()}`, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="colaboradores.csv"',
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  });
}
