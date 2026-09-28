import 'server-only';

import { inArray } from 'drizzle-orm';

import { db, dbTx } from '@/lib/db';
import { convite, lote, user } from '@/lib/db/schema';
import {
  ACOES,
  registrarAuditoria,
  type Ator,
} from '@/lib/palestras/auditoria';
import { gerarCodigo, MAX_TENTATIVAS_DE_CODIGO } from '@/lib/palestras/codigo';
import { buscarPalestra } from '@/lib/palestras/consultas';
import { esquemaDeQuantidade } from '@/lib/palestras/validacao';
import { formatarCarimbo, venceu } from '@/lib/tempo';

/* =========================================================
   Serviço de geração de lotes

   Separado da Server Action para poder ser exercitado contra um Postgres
   real — inclusive o teste de lote grande que a tarefa 9.7 pede — sem
   simular um pedido HTTP.
   ========================================================= */

/** Quantos convites por `insert`. Uma viagem por convite seria lentíssimo. */
const TAMANHO_DO_BLOCO = 200;

export type PedidoDeGeracao = { colaboradorId: string; quantidade: number };

export type ResultadoDaGeracao =
  | {
      ok: false;
      mensagem: string;
      errosPorColaborador?: Record<string, string>;
    }
  | {
      ok: true;
      mensagem: string;
      resumo: {
        palestra: string;
        colaboradores: number;
        convites: number;
        duracaoMs: number;
      };
    };

/**
 * Gera convites para vários colaboradores da mesma palestra, com quantidades
 * diferentes, numa transação só.
 *
 * Quantidade inválida em QUALQUER colaborador recusa a operação inteira: uma
 * geração parcial deixaria o Admin sem saber quem recebeu e quem não, e a
 * correção seria gerar de novo — dobrando os convites de quem já tinha.
 */
export async function gerarLotesDeConvites(opcoes: {
  eventoId: string;
  pedidos: PedidoDeGeracao[];
  ator: Ator;
}): Promise<ResultadoDaGeracao> {
  const inicio = Date.now();
  const { eventoId, pedidos, ator } = opcoes;

  if (!eventoId) return { ok: false, mensagem: 'Escolha a palestra.' };

  const palestra = await buscarPalestra(eventoId);
  if (!palestra) return { ok: false, mensagem: 'Palestra não encontrada.' };

  // Convite gerado depois do prazo nasceria expirado.
  if (venceu(palestra.prazoConfirmacao)) {
    return {
      ok: false,
      mensagem:
        `O prazo de confirmação desta palestra venceu em ${formatarCarimbo(palestra.prazoConfirmacao)}. ` +
        'Não é possível gerar novos convites. Ajuste o prazo se a operação foi estendida.',
    };
  }

  const errosPorColaborador: Record<string, string> = {};
  const validos: PedidoDeGeracao[] = [];

  for (const pedido of pedidos) {
    const analise = esquemaDeQuantidade.safeParse(pedido.quantidade);
    if (!analise.success) {
      errosPorColaborador[pedido.colaboradorId] =
        analise.error.issues[0]?.message ?? 'Quantidade inválida.';
      continue;
    }
    validos.push({ ...pedido, quantidade: analise.data });
  }

  if (Object.keys(errosPorColaborador).length > 0) {
    return {
      ok: false,
      errosPorColaborador,
      mensagem:
        'Nenhum convite foi gerado: corrija as quantidades marcadas e tente de novo.',
    };
  }

  if (validos.length === 0) {
    return {
      ok: false,
      mensagem: 'Informe a quantidade de convites de ao menos um colaborador.',
    };
  }

  /* --- os colaboradores precisam existir e estar ativos --- */
  const colaboradores = await db()
    .select({ id: user.id, nome: user.name, ativo: user.ativo })
    .from(user)
    .where(
      inArray(
        user.id,
        validos.map((p) => p.colaboradorId),
      ),
    );

  const porId = new Map(colaboradores.map((c) => [c.id, c]));
  for (const p of validos) {
    const c = porId.get(p.colaboradorId);
    if (!c) errosPorColaborador[p.colaboradorId] = 'Colaborador não encontrado.';
    else if (!c.ativo) {
      errosPorColaborador[p.colaboradorId] = 'Colaborador desativado.';
    }
  }
  if (Object.keys(errosPorColaborador).length > 0) {
    return {
      ok: false,
      errosPorColaborador,
      mensagem: 'Nenhum convite foi gerado.',
    };
  }

  const totalDeConvites = validos.reduce((s, p) => s + p.quantidade, 0);

  await dbTx().transaction(async (tx) => {
    for (const pedido of validos) {
      const [registro] = await tx
        .insert(lote)
        .values({
          eventoId,
          colaboradorId: pedido.colaboradorId,
          quantidade: pedido.quantidade,
          // `criadoPor` fica nulo enquanto o guard é provisório; a auditoria
          // registra o ator. `auth-e-papeis` passa a preencher.
          criadoPor: typeof ator?.id === 'string' ? ator.id : null,
        })
        .returning({ id: lote.id });

      let restantes = pedido.quantidade;
      while (restantes > 0) {
        const bloco = Math.min(restantes, TAMANHO_DO_BLOCO);
        let tentativa = 0;
        for (;;) {
          const codigos = new Set<string>();
          while (codigos.size < bloco) codigos.add(gerarCodigo());
          try {
            await tx.insert(convite).values(
              [...codigos].map((codigo) => ({
                codigo,
                eventoId,
                colaboradorId: pedido.colaboradorId,
                loteId: registro!.id,
                estado: 'disponivel' as const,
              })),
            );
            break;
          } catch (erro) {
            // A restrição única do banco é a autoridade sobre colisão:
            // o bloco é re-sorteado inteiro e tentado de novo.
            if (++tentativa >= MAX_TENTATIVAS_DE_CODIGO) throw erro;
          }
        }
        restantes -= bloco;
      }
    }
  });

  const duracaoMs = Date.now() - inicio;

  await registrarAuditoria({
    ator,
    acao: ACOES.loteGerado,
    entidade: 'palestra_evento',
    entidadeId: eventoId,
    dados: {
      palestra: palestra.cidade,
      colaboradores: validos.length,
      convites: totalDeConvites,
      duracaoMs,
      porColaborador: validos.map((p) => ({
        colaborador: porId.get(p.colaboradorId)?.nome ?? p.colaboradorId,
        quantidade: p.quantidade,
      })),
    },
  });

  return {
    ok: true,
    mensagem: `${totalDeConvites} convite(s) gerado(s) para ${validos.length} colaborador(es).`,
    resumo: {
      palestra: palestra.cidade,
      colaboradores: validos.length,
      convites: totalDeConvites,
      duracaoMs,
    },
  };
}
