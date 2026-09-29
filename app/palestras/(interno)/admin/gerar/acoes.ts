'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import {
  gerarLoteAvulso,
  gerarLotesDeConvites,
  type PedidoDeGeracao,
} from '@/lib/palestras/servicos/geracao';
import { atorAutorizado, atorDe, exigirPapel } from '@/lib/palestras/sessao';

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

/* =========================================================
   Geração avulsa (D5 e tarefa 4.3 de `convites-avulsos`)
   ========================================================= */

export type EstadoDaGeracaoAvulsa = {
  ok: boolean;
  mensagem?: string;
  /** Erros por campo do formulário avulso (`quantidade`, `rotulo`). */
  erros?: Record<string, string>;
};

/**
 * Gera um lote de convites sem colaborador e leva direto para a tela de
 * entrega dos links.
 *
 * **Só o Admin**, e a recusa é no servidor: `exigirPapel(['admin'])` roda
 * antes de qualquer leitura, independentemente de a tela ter oferecido o
 * caminho (requisito "Só o Admin gera", tarefa 4.4). Não basta a ação
 * `gerarLotes` da matriz, que o gerente regional também tem em parte do
 * escopo: a geração avulsa é um caminho novo, reservado a quem responde
 * pelo circuito inteiro (decisão da cliente, 29/09/2026).
 *
 * `redirect` em caso de sucesso, em vez de devolver o estado: o lote recém
 * gerado tem endereço próprio (`/palestras/admin/gerar/lote/<id>`), e é lá
 * que estão os links para copiar. Uma mensagem verde nesta tela deixaria
 * 20 convites gerados e nenhuma forma óbvia de alcançá-los.
 */
export async function gerarAvulso(
  _anterior: EstadoDaGeracaoAvulsa,
  dados: FormData,
): Promise<EstadoDaGeracaoAvulsa> {
  const atual = await exigirPapel(['admin']);

  const eventoId = String(dados.get('eventoId') ?? '');
  const quantidadeBruta = String(dados.get('quantidade') ?? '').trim();
  const rotulo = String(dados.get('rotulo') ?? '');

  if (!quantidadeBruta) {
    return { ok: false, erros: { quantidade: 'Informe quantos convites gerar.' } };
  }

  const resultado = await gerarLoteAvulso({
    eventoId,
    quantidade: Number(quantidadeBruta),
    rotulo,
    ator: atorDe(atual),
  });

  if (!resultado.ok) return { ok: false, mensagem: resultado.mensagem };

  revalidatePath('/palestras/admin/gerar');
  revalidatePath('/palestras/painel/convites');
  revalidatePath('/palestras/painel/metricas');

  redirect(`/palestras/admin/gerar/lote/${resultado.resumo.loteId}?novo=1`);
}
