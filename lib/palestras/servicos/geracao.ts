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
import { esquemaDeQuantidade, esquemaDeRotulo } from '@/lib/palestras/validacao';
import { formatarCarimbo, venceu } from '@/lib/tempo';

/* =========================================================
   Serviço de geração de lotes

   Separado da Server Action para poder ser exercitado contra um Postgres
   real — inclusive o teste de lote grande que a tarefa 9.7 pede — sem
   simular um pedido HTTP.

   `gerarLotesDeConvites` (por colaborador, é o que a rede de lojas usa) e
   `gerarLoteAvulso` (D5 do design de `convites-avulsos`) compartilham três
   partes, extraídas abaixo: a checagem de prazo da palestra
   (`checarPalestraParaGeracao`), a inserção em blocos com retentativa de
   código (`inserirConvitesEmBlocos`) e o próprio desenho de transação
   única. O que NÃO é comum fica em cada função: o avulso não tem
   colaborador para validar contra `user`, nem lista de erros por pessoa.
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

type Palestra = NonNullable<Awaited<ReturnType<typeof buscarPalestra>>>;

/**
 * A palestra existe e o prazo de confirmação ainda não venceu?
 *
 * As mesmas duas checagens e as mesmas mensagens dos dois caminhos de
 * geração (D5 do design): convite gerado depois do prazo nasceria
 * expirado, e a recusa precisa ser idêntica nos dois, ou a operação por
 * colaborador e a avulsa passariam a divergir por acidente de digitação
 * numa mensagem, não por decisão.
 */
async function checarPalestraParaGeracao(
  eventoId: string,
): Promise<{ ok: true; palestra: Palestra } | { ok: false; mensagem: string }> {
  if (!eventoId) return { ok: false, mensagem: 'Escolha a palestra.' };

  const palestra = await buscarPalestra(eventoId);
  if (!palestra) return { ok: false, mensagem: 'Palestra não encontrada.' };

  if (venceu(palestra.prazoConfirmacao)) {
    return {
      ok: false,
      mensagem:
        `O prazo de confirmação desta palestra venceu em ${formatarCarimbo(palestra.prazoConfirmacao)}. ` +
        'Não é possível gerar novos convites. Ajuste o prazo se a operação foi estendida.',
    };
  }

  return { ok: true, palestra };
}

/** O tipo da transação aberta por `dbTx().transaction(...)`, sem repetir o tipo do driver aqui. */
type Transacao = Parameters<Parameters<ReturnType<typeof dbTx>['transaction']>[0]>[0];

/**
 * Insere `quantidade` convites de um lote em blocos de `TAMANHO_DO_BLOCO`,
 * cada bloco com o código sorteado de novo até não colidir (D5 do design,
 * a mesma geração de código com retentativa dos dois caminhos).
 *
 * `colaboradorId` nulo é o convite avulso: a única diferença entre os dois
 * caminhos dentro desta função é esse valor, que aqui só é passado
 * adiante para o `insert`.
 */
async function inserirConvitesEmBlocos(
  tx: Transacao,
  opcoes: {
    eventoId: string;
    colaboradorId: string | null;
    loteId: string;
    quantidade: number;
  },
): Promise<void> {
  let restantes = opcoes.quantidade;
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
            eventoId: opcoes.eventoId,
            colaboradorId: opcoes.colaboradorId,
            loteId: opcoes.loteId,
            estado: 'disponivel' as const,
          })),
        );
        break;
      } catch (erro) {
        // A restrição única do banco é a autoridade sobre colisão: o
        // bloco é re-sorteado inteiro e tentado de novo.
        if (++tentativa >= MAX_TENTATIVAS_DE_CODIGO) throw erro;
      }
    }
    restantes -= bloco;
  }
}

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

  const verificacao = await checarPalestraParaGeracao(eventoId);
  if (!verificacao.ok) return verificacao;
  const { palestra } = verificacao;

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

      await inserirConvitesEmBlocos(tx, {
        eventoId,
        colaboradorId: pedido.colaboradorId,
        loteId: registro!.id,
        quantidade: pedido.quantidade,
      });
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

/* =========================================================
   Geração avulsa (D5 do design de `convites-avulsos`)
   ========================================================= */

export type ResultadoDaGeracaoAvulsa =
  | {
      ok: false;
      mensagem: string;
    }
  | {
      ok: true;
      mensagem: string;
      resumo: {
        palestra: string;
        convites: number;
        rotulo: string | null;
        loteId: string;
        duracaoMs: number;
      };
    };

/**
 * Gera um lote de convites sem colaborador: imprensa, patrocinador,
 * autoridade, convidado do Grupo (D1 do design de `convites-avulsos`).
 *
 * Reaproveita de `gerarLotesDeConvites` a checagem de prazo
 * (`checarPalestraParaGeracao`), a geração de código com retentativa e a
 * inserção em blocos (`inserirConvitesEmBlocos`), e a mesma transação
 * única. O que não existe aqui, por não haver colaborador: a lista de
 * pedidos por pessoa, a validação contra `user` e o `errosPorColaborador`.
 *
 * A quantidade usa `esquemaDeQuantidade`, o mesmo teto por operação da
 * geração por colaborador (D5): não é um limite novo, é o mesmo limite.
 *
 * **Autorização**: esta função não confere o papel do ator, no mesmo
 * padrão de `gerarLotesDeConvites`: quem chama (a Server Action, D5 e
 * tarefa 4.3) já exige `admin` antes de chegar aqui. Continua sendo
 * exclusivamente do Admin; a recusa só está em outra camada.
 */
export async function gerarLoteAvulso(opcoes: {
  eventoId: string;
  quantidade: number;
  rotulo?: string | null;
  ator: Ator;
}): Promise<ResultadoDaGeracaoAvulsa> {
  const inicio = Date.now();
  const { eventoId, ator } = opcoes;

  const verificacao = await checarPalestraParaGeracao(eventoId);
  if (!verificacao.ok) return verificacao;
  const { palestra } = verificacao;

  const analiseQuantidade = esquemaDeQuantidade.safeParse(opcoes.quantidade);
  if (!analiseQuantidade.success) {
    return {
      ok: false,
      mensagem: analiseQuantidade.error.issues[0]?.message ?? 'Quantidade inválida.',
    };
  }
  const quantidade = analiseQuantidade.data;

  const analiseRotulo = esquemaDeRotulo.safeParse(opcoes.rotulo ?? '');
  if (!analiseRotulo.success) {
    return {
      ok: false,
      mensagem: analiseRotulo.error.issues[0]?.message ?? 'Rótulo inválido.',
    };
  }
  const rotulo = analiseRotulo.data;

  let loteId = '';

  await dbTx().transaction(async (tx) => {
    const [registro] = await tx
      .insert(lote)
      .values({
        eventoId,
        colaboradorId: null,
        quantidade,
        rotulo,
        criadoPor: typeof ator?.id === 'string' ? ator.id : null,
      })
      .returning({ id: lote.id });

    loteId = registro!.id;

    await inserirConvitesEmBlocos(tx, {
      eventoId,
      colaboradorId: null,
      loteId,
      quantidade,
    });
  });

  const duracaoMs = Date.now() - inicio;

  await registrarAuditoria({
    ator,
    acao: ACOES.loteAvulsoGerado,
    entidade: 'palestra_evento',
    entidadeId: eventoId,
    dados: {
      palestra: palestra.cidade,
      quantidade,
      rotulo,
      loteId,
      duracaoMs,
    },
  });

  return {
    ok: true,
    mensagem: `${quantidade} convite(s) avulso(s) gerado(s).`,
    resumo: {
      palestra: palestra.cidade,
      convites: quantidade,
      rotulo,
      loteId,
      duracaoMs,
    },
  };
}
