'use server';

import { revalidatePath } from 'next/cache';

import {
  gerarLotesDeConvites,
  type PedidoDeGeracao,
} from '@/lib/palestras/servicos/geracao';
import { atorAutorizado } from '@/lib/palestras/sessao';

export type EstadoDaGeracao = {
  ok: boolean;
  mensagem?: string;
  /** Erros por colaborador, para destacar a linha certa na tela. */
  errosPorColaborador?: Record<string, string>;
  resumo?: {
    palestra: string;
    colaboradores: number;
    convites: number;
    duracaoMs: number;
  };
};

export const ESTADO_INICIAL: EstadoDaGeracao = { ok: false };

/**
 * Traduz o formulário e chama o serviço.
 *
 * Os campos chegam como `quantidade:<idDoColaborador>`, um por linha da
 * tabela. Campo vazio ou zero significa "não selecionado" e simplesmente não
 * entra no pedido; qualquer outro valor inválido é erro e derruba a operação
 * inteira, para não haver geração pela metade.
 */
export async function gerarLotes(
  _anterior: EstadoDaGeracao,
  dados: FormData,
): Promise<EstadoDaGeracao> {
  const { ator } = await atorAutorizado('gerarLotes');

  const eventoId = String(dados.get('eventoId') ?? '');
  const pedidos: PedidoDeGeracao[] = [];

  for (const [chave, valor] of dados.entries()) {
    const m = /^quantidade:(.+)$/.exec(chave);
    if (!m) continue;
    const bruto = String(valor).trim();
    if (bruto === '' || bruto === '0') continue;

    const numero = Number(bruto);
    pedidos.push({
      colaboradorId: m[1] as string,
      quantidade: Number.isFinite(numero) ? numero : Number.NaN,
    });
  }

  const resultado = await gerarLotesDeConvites({
    eventoId,
    pedidos,
    ator,
  });

  if (!resultado.ok) {
    return {
      ok: false,
      mensagem: resultado.mensagem,
      errosPorColaborador: resultado.errosPorColaborador,
    };
  }

  revalidatePath('/palestras/admin/gerar');
  revalidatePath('/palestras/admin/palestras');
  revalidatePath('/palestras/admin/distribuir');

  return {
    ok: true,
    mensagem: resultado.mensagem,
    resumo: resultado.resumo,
  };
}
