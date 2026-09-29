import 'server-only';

import { eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import {
  checkin as tabelaCheckin,
  confirmacao as tabelaConfirmacao,
  convite as tabelaConvite,
  evento as tabelaEvento,
  loja as tabelaLoja,
  lote as tabelaLote,
  user as tabelaUser,
  type MetodoDeCheckin,
} from '@/lib/db/schema';
import { ACOES, type Ator } from '@/lib/palestras/auditoria';
import { transicionarConvite } from '@/lib/palestras/estado-do-convite';
import { ORIGEM_AVULSA, origemDoConvite } from '@/lib/palestras/origem';
import { agora, formatarData, formatarHorario, mesmoDiaCivil } from '@/lib/tempo';

/* =========================================================
   Check-in · resolução do QR e da busca manual (D2, D3 do design)

   Nenhuma decisão de validade acontece no cliente (D2): a câmera só lê o
   `ingresso_token` e manda para cá. O servidor resolve tudo — quem é,
   se a palestra bate, se é o dia certo — e devolve um dos três resultados.

   Toda transição de estado passa por `transicionarConvite()` (de
   `fundacao`), a mesma trava de linha (`SELECT … FOR UPDATE`) usada por
   `confirmacao-convidado` e `painel-colaborador`: nenhuma trava nova é
   reimplementada aqui (D3 do design).

   As checagens extras do check-in — palestra correta e dia da palestra —
   acontecem dentro de `aoAplicar`, ou seja, com a linha do convite já
   travada e já atualizada (sem commit) dentro da transação. Se qualquer
   uma falhar, o `throw` de `RecusaDeCheckin` desfaz a transação inteira:
   nem o estado muda, nem a linha de `palestra_checkin` é gravada. É o
   mesmo padrão que `confirmarPresenca` usa para tratar violação de
   restrição única como caminho esperado — aqui a "restrição" é de regra de
   negócio, não do banco, mas o efeito (desfazer tudo) é o mesmo.
   ========================================================= */

export type ResultadoDoCheckin =
  | {
      ok: true;
      cor: 'verde';
      titular: string;
      acompanhante: string | null;
      lojaNome: string | null;
      colaboradorNome: string;
      /** Rótulo do lote, só no convite avulso ("Imprensa"). */
      rotuloDoLote: string | null;
      feitoEm: Date;
    }
  | {
      ok: false;
      cor: 'amarelo';
      primeiroCheckinEm: Date;
      mensagem: string;
    }
  | {
      ok: false;
      cor: 'vermelho';
      motivo:
        | 'cancelado'
        | 'expirado'
        | 'outra-palestra'
        | 'token-desconhecido'
        | 'fora-do-dia'
        | 'invalido';
      mensagem: string;
    };

export const MENSAGENS_DE_CHECKIN = {
  tokenDesconhecido:
    'Este código não é reconhecido. Confira o QR ou use a busca manual.',
  cancelado: 'Este convite foi cancelado e não dá entrada na palestra.',
  expirado: 'Este convite expirou e não dá entrada na palestra.',
  // Deliberadamente sem nomear a outra palestra — mesma regra de não
  // vazamento do resto do sistema (spec: "sem revelar qual").
  outraPalestra: 'Este convite é de outra palestra do circuito.',
  invalido: 'Este convite não está confirmado para esta palestra.',
} as const;

function mensagemForaDoDia(dataDaPalestra: Date): string {
  return `Este convite só é aceito no dia da palestra: ${formatarData(dataDaPalestra)}.`;
}

function mensagemAmarela(primeiroCheckinEm: Date): string {
  return (
    `Este convite já foi utilizado: check-in em ${formatarData(primeiroCheckinEm)} ` +
    `às ${formatarHorario(primeiroCheckinEm)}.`
  );
}

/**
 * Interrompe a transação quando a checagem de negócio (palestra, dia)
 * falha. Lançada dentro de `aoAplicar`, com a linha já travada — o
 * `throw` propaga para fora de `transicionarConvite()` e desfaz o UPDATE e
 * o INSERT que já tinham rodado, sem commit.
 */
class RecusaDeCheckin extends Error {
  constructor(
    public readonly motivo: 'outra-palestra' | 'fora-do-dia' | 'invalido',
    public readonly dataDaPalestra?: Date,
  ) {
    super(`check-in recusado: ${motivo}`);
    this.name = 'RecusaDeCheckin';
  }
}

type DadosDoCheckinAceito = {
  titular: string;
  acompanhante: string | null;
  lojaNome: string | null;
  colaboradorNome: string;
  rotuloDoLote: string | null;
  feitoEm: Date;
};

async function executarCheckin(pedido: {
  conviteId: string;
  eventoIdEsperado: string;
  metodo: MetodoDeCheckin;
  ator: Ator;
}): Promise<ResultadoDoCheckin> {
  let resultado: Awaited<
    ReturnType<typeof transicionarConvite<DadosDoCheckinAceito>>
  >;

  try {
    resultado = await transicionarConvite<DadosDoCheckinAceito>({
      alvo: { id: pedido.conviteId },
      para: 'presente',
      // Só um convite `confirmado` pode virar `presente`. Qualquer outro
      // estado atual (presente, cancelado, expirado, disponivel) cai em
      // `estado-inesperado` — `interpretarRecusa` decide, depois, se isso
      // é amarelo ou vermelho.
      exigirEstadoAtual: ['confirmado'],
      aoAplicar: async (tx, conviteAtualizado) => {
        // 1. A palestra correta — task 4.3 e spec "resultado inválido por
        //    palestra". Comparação simples: o `evento_id` do convite nunca
        //    muda, então não precisa de leitura travada extra.
        if (conviteAtualizado.eventoId !== pedido.eventoIdEsperado) {
          throw new RecusaDeCheckin('outra-palestra');
        }

        // 2. O dia da palestra (D4 do design), lido dentro da MESMA
        //    transação — literal ao que a task 4.3 pede, ainda que o
        //    horário da palestra não sofra a mesma disputa de concorrência
        //    que o estado do convite.
        const [ev] = await tx
          .select({ dataHora: tabelaEvento.dataHora })
          .from(tabelaEvento)
          .where(eq(tabelaEvento.id, conviteAtualizado.eventoId))
          .limit(1);

        const dataDaPalestra = ev ? new Date(ev.dataHora) : null;
        if (!dataDaPalestra || !mesmoDiaCivil(agora(), dataDaPalestra)) {
          throw new RecusaDeCheckin('fora-do-dia', dataDaPalestra ?? undefined);
        }

        // 3. O registro do check-in. A restrição única em
        //    `palestra_checkin (convite_id)` é a última palavra: mesmo que
        //    a trava de linha falhasse por algum motivo, um segundo
        //    `insert` para o mesmo convite violaria essa restrição.
        const [linhaCheckin] = await tx
          .insert(tabelaCheckin)
          .values({
            conviteId: conviteAtualizado.id,
            feitoPor: pedido.ator?.id ?? null,
            metodo: pedido.metodo,
          })
          .returning({ feitoEm: tabelaCheckin.feitoEm });

        // 4. Os dados do resultado verde: titular, acompanhante, loja e
        //    colaborador de origem (spec "resultado válido").
        //
        //    `leftJoin` em `user`, e não `innerJoin` (D3 e requisito
        //    "Check-in de convidado avulso" de `convites-avulsos`): o
        //    convite avulso não tem colaborador, e com join interno esta
        //    consulta não devolvia linha nenhuma. O `if` abaixo então
        //    lançava `RecusaDeCheckin('invalido')`, a transação inteira era
        //    desfeita e a portaria via TELA VERMELHA para um convidado com
        //    ingresso válido — pior que campo em branco. A origem passa a
        //    ser "Administração" quando não há colaborador.
        const [dadosDoTitular] = await tx
          .select({
            titular: tabelaConfirmacao.nome,
            acompanhante: tabelaConfirmacao.acompanhanteNome,
            lojaNome: tabelaLoja.nome,
            colaboradorNome: tabelaUser.name,
            rotuloDoLote: tabelaLote.rotulo,
          })
          .from(tabelaConfirmacao)
          .innerJoin(tabelaConvite, eq(tabelaConvite.id, tabelaConfirmacao.conviteId))
          .leftJoin(tabelaUser, eq(tabelaUser.id, tabelaConvite.colaboradorId))
          .leftJoin(tabelaLoja, eq(tabelaLoja.id, tabelaUser.lojaId))
          .leftJoin(tabelaLote, eq(tabelaLote.id, tabelaConvite.loteId))
          .where(eq(tabelaConfirmacao.conviteId, conviteAtualizado.id))
          .limit(1);

        if (!dadosDoTitular) {
          // Não deveria acontecer: um convite alcançado por token ou por
          // busca manual sempre tem confirmação (é de lá que vem o
          // token/o resultado da busca). Defesa, não caminho esperado.
          throw new RecusaDeCheckin('invalido');
        }

        const origem = origemDoConvite({
          colaboradorNome: dadosDoTitular.colaboradorNome,
          lojaNome: dadosDoTitular.lojaNome,
          loteRotulo: dadosDoTitular.rotuloDoLote,
        });

        return {
          titular: dadosDoTitular.titular,
          acompanhante: dadosDoTitular.acompanhante,
          // No convite avulso, as duas colunas dizem "Administração" e o
          // rótulo do lote entra como detalhe: a portaria vê de onde o
          // convite veio de verdade, nunca um campo vazio (D7).
          lojaNome: origem.avulso ? ORIGEM_AVULSA : dadosDoTitular.lojaNome,
          colaboradorNome: origem.titulo,
          rotuloDoLote: origem.avulso ? origem.detalhe : null,
          feitoEm: new Date(linhaCheckin!.feitoEm),
        };
      },
      auditoria: {
        acao: ACOES.checkinRegistrado,
        ator: pedido.ator,
        dados: {
          conviteId: pedido.conviteId,
          eventoId: pedido.eventoIdEsperado,
          metodo: pedido.metodo,
        },
      },
    });
  } catch (erro) {
    if (erro instanceof RecusaDeCheckin) {
      if (erro.motivo === 'outra-palestra') {
        return {
          ok: false,
          cor: 'vermelho',
          motivo: 'outra-palestra',
          mensagem: MENSAGENS_DE_CHECKIN.outraPalestra,
        };
      }
      if (erro.motivo === 'fora-do-dia') {
        return {
          ok: false,
          cor: 'vermelho',
          motivo: 'fora-do-dia',
          mensagem: erro.dataDaPalestra
            ? mensagemForaDoDia(erro.dataDaPalestra)
            : MENSAGENS_DE_CHECKIN.invalido,
        };
      }
      return {
        ok: false,
        cor: 'vermelho',
        motivo: 'invalido',
        mensagem: MENSAGENS_DE_CHECKIN.invalido,
      };
    }
    throw erro;
  }

  if (resultado.ok) {
    return { ok: true, cor: 'verde', ...resultado.resultado };
  }

  return interpretarRecusa(pedido.conviteId);
}

/**
 * O convite não estava `confirmado` quando a transação rodou. Relê o
 * estado gravado para escolher entre amarelo (já utilizado, com o
 * horário do primeiro check-in) e vermelho (cancelado/expirado/inválido).
 */
async function interpretarRecusa(conviteId: string): Promise<ResultadoDoCheckin> {
  const [linha] = await db()
    .select({ estado: tabelaConvite.estado })
    .from(tabelaConvite)
    .where(eq(tabelaConvite.id, conviteId))
    .limit(1);

  const estado = linha?.estado;

  if (estado === 'presente') {
    const [c] = await db()
      .select({ feitoEm: tabelaCheckin.feitoEm })
      .from(tabelaCheckin)
      .where(eq(tabelaCheckin.conviteId, conviteId))
      .limit(1);
    const primeiroCheckinEm = c ? new Date(c.feitoEm) : agora();
    return {
      ok: false,
      cor: 'amarelo',
      primeiroCheckinEm,
      mensagem: mensagemAmarela(primeiroCheckinEm),
    };
  }

  if (estado === 'cancelado') {
    return {
      ok: false,
      cor: 'vermelho',
      motivo: 'cancelado',
      mensagem: MENSAGENS_DE_CHECKIN.cancelado,
    };
  }
  if (estado === 'expirado') {
    return {
      ok: false,
      cor: 'vermelho',
      motivo: 'expirado',
      mensagem: MENSAGENS_DE_CHECKIN.expirado,
    };
  }

  // `disponivel`, ou convite não encontrado: não deveria acontecer por
  // este caminho (token e busca manual só alcançam convite já confirmado
  // ao menos uma vez), mas a tela precisa de uma resposta, não de um 500.
  return {
    ok: false,
    cor: 'vermelho',
    motivo: 'invalido',
    mensagem: MENSAGENS_DE_CHECKIN.invalido,
  };
}

/**
 * Check-in por QR: resolve o `ingresso_token` lido pela câmera.
 *
 * Token que não corresponde a nenhuma confirmação é resolvido **antes** da
 * transação — não há convite para travar. É o único resultado vermelho que
 * não passa por `executarCheckin`.
 */
export async function checkinPorToken(
  token: string,
  eventoIdEsperado: string,
  ator: Ator,
): Promise<ResultadoDoCheckin> {
  const [encontrado] = await db()
    .select({ conviteId: tabelaConfirmacao.conviteId })
    .from(tabelaConfirmacao)
    .where(eq(tabelaConfirmacao.ingressoToken, token))
    .limit(1);

  if (!encontrado) {
    return {
      ok: false,
      cor: 'vermelho',
      motivo: 'token-desconhecido',
      mensagem: MENSAGENS_DE_CHECKIN.tokenDesconhecido,
    };
  }

  return executarCheckin({
    conviteId: encontrado.conviteId,
    eventoIdEsperado,
    metodo: 'qr',
    ator,
  });
}

/**
 * Check-in pela busca manual (D1 do design): o convite já foi localizado
 * por CPF ou por nome, então não há token a resolver — só o registro, que
 * é **idêntico** ao do QR, exceto pelo método (spec "check-in manual
 * equivale ao do QR").
 */
export async function checkinManual(
  conviteId: string,
  eventoIdEsperado: string,
  ator: Ator,
): Promise<ResultadoDoCheckin> {
  return executarCheckin({
    conviteId,
    eventoIdEsperado,
    metodo: 'manual',
    ator,
  });
}
